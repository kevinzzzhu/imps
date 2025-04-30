#!/usr/bin/env python

"""
Simple MIDI Debug Script
This script listens for MIDI input and prints all incoming MIDI messages.
Use this to test if your MIDI controller is working correctly.
"""

import mido
import time
import sys

def main():
    # List available MIDI inputs
    print(f"Available MIDI inputs: {mido.get_input_names()}")
    
    # Try to open the Minilab3 MIDI port
    try:
        port_name = "Minilab3 MIDI"
        print(f"Attempting to open MIDI port: {port_name}")
        port = mido.open_input(port_name)
        print(f"Successfully opened MIDI port: {port.name}")
    except Exception as e:
        print(f"Error opening MIDI port: {e}")
        # Try to find alternative ports that might contain "Minilab"
        alt_ports = [p for p in mido.get_input_names() if "minilab" in p.lower()]
        if alt_ports:
            print(f"Alternative ports found: {alt_ports}")
            try:
                port = mido.open_input(alt_ports[0])
                print(f"Successfully opened alternative MIDI port: {port.name}")
            except Exception as e:
                print(f"Error opening alternative MIDI port: {e}")
                sys.exit(1)
        else:
            print("No alternative MIDI ports found.")
            sys.exit(1)
    
    print("Now listening for MIDI messages. Press keys or move controllers on your MIDI device...")
    print("Press Ctrl+C to exit")
    
    # Listen for MIDI messages
    try:
        while True:
            for msg in port.iter_pending():
                print(f"Received MIDI message: {msg}")
            
            # Also check for non-pending messages with a timeout
            msg = port.receive(block=False)
            if msg:
                print(f"Received blocking MIDI message: {msg}")
                
            time.sleep(0.01)  # Small delay to prevent CPU overuse
    except KeyboardInterrupt:
        print("\nExiting...")
    finally:
        port.close()
        print("MIDI port closed")

if __name__ == "__main__":
    main() 