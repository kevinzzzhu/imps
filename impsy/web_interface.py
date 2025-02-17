from flask import Flask, request, send_file, send_from_directory, jsonify, Response, stream_with_context
from werkzeug.utils import secure_filename
import click
import psutil
import shutil
import platform
import os
import tomllib
import subprocess
from impsy.dataset import generate_dataset, generate_dataset_from_files
from pathlib import Path
from impsy.osc_server import IMPSYOSCServer
import asyncio
import numpy as np
import queue
import threading
import json
from impsy.train import train_mdrnn
import logging

app = Flask(__name__, static_folder='./frontend/build', static_url_path='')
app.secret_key = "impsywebui"

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = Path(os.path.dirname(CURRENT_DIR))
LOGS_DIR = PROJECT_ROOT / 'logs'
MODEL_DIR = PROJECT_ROOT / 'models'
DATASET_DIR = PROJECT_ROOT / 'datasets'
CONFIGS_DIR = PROJECT_ROOT / 'configs'
app.config['LOG_FOLDER'] = LOGS_DIR
CONFIG_FILE = 'config.toml'
DEFAULT_HOST = '0.0.0.0'
DEFAULT_PORT = 4000

ROUTE_NAMES = {
    'logs': 'Log Files',
    'edit_config': 'Edit Configuration',
    'models': 'Model Files',
    'datasets': 'Dataset Files',
}

# Add a global queue for training messages
training_queue = queue.Queue()

# Add a global variable to track the training process
training_process = None

def get_hardware_info():
    try:
        cpu_info = platform.machine()
        cpu_cores = psutil.cpu_count(logical=False)
        disk_usage = shutil.disk_usage('/')
        memory = psutil.virtual_memory()
        ram_total = memory.total / (1024 ** 3)
        ram_used = (memory.total - memory.available) / (1024 ** 3)
        disk = disk_usage.free / (1024 ** 3)
        disk_percent = 100 * disk_usage.used / disk_usage.total
        os_info = f"{platform.system()} {platform.release()}"
        return {
            "CPU": cpu_info,
            "CPU Cores": cpu_cores,
            "RAM": f"{ram_used:.2f}/{ram_total:.2f} GB ({memory.percent}% used)",
            "Disk Space Free": f"{disk:.2f} GB ({disk_percent:.2f}% used)",
            "OS": os_info
        }
    except Exception as e:
        return {"Error": str(e)}

def get_software_info():
    with open("pyproject.toml", "rb") as f:
        pyproject_data = tomllib.load(f)
    return {
        "Project": pyproject_data["tool"]["poetry"].get("name"),
        "Version": pyproject_data["tool"]["poetry"].get("version"),
        "Description": pyproject_data["tool"]["poetry"].get("description"),
        "Authors": pyproject_data["tool"]["poetry"].get("authors"),
        "Homepage": pyproject_data["tool"]["poetry"].get("homepage"),
        "Repository": pyproject_data["tool"]["poetry"].get("repository"),
    }

def allowed_model_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'keras', 'h5', 'tflite'} 

def allowed_log_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'log'} 

def allowed_dataset_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'npz'} 

