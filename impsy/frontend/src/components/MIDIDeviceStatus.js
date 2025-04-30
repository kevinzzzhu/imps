import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import RefreshIcon from '@mui/icons-material/Refresh';
import IconButton from '@mui/material/IconButton';
import styled from 'styled-components';

const StatusContainer = styled(Box)`
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 10px 15px;
  border-radius: 8px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  display: flex;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
  transition: all 0.3s ease;
  max-width: 320px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  opacity: ${props => props.isHidden ? 0 : 1};
  transform: ${props => props.isHidden ? 'translateY(100px)' : 'translateY(0)'};
  pointer-events: ${props => props.isHidden ? 'none' : 'auto'};
`;

const MIDIDeviceStatus = ({ isHidden = false }) => {
  const [midiInfo, setMidiInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [webMidiAccess, setWebMidiAccess] = useState(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Use refs to store previous values for comparison
  const prevInputDevicesRef = useRef([]);
  const prevOutputDevicesRef = useRef([]);
  const prevCurrentInDeviceRef = useRef('');
  const prevCurrentOutDeviceRef = useRef('');
  const midiInfoRef = useRef(null);
  
  // Keep ref updated with current state value
  useEffect(() => {
    midiInfoRef.current = midiInfo;
  }, [midiInfo]);
  
  // Function to request Web MIDI API permission
  const requestMIDIPermission = async () => {
    try {
      if (navigator.requestMIDIAccess) {
        const midiAccess = await navigator.requestMIDIAccess();
        setWebMidiAccess(midiAccess);
        setHasPermission(true);
      } else {
        setError("Web MIDI API not supported in this browser");
        setHasPermission(false);
      }
    } catch (err) {
      console.error("MIDI Access Error:", err);
      setError(err.message);
      setHasPermission(false);
    }
  };

  // Function to check if MIDI devices have changed
  const haveDevicesChanged = useCallback((newData) => {
    // Check if input devices have changed
    const inputsChanged = 
      JSON.stringify(newData.input_devices) !== JSON.stringify(prevInputDevicesRef.current);
    
    // Check if output devices have changed
    const outputsChanged = 
      JSON.stringify(newData.output_devices) !== JSON.stringify(prevOutputDevicesRef.current);
    
    // Check if current devices have changed
    const currentInChanged = newData.current_in_device !== prevCurrentInDeviceRef.current;
    const currentOutChanged = newData.current_out_device !== prevCurrentOutDeviceRef.current;
    
    return inputsChanged || outputsChanged || currentInChanged || currentOutChanged;
  }, []);

  // Fetch MIDI device information from backend
  const fetchMIDIDevices = useCallback(async () => {
    try {
      setIsRefreshing(true);
      
      // Only show loading indicator on initial load
      if (!midiInfoRef.current) {
        setLoading(true);
      }
      
      const response = await fetch('/api/midi-devices');
      const data = await response.json();
      
      // Only update state if devices have changed or explicitly refreshing
      if (!midiInfoRef.current || haveDevicesChanged(data)) {
        setMidiInfo(data);
        
        // Update refs for future comparison
        prevInputDevicesRef.current = data.input_devices;
        prevOutputDevicesRef.current = data.output_devices;
        prevCurrentInDeviceRef.current = data.current_in_device;
        prevCurrentOutDeviceRef.current = data.current_out_device;
      }
      
      // If Web MIDI API is available, try to get access
      if (navigator.requestMIDIAccess && !webMidiAccess) {
        try {
          const midiAccess = await navigator.requestMIDIAccess({ sysex: false });
          setWebMidiAccess(midiAccess);
          setHasPermission(true);
        } catch (err) {
          console.log("MIDI permission not granted yet:", err);
          setHasPermission(false);
        }
      }
      
      setLoading(false);
      setIsRefreshing(false);
    } catch (error) {
      setError("Failed to fetch MIDI devices");
      setLoading(false);
      setIsRefreshing(false);
      setHasPermission(false);
    }
  }, [haveDevicesChanged, webMidiAccess]);

  // Fetch MIDI devices once on component mount
  useEffect(() => {
    fetchMIDIDevices();
    // No interval setup - only fetch once on mount
  }, [fetchMIDIDevices]);

  const handleRefresh = () => {
    fetchMIDIDevices();
  };

  if (loading) {
    return (
      <StatusContainer isHidden={isHidden}>
        <CircularProgress size={20} sx={{ mr: 1, color: 'white' }} />
        <Typography variant="body2">Loading MIDI devices...</Typography>
      </StatusContainer>
    );
  }

  if (error) {
    return (
      <StatusContainer isHidden={isHidden}>
        <Typography variant="body2" color="error">Error: {error}</Typography>
        <IconButton 
          size="small" 
          onClick={handleRefresh}
          sx={{ ml: 1, color: 'white' }}
        >
          <RefreshIcon fontSize="small" />
        </IconButton>
      </StatusContainer>
    );
  }

  // Show permission request UI
  if (hasPermission === false && midiInfo?.needs_permission) {
    return (
      <StatusContainer isHidden={isHidden}>
        <MusicNoteIcon sx={{ mr: 1 }} />
        <Box>
          <Typography variant="body2">Permission needed to detect MIDI devices</Typography>
          <Button 
            variant="outlined" 
            size="small" 
            sx={{ mt: 1, color: 'white', borderColor: 'white' }}
            onClick={requestMIDIPermission}
          >
            Allow Access
          </Button>
        </Box>
        <IconButton 
          size="small" 
          onClick={handleRefresh}
          sx={{ ml: 1, color: 'white' }}
        >
          <RefreshIcon fontSize="small" />
        </IconButton>
      </StatusContainer>
    );
  }

  // Show connected device info
  if (midiInfo) {
    const deviceName = midiInfo.current_in_device || "No device connected";
    return (
      <StatusContainer isHidden={isHidden}>
        <MusicNoteIcon sx={{ mr: 1 }} />
        <Typography variant="body2">
          Connected: {deviceName}
        </Typography>
        <IconButton 
          size="small" 
          onClick={handleRefresh}
          sx={{ ml: 1, color: 'white' }}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <CircularProgress size={16} sx={{ color: 'white' }} />
          ) : (
            <RefreshIcon fontSize="small" />
          )}
        </IconButton>
      </StatusContainer>
    );
  }

  return null;
};

export default MIDIDeviceStatus; 