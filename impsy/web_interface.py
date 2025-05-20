"""impsy.web_interface: RESTFUL APIs and functions for the web interface."""

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
import logging
import tensorflow as tf
from tensorboard.backend.event_processing import event_accumulator
import re
import mido

app = Flask(__name__, static_folder='./frontend/build', static_url_path='')
app.secret_key = "impsywebui"

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = Path(os.path.dirname(CURRENT_DIR))
LOGS_DIR = PROJECT_ROOT / 'logs'
MODEL_DIR = PROJECT_ROOT / 'models'
DATASET_DIR = PROJECT_ROOT / 'datasets'
CONFIGS_DIR = PROJECT_ROOT / 'configs'
PROJECTS_DIR = PROJECT_ROOT / 'projects'

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

training_queue = queue.Queue()
training_process = None
model_process = None

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

# Catch all route for the frontend
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def catch_all(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

# Get hardware info (About Page)
@app.route('/api/hardware-info')
def api_hardware_info():
    return jsonify(get_hardware_info())

# Get software info (About Page)
@app.route('/api/software-info')
def api_software_info():
    return jsonify(get_software_info())

# Get all routes in the app (About Page)
@app.route('/api/routes')
def api_routes():
    return jsonify([{
        'endpoint': route.endpoint,
        'route': route.rule,
        'name': ROUTE_NAMES.get(route.endpoint, route.endpoint)
    } for route in app.url_map.iter_rules()])

# Get all log files in the logs directory
@app.route('/api/logs', methods=['GET', 'POST'])
def logs():
    log_files = [f for f in os.listdir(LOGS_DIR) if f.endswith('.log')]
    
    # Sort log files by date (newest first)
    log_files.sort(key=lambda x: x.split('T')[0], reverse=True)
    
    return jsonify(log_files)

# Get the content of a log file
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

    # For GET request, get and sort model files
    model_files = [f for f in os.listdir(MODEL_DIR) 
                    if f.endswith('.h5') or f.endswith('.tflite') or f.endswith('.keras')]
    
    # Sort model files by date in filename (newest first)
    model_files.sort(key=lambda x: x.split('-')[0] + x.split('-')[1] if '-' in x else '', reverse=True)
    
    return jsonify(model_files)

# Get the current configuration file
@app.route('/api/config', methods=['GET'])
def get_config():
    with open(CONFIG_FILE, 'r') as f:
        config_content = f.read()
    return jsonify({'config_content': config_content})

# Update the current configuration file
@app.route('/api/config', methods=['POST'])
def update_config():
    try:
        config_content = request.json.get('config_content')
        project_name = request.json.get('project_name')
        
        if config_content is None:
            return jsonify({'error': 'Invalid data'}), 400

        # Save to global config
        with open(CONFIG_FILE, 'w') as f:
            f.write(config_content)

        # If project name is provided, save to project config
        if project_name:
            # Find the project config file
            project_path = Path(PROJECTS_DIR)
            
            # Check for exact match first
            exact_match = project_path / f"{project_name}.toml"
            if exact_match.exists():
                project_file = exact_match
            else:
                # Look for numbered versions
                project_files = list(project_path.glob(f"{project_name}-*.toml"))
                project_file = project_files[-1] if project_files else exact_match

            # Save to project config
            with open(project_file, 'w') as f:
                f.write(config_content)

        return jsonify({'message': 'Config saved successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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

# Create a dataset from selected log files
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
        
        print(f"Creating dataset from logs: {log_files}")
        print(f"Detected dimension: {dimension}")
        print(f"Dataset output file: {dataset_file}")
        
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
        import traceback
        error_traceback = traceback.format_exc()
        error_message = f"Error creating dataset: {str(e)}\n{error_traceback}"
        print(error_message)
        return jsonify({"error": str(e), "traceback": error_traceback}), 500

# Start training
@app.route('/api/start-training', methods=['POST'])
def start_training():
    try:
        global training_process
        data = request.get_json()
        dimension = data.get('dimension')
        model_size = data.get('modelSize', 's')
        early_stopping = data.get('earlyStoppingEnabled', True)
        patience = data.get('patience', 10)
        num_epochs = data.get('numEpochs', 100)
        batch_size = data.get('batchSize', 64)
        log_files = data.get('logFiles', [])

        def run_training_command():
            try:
                global training_process
                # Construct the training command with new parameters
                command = [
                    "poetry", "run", "./start_impsy.py", "train",
                    "-D", str(dimension),
                    "-S", f"datasets/training-dataset-{dimension}d-selected.npz",
                    "-M", model_size,
                    "-N", str(num_epochs),
                    "-B", str(batch_size),
                    "--log-files", ",".join(log_files)
                ]

                # Add early stopping options if enabled
                if early_stopping:
                    command.extend(["--earlystopping", "-P", str(patience)])
                else:
                    command.append("--no-earlystopping")

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
            "message": "Training process started",
            "config": {
                "dimension": dimension,
                "modelSize": model_size,
                "earlyStoppingEnabled": early_stopping,
                "patience": patience,
                "numEpochs": num_epochs,
                "batchSize": batch_size
            }
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

# Stream training output (Loop until DONE)
@app.route('/api/training/stream')
def stream():
    def generate():
        while True:
            try:
                message = training_queue.get(timeout=30)
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

@app.route('/api/models/<model>/tensorboard/train', methods=['GET'])
def get_model_training_tensorboard(model):
    try:
        # Remove file extensions to get base model name
        base_model_name = model.replace('-ckpt.keras', '').replace('.keras', '').replace('.tflite', '')
        
        # Get the model's tensorboard directory
        model_dir = Path(MODEL_DIR) / base_model_name / 'train'

        # print(f"Looking for TensorBoard logs in: {model_dir}")    

        if not model_dir.exists():
            print(f"Directory not found: {model_dir}")
            return jsonify({'error': 'TensorBoard logs not found'}), 404

        # Find all event files in the directory
        event_files = list(model_dir.glob('events.out.tfevents.*'))
        if not event_files:
            print("No event files found")
            return jsonify({'error': 'No TensorBoard event files found'}), 404

        # Load and combine data from all event files
        metrics = {'epoch_loss': []}
        for event_file in sorted(event_files):
            # print(f"Processing event file: {event_file}")
            ea = event_accumulator.EventAccumulator(
                str(event_file),
                size_guidance={  # Increase size limits
                    event_accumulator.SCALARS: 0,  # 0 means load all
                    event_accumulator.TENSORS: 0
                }
            )
            ea.Reload()
            
            # Get available tags
            tags = ea.Tags()
            # print(f"Available tags in {event_file}: {tags}")
            
            # Process tensor events
            if 'epoch_loss' in tags.get('tensors', []):
                events = ea.Tensors('epoch_loss')
                # print(f"Found {len(events)} events in {event_file}")
                
                for event in events:
                    metrics['epoch_loss'].append({
                        'step': event.step,
                        'value': float(tf.make_ndarray(event.tensor_proto)),
                        'wall_time': event.wall_time
                    })

        # Sort by step to ensure proper ordering
        metrics['epoch_loss'].sort(key=lambda x: x['step'])
        
        # print(f"Total events collected: {len(metrics['epoch_loss'])}")
        # print(f"Step range: {metrics['epoch_loss'][0]['step']} to {metrics['epoch_loss'][-1]['step']}")
        # print(f"Final metrics: {metrics}")

        return jsonify({
            'metrics': metrics,
            'success': True
        })
        
    except Exception as e:
        print(f"Error getting model details: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/models/<model>/tensorboard/validation', methods=['GET'])
def get_model_validation_tensorboard(model):
    try:
        # Remove file extensions to get base model name
        base_model_name = model.replace('-ckpt.keras', '').replace('.keras', '').replace('.tflite', '')
        
        # Get the model's tensorboard directory
        model_dir = Path(MODEL_DIR) / base_model_name / 'validation'

        # print(f"Looking for TensorBoard logs in: {model_dir}")    

        if not model_dir.exists():
            print(f"Directory not found: {model_dir}")
            return jsonify({'error': 'TensorBoard logs not found'}), 404

        # Find all event files in the directory
        event_files = list(model_dir.glob('events.out.tfevents.*'))
        if not event_files:
            print("No event files found")
            return jsonify({'error': 'No TensorBoard event files found'}), 404

        # Load and combine data from all event files
        metrics = {
            'epoch_loss': [],
            'evaluation_loss_vs_iterations': []
        }
        
        for event_file in sorted(event_files):
            # print(f"Processing event file: {event_file}")
            ea = event_accumulator.EventAccumulator(
                str(event_file),
                size_guidance={  # Increase size limits
                    event_accumulator.SCALARS: 0,  # 0 means load all
                    event_accumulator.TENSORS: 0
                }
            )
            ea.Reload()
            
            # Get available tags
            tags = ea.Tags()
            # print(f"Available tags in {event_file}: {tags}")
            
            # Process tensor events for both metrics
            for metric in ['epoch_loss', 'evaluation_loss_vs_iterations']:
                if metric in tags.get('tensors', []):
                    events = ea.Tensors(metric)
                    # print(f"Found {len(events)} events for {metric} in {event_file}")
                    
                    for event in events:
                        metrics[metric].append({
                            'step': event.step,
                            'value': float(tf.make_ndarray(event.tensor_proto)),
                            'wall_time': event.wall_time
                        })

        # Sort by step to ensure proper ordering
        for metric in metrics:
            metrics[metric].sort(key=lambda x: x['step'])
            # if metrics[metric]:
            #     print(f"{metric} - Total events: {len(metrics[metric])}")
            #     print(f"{metric} - Step range: {metrics[metric][0]['step']} to {metrics[metric][-1]['step']}")

        # print(f"Final metrics: {metrics}")

        return jsonify({
            'metrics': metrics,
            'success': True
        })
        
    except Exception as e:
        print(f"Error getting validation metrics: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Add these route handlers for file uploads
@app.route('/api/import-logs', methods=['POST'])
def import_logs():
    try:
        uploaded_files = request.files.getlist('files')
        if not uploaded_files:
            return jsonify({'error': 'No files provided'}), 400

        imported_files = []
        errors = []

        for file in uploaded_files:
            if file and allowed_log_file(file.filename):
                filename = secure_filename(file.filename)
                try:
                    file_path = os.path.join(LOGS_DIR, filename)
                    file.save(file_path)
                    imported_files.append(filename)
                except Exception as e:
                    errors.append(f"Error saving {filename}: {str(e)}")
            else:
                errors.append(f"Invalid file type for {file.filename}. Only .log files are allowed.")

        return jsonify({
            'message': f'Successfully imported {len(imported_files)} files',
            'imported_files': imported_files,
            'errors': errors
        }), 200 if imported_files else 400

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/import-models', methods=['POST'])
def import_models():
    try:
        uploaded_files = request.files.getlist('files')
        if not uploaded_files:
            return jsonify({'error': 'No files provided'}), 400

        imported_files = []
        errors = []

        for file in uploaded_files:
            if file and allowed_model_file(file.filename):
                filename = secure_filename(file.filename)
                try:
                    file_path = os.path.join(MODEL_DIR, filename)
                    file.save(file_path)
                    imported_files.append(filename)
                except Exception as e:
                    errors.append(f"Error saving {filename}: {str(e)}")
            else:
                errors.append(f"Invalid file type for {file.filename}. Only .h5, .tflite, and .keras files are allowed.")

        return jsonify({
            'message': f'Successfully imported {len(imported_files)} files',
            'imported_files': imported_files,
            'errors': errors
        }), 200 if imported_files else 400

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/new-project', methods=['POST'])
def new_project():
    try:
        data = request.json
        project_name = secure_filename(data['projectName'])
        config_content = data['configContent']

        # Find available filename
        base_path = os.path.join(PROJECTS_DIR, f"{project_name}.toml")
        final_path = base_path
        counter = 2
        
        while os.path.exists(final_path):
            final_path = os.path.join(PROJECTS_DIR, f"{project_name}-{counter}.toml")
            counter += 1

        # Save project config
        with open(final_path, 'w') as f:
            f.write(config_content)

        # Update global config
        with open('config.toml', 'w') as f:
            f.write(config_content)

        return jsonify({
            'success': True,
            'configPath': final_path
        })

    except Exception as e:
        print(f"Error saving project config: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Update the load-model route
@app.route('/api/load-model', methods=['POST'])
def load_model():
    try:
        data = request.json
        project_name = data.get('projectName', '')
        model_file = data.get('modelFile', '')

        if not project_name:
            return jsonify({'error': 'Project name is required'}), 400

        # Find the project config file
        project_file = None
        project_path = Path(PROJECTS_DIR)
        
        # Check for exact match first
        exact_match = project_path / f"{project_name}.toml"
        if exact_match.exists():
            project_file = exact_match
        else:
            # Look for numbered versions
            for file in project_path.glob(f"{project_name}-*.toml"):
                project_file = file
                break

        if not project_file:
            return jsonify({'error': f'Project configuration not found for {project_name}'}), 404

        # Read project config and update global config
        try:
            with open(project_file, 'r') as src:
                config_content = src.read()
                
            # If model_file is provided, update the file field in the config
            if model_file:
                import re
                # First, make the model file path relative to models/ directory
                if not model_file.startswith('models/'):
                    model_file = f"models/{model_file}"
                
                # Create a more robust regex pattern to match the model file in the config
                # This handles both quoted and unquoted paths, as well as empty strings
                model_file_pattern = r'(\[model\][^\[]*?file\s*=\s*)(?:"[^"]*"|\'[^\']*\'|[^\s\n\r\[\]]+)'
                
                # Update the file path in the config content
                config_content = re.sub(model_file_pattern, r'\1"' + model_file + '"', 
                                        config_content, flags=re.DOTALL)
            
            # Write updated config to global config
            with open('config.toml', 'w') as dst:
                dst.write(config_content)
                
            # Update project file with the same changes
            with open(project_file, 'w') as proj_file:
                proj_file.write(config_content)
                
        except Exception as e:
            return jsonify({'error': f'Error updating configuration: {str(e)}'}), 500

        return jsonify({
            'success': True,
            'message': 'Model loaded successfully',
            'configPath': str(project_file)
        })

    except Exception as e:
        print(f"Error loading model: {str(e)}")
        return jsonify({'error': str(e)}), 500
    
@app.route('/api/run-model', methods=['POST'])
def run_model():
    try:
        global model_process
        # Start the model in a separate process
        model_process = subprocess.Popen(
            ["poetry", "run", "./start_impsy.py", "run"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            bufsize=1
        )
        
        # Start a thread to monitor the process
        def monitor_process():
            output_lines = []
            error_detected = False
            
            # Read output for error detection
            while model_process and model_process.poll() is None:
                try:
                    line = model_process.stdout.readline()
                    if not line:
                        break
                        
                    output_lines.append(line.strip())
                    # Keep only the last 50 lines
                    if len(output_lines) > 50:
                        output_lines.pop(0)
                        
                    # Check for error patterns
                    if "error" in line.lower() or "exception" in line.lower():
                        error_detected = True
                        
                except Exception as e:
                    print(f"Error reading model process output: {e}")
                    break
            
            # Process terminated
            return_code = model_process.poll()
            print(f"Model process terminated with return code: {return_code}")
            
            # If process terminated unexpectedly and we have output, 
            # we can send it to the client via a future status endpoint
            if return_code != 0:
                error_message = "\n".join(output_lines[-10:]) if output_lines else "Unknown error"
                print(f"Model process failed: {error_message}")
        
        # Start monitoring thread
        monitor_thread = threading.Thread(target=monitor_process)
        monitor_thread.daemon = True
        monitor_thread.start()
        
        # Check if the process started successfully
        if model_process.poll() is None:  # Process is running
            return jsonify({
                "success": True,
                "message": "Model started successfully",
                "pid": model_process.pid
            })
        else:
            return jsonify({
                "success": False,
                "error": "Failed to start model"
            }), 500
            
    except Exception as e:
        print(f"Error starting model: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

# Add model status endpoint to check if model is still running
@app.route('/api/model-status', methods=['GET'])
def model_status():
    try:
        global model_process
        
        if model_process is None:
            return jsonify({
                "running": False,
                "status": "not_started",
                "message": "Model not running"
            })
            
        # Check if process is still running
        if model_process.poll() is None:
            return jsonify({
                "running": True,
                "status": "running",
                "pid": model_process.pid,
                "message": "Model is running"
            })
        else:
            # Process has terminated
            return_code = model_process.poll()
            status = "stopped" if return_code == 0 else "error"
            
            # Get any output from the process if available
            try:
                remaining_output, _ = model_process.communicate(timeout=0.1)
                error_message = remaining_output.strip() if remaining_output else f"Process terminated with return code {return_code}"
            except:
                error_message = f"Process terminated with return code {return_code}"
                
            return jsonify({
                "running": False,
                "status": status,
                "message": error_message,
                "return_code": return_code
            })
            
    except Exception as e:
        return jsonify({
            "running": False,
            "status": "error",
            "message": f"Error checking model status: {str(e)}"
        }), 500

@app.route('/api/stop-model', methods=['POST'])
def stop_model():
    try:
        global model_process
        if model_process is not None:
            # Try to terminate the process gracefully
            model_process.terminate()
            try:
                # Wait for up to 5 seconds for the process to terminate
                model_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                # If process doesn't terminate within 5 seconds, kill it
                model_process.kill()
            
            model_process = None
            return jsonify({
                "success": True,
                "message": "Model stopped successfully"
            })
        return jsonify({
            "success": True,
            "message": "No model running"
        })
    except Exception as e:
        print(f"Error stopping model: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/projects', methods=['GET'])
def get_projects():
    try:
        projects = []
        project_path = Path(PROJECTS_DIR)
        
        # Get all .toml files in projects directory
        for file in project_path.glob('*.toml'):
            try:
                # Read the project config to get metadata
                with open(file, 'r') as f:
                    config_content = f.read()
                    config_data = tomllib.loads(config_content)
                    
                projects.append({
                    'name': file.stem,
                    'title': config_data.get('title', file.stem),
                    'owner': config_data.get('owner', 'Unknown'),
                    'description': config_data.get('description', ''),
                    'last_modified': os.path.getmtime(file)
                })
            except Exception as e:
                print(f"Error reading project {file}: {e}")
                continue
        
        # Sort projects by last modified time (newest first)
        projects.sort(key=lambda x: x['last_modified'], reverse=True)
        
        return jsonify(projects)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/model-data/<path:model_dir>')
def get_model_data(model_dir):
    try:
        # Get all logs from logs directory
        all_logs = [f.name for f in LOGS_DIR.glob('*.log')]
        
        # Remove file extensions to get base model name
        base_model_name = model_dir.replace('-ckpt.keras', '').replace('.keras', '').replace('.h5', '').replace('.tflite', '')
        
        # Get selected logs from data file
        data_file = MODEL_DIR / base_model_name / 'data'
        selected_logs = []
        
        if data_file.exists():
            with open(data_file, 'r') as f:
                content = f.read()
                
            if 'selected_logs: [' in content:
                selected_section = content.split('selected_logs: [')[1].split(']')[0]
                selected_logs = [log.strip(' ,\n"\'') for log in selected_section.split('\n') if log.strip(' ,\n"\'')]
        
        # Get current log file from config.toml [log] section
        generated_logs = []
        try:
            with open(CONFIG_FILE, 'rb') as f:  # Note 'rb' mode for tomllib
                config = tomllib.load(f)
                if 'log' in config and 'file' in config['log']:
                    log_files = config['log']['file']
                    if log_files:
                        generated_logs = [log_files[-1]]  # Get last log file
                        print(f"Found generated logs: {generated_logs}")
                    else:
                        print("No log files in config")
                else:
                    print("No [log] section or file array in config")
        except Exception as e:
            print(f"Error reading config file: {e}")
        
        return jsonify({
            'all_logs': all_logs,
            'selected_logs': selected_logs,
            'generated_logs': generated_logs
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Delete a log file
@app.route('/api/logs/<filename>', methods=['DELETE'])
def delete_log_file(filename):
    try:
        # Ensure the filename is safe
        safe_filename = secure_filename(filename)
        log_path = os.path.join(LOGS_DIR, safe_filename)
        
        # Check if file exists
        if not os.path.exists(log_path):
            return jsonify({'success': False, 'error': 'File not found'}), 404
            
        # Check if path is within LOGS_DIR (security check)
        if not os.path.commonpath([os.path.abspath(log_path), str(LOGS_DIR)]) == str(LOGS_DIR):
            return jsonify({'success': False, 'error': 'Invalid file path'}), 403
            
        # Delete the file
        os.remove(log_path)
        return jsonify({'success': True, 'message': f'File {filename} deleted successfully'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Delete a model file
@app.route('/api/models/<filename>', methods=['DELETE'])
def delete_model_file(filename):
    try:
        # Ensure the filename is safe
        safe_filename = secure_filename(filename)
        model_path = os.path.join(MODEL_DIR, safe_filename)
        
        # Check if file exists
        if not os.path.exists(model_path):
            return jsonify({'success': False, 'error': 'File not found'}), 404
            
        # Check if path is within MODEL_DIR (security check)
        if not os.path.commonpath([os.path.abspath(model_path), str(MODEL_DIR)]) == str(MODEL_DIR):
            return jsonify({'success': False, 'error': 'Invalid file path'}), 403
            
        # Delete the file
        os.remove(model_path)
        return jsonify({'success': True, 'message': f'Model {filename} deleted successfully'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@click.command()
@click.option('--host', default=DEFAULT_HOST, help='The host to bind to.')
@click.option('--port', default=DEFAULT_PORT, help='The port to bind to.')
@click.option('--debug', is_flag=True, help='Run in debug mode.')
@click.option('--dev', is_flag=True, help='Run in development mode with React (Hot Reload)')
def webui(host, port, debug, dev):
    banner = """
       ___
     o|* *|o         _____  __  __    ____   ____   __   __        
     o|* *|o        |_   _||  \/  |  |  _ \ / ___|  \ \ / /        
     o|* *|o          | |  | |\/| |  | |_) |\___ \   \ V /           ; 
      \===/           | |  | |  | |  |  __/  ___) |   | |            ;;
       |||          |_____||_|  |_|  |_|    |____/    |_|            ;';.
       |||                                                           ;  ;;
       |||           INTERACTIVE MUSICAL PREDICTION SYSTEM           ;   ;;
       |||                        AI + MUSIC                         ;    ;;
    ___|||___     -----------------------------------------          ;    ;;
   /   |||   \      Explore real-time predictive music               ;   ;'
  /    |||    \     generation! Collaborate with an AI that          ;  ' 
 |     |||     |    anticipates your next musical idea.         ,;;;,;
  \   (|||)   /     Experience the synergy of machine.          ;;;;;;
   |   |||   |      learning and human expression!              `;;;;'
  /    |||    \    -----------------------------------------
 /     |||     \     	                .,,,.
/      |||      \                  .;;;;;;;;;,
|     [===]     |                 ;;;'    `;;;,
 \             /                 ;;;'      `;;;
  '.         .'                  ;;;        ;;;
    '-------'                    ;;;.      ;;;'
							     `;;;.    ;;;'
								  `;;;.  ;;;'
								   `;;',;;'
								    ,;;;'
							     ,;;;',;' ...,,,,...
							  ,;;;'    ,;;;;;;;;;;;;;;,
						   ,;;;'     ,;;;;;;;;;;;;;;;;;;,
						  ;;;;'     ;;;',,,   `';;;;;;;;;;
						 ;;;;,      ;;   ;;;     ';;;;;;;;;
						;;;;;;       '    ;;;      ';;;;;;;
						;;;;;;            .;;;      ;;;;;;;
						;;;;;;,            ;;;;     ;;;;;;'
						 ;;;;;;,            ;;;;   .;;;;;'
						  `;;;;;;,           ;;;; ,;;;;;'
						   `;;;;;;;,,,,,,,,,, ;;;; ;;;'
							  `;;;;;;;;;;;;;;; ;;;; '
								  ''''''''''''' ;;;.
									   .;;;.    `;;;.
									  ;;;; '     ;;;;
									  ;;;;,,,..,;;;;;
									  `;;;;;;;;;;;;;'
									    `;;;;;;;;;'
"""
    print(banner)
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

@app.route('/api/midi-devices', methods=['GET'])
def get_midi_devices():
    """Get available MIDI input and output devices"""
    try:
        input_devices = mido.get_input_names()
        output_devices = mido.get_output_names()
        
        # Get currently configured devices from config file
        config_path = os.path.join(PROJECT_ROOT, CONFIG_FILE)
        with open(config_path, "rb") as f:
            config = tomllib.load(f)
        
        current_in_device = config.get("midi", {}).get("in_device", "")
        current_out_device = config.get("midi", {}).get("out_device", "")
        
        return jsonify({
            "input_devices": input_devices,
            "output_devices": output_devices,
            "current_in_device": current_in_device,
            "current_out_device": current_out_device,
            "has_permission": True,  # Default to true, browser-based MIDI will handle permissions
            "needs_permission": True  # Web MIDI API always needs user permission
        })
    except Exception as e:
        return jsonify({
            "input_devices": [],
            "output_devices": [],
            "current_in_device": "",
            "current_out_device": "",
            "has_permission": False,
            "needs_permission": True,
            "error": str(e)
        })

if __name__ == "__main__":
    webui()
