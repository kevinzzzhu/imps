from pythonosc import udp_client
import time
import numpy as np
import socket

# Create OSC client with explicit socket binding
client = udp_client.SimpleUDPClient("localhost", 5002)

# Print socket info
print(f"Python client sending to: localhost:5002")

while True:
    try:
        # Generate test data
        values = np.random.random(3).tolist()
        
        # Send test message
        client.send_message("/impsy", values)
        print(f"Sent test data: {values}")
        
    except Exception as e:
        print(f"Error sending message: {e}")
    
    time.sleep(1) 