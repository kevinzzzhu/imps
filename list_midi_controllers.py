import mido
import sys
import time

print("Available MIDI input devices:")
print(mido.get_input_names())

if len(mido.get_input_names()) == 0:
    print("No MIDI devices found")
    sys.exit(1)

# Default to first device or use command line argument
device_name = mido.get_input_names()[0]
if len(sys.argv) > 1:
    device_name = sys.argv[1]

print(f"\nListening for MIDI messages from: {device_name}")
print("Try turning knobs or pressing keys on your MIDI controller.")
print("Press Ctrl+C to stop.\n")

# Keep track of all seen controllers
seen_controllers = set()
note_controllers = set()

try:
    port = mido.open_input(device_name)
    start_time = time.time()
    
    while True:
        msg = port.receive()
        
        # Track controllers and notes
        if msg.type == 'control_change':
            seen_controllers.add(msg.control)
        elif msg.type == 'note_on':
            note_controllers.add(msg.note)
        
        # Print message
        print(f"{msg}")
        
        # Print summary of seen controllers every 5 seconds
        if time.time() - start_time > 5:
            print("\n--- MIDI Controller Summary ---")
            print(f"CC Controllers detected: {sorted(list(seen_controllers))}")
            print(f"Notes detected: {sorted(list(note_controllers))}")
            print(f"Total controllers: {len(seen_controllers)}")
            print("------------------------------\n")
            start_time = time.time()

except KeyboardInterrupt:
    print("\n\nFinal Summary:")
    print(f"CC Controllers detected: {sorted(list(seen_controllers))}")
    print(f"Notes detected: {sorted(list(note_controllers))}")
    print(f"Total controllers: {len(seen_controllers)}")
    port.close()
    print("Stopped listening") 