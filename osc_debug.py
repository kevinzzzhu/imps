#!/usr/bin/env python

"""
Simple OSC Debug Script
This script sets up an OSC server to listen for messages and an OSC client to send test messages.
Use this to test OSC communication.
"""

import argparse
from pythonosc import udp_client
from pythonosc.dispatcher import Dispatcher
from pythonosc.osc_server import BlockingOSCUDPServer
import threading
import time
import sys

def handle_message(address, *args):
    """Callback for received OSC messages"""
    print(f"Received OSC message at {address}: {args}")

def run_server(ip, port):
    """Run an OSC server to listen for messages"""
    dispatcher = Dispatcher()
    dispatcher.map("/*", handle_message)  # Map all addresses
    
    print(f"Starting OSC server at {ip}:{port}")
    try:
        server = BlockingOSCUDPServer((ip, port), dispatcher)
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nOSC server stopped")
    except Exception as e:
        print(f"Error starting OSC server: {e}")
        sys.exit(1)

def send_test_message(client_ip, client_port):
    """Send a test OSC message"""
    client = udp_client.SimpleUDPClient(client_ip, client_port)
    print(f"Sending test message to {client_ip}:{client_port}")
    client.send_message("/test", [1, 2, 3])
    print("Test message sent")

def main():
    parser = argparse.ArgumentParser(description="OSC Debug Tool")
    parser.add_argument("--server-ip", default="127.0.0.1", help="IP to listen on")
    parser.add_argument("--server-port", type=int, default=5000, help="Port to listen on")
    parser.add_argument("--client-ip", default="127.0.0.1", help="IP to send to")
    parser.add_argument("--client-port", type=int, default=5002, help="Port to send to")
    parser.add_argument("--test-send", action="store_true", help="Send a test message")
    
    args = parser.parse_args()
    
    # Start OSC server in a thread
    server_thread = threading.Thread(
        target=run_server, 
        args=(args.server_ip, args.server_port),
        daemon=True
    )
    server_thread.start()
    
    # Send a test message if requested
    if args.test_send:
        time.sleep(1)  # Give the server time to start
        send_test_message(args.client_ip, args.client_port)
    
    try:
        # Keep the main thread alive
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nExiting...")
        sys.exit(0)

if __name__ == "__main__":
    main() 