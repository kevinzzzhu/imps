from pythonosc.osc_server import AsyncIOOSCUDPServer
from pythonosc.dispatcher import Dispatcher
from pythonosc.udp_client import SimpleUDPClient
import asyncio
import websockets
import json

class IMPSYOSCServer:
    def __init__(self):
        print("Initializing IMPSYOSCServer...")
        self.websocket_clients = set()
        
        # Create separate dispatchers for each server
        self.backend_dispatcher = Dispatcher()
        self.backend_dispatcher.map("/*", self.handle_backend_message)
        
        self.device_dispatcher = Dispatcher()
        self.device_dispatcher.map("/*", self.handle_device_message)
        print("OSC dispatchers created")
        
        # Store ports for message routing
        self.backend_port = 5002
        self.device_port = 5004
        
        # OSC Setup
        try:
            self.backend_server = AsyncIOOSCUDPServer(
                ('0.0.0.0', self.backend_port), 
                self.backend_dispatcher, 
                asyncio.get_event_loop()
            )
            self.device_server = AsyncIOOSCUDPServer(
                ('0.0.0.0', self.device_port), 
                self.device_dispatcher, 
                asyncio.get_event_loop()
            )
            print("OSC servers created successfully")
        except Exception as e:
            print(f"Error creating OSC servers: {e}")
        
        # OSC Clients
        self.device_client = SimpleUDPClient('127.0.0.1', 5003)
        self.backend_client = SimpleUDPClient('127.0.0.1', 5000)
    
    async def websocket_handler(self, websocket, path):
        print(f"New WebSocket client connected from {websocket.remote_address}")
        self.websocket_clients.add(websocket)
        try:
            await websocket.wait_closed()
        finally:
            print(f"WebSocket client disconnected: {websocket.remote_address}")
            self.websocket_clients.remove(websocket)
    
    def handle_backend_message(self, address, *values):
        print(f"Received backend OSC message on address: {address} with values: {values}")
        # Forward to device
        self.device_client.send_message(address, values)
        # Send to WebSocket clients
        asyncio.create_task(self.broadcast_ws({
            'type': 'output',
            'data': values
        }))

    def handle_device_message(self, address, *values):
        print(f"Received device OSC message on address: {address} with values: {values}")
        # Forward to backend
        self.backend_client.send_message(address, values)
        # Send to WebSocket clients
        asyncio.create_task(self.broadcast_ws({
            'type': 'input',
            'data': values
        }))
    
    async def broadcast_ws(self, message):
        if self.websocket_clients:
            await asyncio.gather(
                *[client.send(json.dumps(message)) 
                    for client in self.websocket_clients]
            )
    
    async def start(self):
        print("Starting IMPSYOSCServer...")
        try:
            # Start WebSocket server
            ws_server = await websockets.serve(
                self.websocket_handler, 
                'localhost', 
                8080
            )
            print("WebSocket server started on port 8080")
            
            # Start OSC servers
            transport1, protocol1 = await self.backend_server.create_serve_endpoint()
            print("Backend OSC server started on port 5002")
            
            transport2, protocol2 = await self.device_server.create_serve_endpoint()
            print("Device OSC server started on port 5004")
            
            print("All servers started successfully!")
            return ws_server, transport1, transport2
        except Exception as e:
            print(f"Error starting servers: {e}")
            raise

# In web_interface.py:
osc_server = IMPSYOSCServer()

def webui(host, port, debug, dev):
    # Start OSC server
    asyncio.create_task(osc_server.start())
    
    if dev:
        subprocess.Popen(['npm', 'start'], cwd='./frontend')
    
    app.run(host=host, port=port, debug=debug) 