def get_routes():
    page_routes = []
    for rule in app.url_map.iter_rules():
        if rule.endpoint != 'static' and 'GET' in rule.methods and '<' not in str(rule):
            page_routes.append({
                'endpoint': rule.endpoint,
                'route': str(rule)
            })
    return page_routes

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def catch_all(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/hardware-info')
def api_hardware_info():
    return jsonify(get_hardware_info())

@app.route('/api/software-info')
def api_software_info():
    return jsonify(get_software_info())

@app.route('/api/routes')
def api_routes():
    return jsonify([{
        'endpoint': route.endpoint,
        'route': route.rule,
        'name': ROUTE_NAMES.get(route.endpoint, route.endpoint)
    } for route in app.url_map.iter_rules()])


@app.route('/api/logs', methods=['GET', 'POST'])
def logs():
    log_files = [f for f in os.listdir(LOGS_DIR) if f.endswith('.log')]
    
    # Sort log files by date (newest first)
    log_files.sort(key=lambda x: x.split('T')[0], reverse=True)
    
    return jsonify(log_files)

@app.route('/api/logs/<filename>')
def get_log_content(filename):
    try:
        # Ensure the filename is safe
        safe_filename = secure_filename(filename)
        log_path = os.path.join(LOGS_DIR, safe_filename)
        
        # Check if file exists
        if not os.path.exists(log_path):
            return jsonify({'error': 'File not found'}), 404
            
        # Check if path is within LOGS_DIR
        if not os.path.commonpath([os.path.abspath(log_path), str(LOGS_DIR)]) == str(LOGS_DIR):
            return jsonify({'error': 'Invalid file path'}), 403
            
        with open(log_path, 'r') as file:
            content = file.read()
        return jsonify(content)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Train dataset using all the log files in the logs directory with the given dimension
@app.route('/api/datasets', methods=['GET', 'POST'])
def datasets():
    response = {
        'datasets': [],
        'messages': []
    }
    if request.method == 'POST':
        data = request.get_json()  # Get data as JSON
        dimension = data.get('dimension')
        if dimension:
            try:
                new_dataset_path = generate_dataset(dimension, source=LOGS_DIR, destination=DATASET_DIR)
                response['datasets'].append(os.path.basename(new_dataset_path))
                response['messages'].append(f"Dataset with dimension {dimension} generated successfully!")
            except Exception as e:
                response['messages'].append(f"Error generating dataset: {str(e)}")
    # Always send dataset files, even on POST to update the list
    response['datasets'].extend([f for f in os.listdir(DATASET_DIR) if f.endswith('.npz')])
    return jsonify(response)

# Upload a model file to the models directory
@app.route('/api/models', methods=['GET', 'POST'])
def models():
    if request.method == 'POST':
        file = request.files.get('file')
        if not file or file.filename == '':
            return jsonify({'error': 'No file provided or empty filename'}), 400
        if not allowed_model_file(file.filename):
            return jsonify({'error': 'Invalid file type'}), 400

        filename = secure_filename(file.filename)
        try:
            file_path = os.path.join(MODEL_DIR, filename)
            file.save(file_path)
            return jsonify({'message': 'File uploaded successfully', 'file_path': file_path}), 201
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    model_files = [f for f in os.listdir(MODEL_DIR) if f.endswith('.h5') or f.endswith('.tflite')]
    return jsonify(model_files)

# @app.route('/models', methods=['GET', 'POST'])
# def models():
#     if request.method == 'POST':
#         if 'file' not in request.files:
#             return redirect(request.url)
#         file = request.files['file']
#         if file.filename == '':
#             return redirect(request.url)
#         if file and allowed_model_file(file.filename):
#             filename = secure_filename(file.filename)
#             file.save(os.path.join(MODEL_DIR, filename))
#             return redirect(url_for('models'))
    
#     model_files = [f for f in os.listdir(MODEL_DIR) if allowed_model_file(f)]
#     return render_template('models.html', model_files=model_files)

# Get the current configuration file
@app.route('/api/config', methods=['GET'])
def get_config():
    with open(CONFIG_FILE, 'r') as f:
        config_content = f.read()
    return jsonify({'config_content': config_content})

# Update the current configuration file
@app.route('/api/config', methods=['POST'])
def update_config():
    config_content = request.json.get('config_content')
    if config_content is not None:
        try:
            with open(CONFIG_FILE, 'w') as f:
                f.write(config_content)
            return jsonify({'message': 'Config saved successfully'}), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    return jsonify({'error': 'Invalid data'}), 400

# Download a log file
@app.route('/download_log/<filename>')
def download_log(filename):
    return send_file(os.path.join(LOGS_DIR, filename), as_attachment=True)

# Download a model file
@app.route('/download_model/<filename>')
def download_model(filename):
    return send_file(os.path.join(MODEL_DIR, filename), as_attachment=True)

# Download a dataset file
@app.route('/download_dataset/<filename>')
def download_dataset(filename):
    return send_file(os.path.join(DATASET_DIR, filename), as_attachment=True)

def training_stream():
    def generate():
        while True:
            try:
                message = training_queue.get(timeout=30)  # Add timeout
                if message == "DONE":
                    logging.info("Training stream completed")
                    break
                logging.info(f"Streaming message: {message}")
                yield f"data: {json.dumps(message)}\n\n"
            except queue.Empty:
                logging.warning("Training queue timeout - no messages for 30 seconds")
                break
            except Exception as e:
                logging.error(f"Error in training stream: {e}")
                break
    return Response(stream_with_context(generate()), mimetype='text/event-stream')

@app.route('/api/training/stream')
def stream():
    return training_stream()

@app.route('/api/create-dataset', methods=['POST'])
def create_dataset():
    try:
        data = request.get_json()
        log_files = data.get('logFiles', [])
        
        if not log_files:
            return jsonify({"error": "No log files selected"}), 400

        dimension_part = [part for part in log_files[0].split('-') if 'd' in part][0]
        dimension = int(dimension_part.replace('d', ''))
        
        dataset_name = f"training-dataset-{dimension}d-selected.npz"
        dataset_file = Path("datasets") / dataset_name
        
        # Generate dataset from selected files
        raw_perfs, stats = generate_dataset_from_files(log_files, dimension)
        np.savez_compressed(dataset_file, perfs=raw_perfs)

        return jsonify({
            "status": "success",
            "message": "Dataset created",
            "dataset_file": str(dataset_file),
            "stats": {
                "total_values": stats["total_values"],
                "total_interactions": stats["total_interactions"],
                "total_time": stats["total_time"],
                "num_performances": stats["num_performances"]
            }
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/start-training', methods=['POST'])
def start_training():
    try:
        global training_process
        data = request.get_json()
        dimension = data.get('dimension')
        
        def run_training_command():
            try:
                global training_process
                # Construct the training command
                command = [
                    "poetry", "run", "./start_impsy.py", "train",
                    "-D", str(dimension),
                    "-S", f"datasets/training-dataset-{dimension}d-selected.npz",
                    "-M", "s",
                    "--earlystopping",
                    "-P", "10",
                    "-N", "100",
                    "-B", "64"
                ]

                logging.info(f"Starting training command: {' '.join(command)}")
                
                # Run the command and capture output
                training_process = subprocess.Popen(
                    command,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    universal_newlines=True,
                    bufsize=1
                )

                # Stream the output
                while training_process.poll() is None:  # While process is running
                    line = training_process.stdout.readline()
                    if line:
                        logging.info(f"Training output: {line.strip()}")
                        training_queue.put({
                            "message": line.strip(),
                            "metrics": {"raw_output": True}
                        })

                # Get remaining output
                remaining_output, _ = training_process.communicate()
                if remaining_output:
                    for line in remaining_output.splitlines():
                        logging.info(f"Final output: {line.strip()}")
                        training_queue.put({
                            "message": line.strip(),
                            "metrics": {"raw_output": True}
                        })

                training_queue.put("DONE")
                training_process = None

            except Exception as e:
                logging.error(f"Error in training process: {str(e)}")
                training_queue.put({
                    "message": f"Error during training: {str(e)}",
                    "metrics": {"error": str(e)}
                })
                training_queue.put("DONE")
                training_process = None

        # Start training in a separate thread
        training_thread = threading.Thread(target=run_training_command)
        training_thread.daemon = True  # Make thread daemon so it doesn't block program exit
        training_thread.start()

        return jsonify({
            "status": "success",
            "message": "Training process started"
        })

    except Exception as e:
        logging.error(f"Error starting training: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Add a new endpoint to check training status
@app.route('/api/training/status', methods=['GET'])
def training_status():
    global training_process
    if training_process is not None:
        is_running = training_process.poll() is None
        return jsonify({
            "is_running": is_running,
            "pid": training_process.pid if is_running else None
        })
    return jsonify({
        "is_running": False,
        "pid": None
    })

@click.command()
@click.option('--host', default=DEFAULT_HOST, help='The host to bind to.')
@click.option('--port', default=DEFAULT_PORT, help='The port to bind to.')
@click.option('--debug', is_flag=True, help='Run in debug mode.')
@click.option('--dev', is_flag=True, help='Run in development mode with React')
def webui(host, port, debug, dev):
    print("Starting IMPSY web interface...")
    
    # Create and run event loop in a separate thread
    def run_async_server():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        # Create a new OSC server instance in this thread
        thread_osc_server = IMPSYOSCServer()
        loop.run_until_complete(thread_osc_server.start())
        loop.run_forever()
    
    # Start OSC server in a separate thread
    import threading
    osc_thread = threading.Thread(target=run_async_server, daemon=True)
    osc_thread.start()
    
    if dev:
        subprocess.Popen(['npm', 'start'], cwd='./impsy/frontend')
    
    # Run Flask app
    app.run(host=host, port=port, debug=debug)

if __name__ == "__main__":
    webui()
