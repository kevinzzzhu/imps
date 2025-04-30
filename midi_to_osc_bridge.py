#!/usr/bin/env python

"""
MIDI to OSC Bridge
This script captures MIDI messages from a controller and forwards them as OSC messages.
Use this to test if MIDI can be correctly routed to OSC.
"""

import mido
import time
import argparse
import sys
from pythonosc import udp_client
import numpy as np

class MIDIState:
    """Maintain the state of all MIDI controllers and notes"""
    def __init__(self, dimension=15):
        self.dimension = dimension
        # Create a state array (excluding time delta slot)
        self.state = np.zeros(dimension-1)
        
        # Define controller mappings
        self.cc_map = {
            1: 1,    # Modulation wheel
            16: 2,   # Controller 1
            17: 3,   # Controller 2
            18: 4,   # Controller 3
            19: 5,   # Controller 4
            71: 6,   # Controller 5
            74: 7,   # Controller 6
            76: 8,   # Controller 7
            77: 9,   # Controller 8
            82: 10,  # Controller 9
            83: 11,  # Controller 10
            85: 12,  # Controller 11
            93: 13   # Controller 12
        }
        
        # Track the last note that was played
        self.last_note = None
        
    def update_from_midi(self, msg):
        """Update state from a MIDI message and return the full state list"""
        if msg.type == 'note_on':
            # Update note state (index 0)
            self.last_note = msg.note
            self.state[0] = msg.note / 127.0
        elif msg.type == 'control_change':
            if msg.control in self.cc_map:
                cc_index = self.cc_map[msg.control]
                self.state[cc_index] = msg.value / 127.0
        
        # Return a copy of the current state
        return self.state.tolist()

def main():
    parser = argparse.ArgumentParser(description="MIDI to OSC Bridge for IMPSY")
    parser.add_argument("--midi-port", default="Minilab3 MIDI", help="MIDI input port name")
    parser.add_argument("--osc-ip", default="127.0.0.1", help="OSC server IP")
    parser.add_argument("--osc-port", type=int, default=5000, help="OSC server port")
    parser.add_argument("--dimension", type=int, default=15, help="IMPSY dimension")
    parser.add_argument("--verbose", action="store_true", help="Show all MIDI messages")
    
    args = parser.parse_args()
    
    # List available MIDI inputs
    midi_ports = mido.get_input_names()
    print(f"Available MIDI inputs: {midi_ports}")
    
    # Find best matching MIDI port
    port_name = args.midi_port
    if port_name not in midi_ports:
        # Try case-insensitive match
        matches = [p for p in midi_ports if port_name.lower() in p.lower()]
        if matches:
            port_name = matches[0]
            print(f"Using closest match: {port_name}")
        else:
            print(f"Error: MIDI port '{port_name}' not found")
            sys.exit(1)
    
    # Open MIDI port
    try:
        midi_in = mido.open_input(port_name)
        print(f"Connected to MIDI port: {midi_in.name}")
    except Exception as e:
        print(f"Error opening MIDI port: {e}")
        sys.exit(1)
    
    # Create OSC client for IMPSY
    osc_client = udp_client.SimpleUDPClient(args.osc_ip, args.osc_port)
    print(f"Sending OSC messages to IMPSY at {args.osc_ip}:{args.osc_port}")
    
    # Create state object to track all controller values
    midi_state = MIDIState(args.dimension)
    
    print("\nBridge is running. Press Ctrl+C to stop.")
    print("Play your MIDI controller to see messages...")
    
    # Bridge MIDI to OSC
    try:
        while True:
            # Check for pending messages
            for msg in midi_in.iter_pending():
                if args.verbose or msg.type in ['note_on', 'note_off', 'control_change']:
                    print(f"MIDI: {msg}")
                
                # Skip note_off events (we'll let note_on with velocity 0 handle this)
                if msg.type == 'note_off':
                    continue
                    
                # Update state and send to IMPSY's /interface
                if msg.type in ['note_on', 'control_change']:
                    dense_values = midi_state.update_from_midi(msg)
                    osc_client.send_message("/interface", dense_values)
                    
                    if args.verbose:
                        print(f"OSC: /interface {dense_values}")
                
            # Check for non-pending messages
            msg = midi_in.receive(block=False)
            if msg:
                if args.verbose or msg.type in ['note_on', 'note_off', 'control_change']:
                    print(f"MIDI (blocking): {msg}")
                
                # Skip note_off events
                if msg.type == 'note_off':
                    continue
                    
                # Update state and send to IMPSY's /interface
                if msg.type in ['note_on', 'control_change']:
                    dense_values = midi_state.update_from_midi(msg)
                    osc_client.send_message("/interface", dense_values)
                    
                    if args.verbose:
                        print(f"OSC: /interface {dense_values}")
            
            time.sleep(0.001)  # Small delay to prevent CPU overuse
            
    except KeyboardInterrupt:
        print("\nBridge stopped by user")
    finally:
        midi_in.close()
        print("MIDI port closed")

if __name__ == "__main__":
    main() 