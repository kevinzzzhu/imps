import React, { useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';

const BackgroundCanvas = styled.canvas`
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: -1;
    opacity: ${props => props.active ? 1 : 0};
    transition: opacity 1s ease-in-out;
`;

const CreativeBackground = ({ inputData, outputData, isModelRunning }) => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const particlesRef = useRef([]);
    const flowFieldRef = useRef([]);
    const prevInputDataRef = useRef(null); // To store previous inputData
    const prevOutputDataRef = useRef(null); // To store previous outputData
    const stateRef = useRef({
        energy: 0.5,
        harmony: 0.5,
        lastParticleSpawnTime: 0
    });
    
    // Enhanced color palettes with better colors
    const humanColorPalette = useRef([
        'rgba(52, 152, 219, 0.5)', // Blue
        'rgba(26, 188, 156, 0.5)', // Turquoise
        'rgba(46, 204, 113, 0.5)', // Green
        'rgba(155, 89, 182, 0.5)', // Purple
        'rgba(52, 73, 94, 0.5)',   // Dark Blue-Gray
        'rgba(22, 160, 133, 0.5)'  // Dark Cyan
    ]);
    
    const aiColorPalette = useRef([
        'rgba(231, 76, 60, 0.5)',  // Red
        'rgba(243, 156, 18, 0.5)', // Yellow
        'rgba(211, 84, 0, 0.5)',   // Orange
        'rgba(173, 68, 138, 0.5)', // Dark Purple
        'rgba(230, 126, 34, 0.5)', // Carrot Orange
        'rgba(231, 76, 60, 0.5)'   // Red
    ]);
    
    // Initialize particles with more variety
    const initParticles = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Create flow field grid
        const resolution = 20;
        const cols = Math.floor(width / resolution);
        const rows = Math.floor(height / resolution);
        
        // Initialize flow field with random angles
        flowFieldRef.current = new Array(cols * rows);
        for (let i = 0; i < flowFieldRef.current.length; i++) {
            flowFieldRef.current[i] = Math.random() * Math.PI * 2;
        }
        
        // Initialize particles with more properties
        particlesRef.current = [];
        const numParticles = 700; // More particles for richer visual
        
        for (let i = 0; i < numParticles; i++) {
            const isHuman = Math.random() > 0.5;
            const colorPalette = isHuman ? humanColorPalette.current : aiColorPalette.current;
            
            particlesRef.current.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 4 + 2,
                color: colorPalette[Math.floor(Math.random() * colorPalette.length)],
                speed: Math.random() * 1.5 + 0.5,
                speedMultiplier: 1,
                isHuman,
                history: [],
                pulsing: Math.random() > 0.6,
                pulseRate: Math.random() * 0.05 + 0.01,
                pulsePhase: Math.random() * Math.PI * 2,
                birthTime: Date.now(),
                lifespan: Math.random() * 10000 + 5000 // Particles have limited lifespans
            });
        }
    }, []);
    
    // Calculate data metrics for more dynamic visualization
    const calculateDataMetrics = useCallback((inputData, outputData) => {
        const validInputData = Array.isArray(inputData) ? inputData.filter(v => !isNaN(v)) : [];
        const validOutputData = Array.isArray(outputData) ? outputData.filter(v => !isNaN(v)) : [];
        
        // Default values if we don't have valid data
        let energy = 0.5;
        let harmony = 0.5;
        
        if (validInputData.length > 0 || validOutputData.length > 0) {
            // Calculate overall energy level from average input/output values
            const inputAvg = validInputData.length > 0 
                ? validInputData.reduce((sum, v) => sum + v, 0) / validInputData.length 
                : 0;
                
            const outputAvg = validOutputData.length > 0 
                ? validOutputData.reduce((sum, v) => sum + v, 0) / validOutputData.length 
                : 0;
                
            // If we have both, average them, otherwise use whichever we have
            if (validInputData.length > 0 && validOutputData.length > 0) {
                energy = (inputAvg + outputAvg) / 2;
            } else if (validInputData.length > 0) {
                energy = inputAvg;
            } else if (validOutputData.length > 0) {
                energy = outputAvg;
            }
            
            // Calculate harmony between input and output
            // Higher harmony when patterns are similar between input and output
            if (validInputData.length > 0 && validOutputData.length > 0) {
                const minLength = Math.min(validInputData.length, validOutputData.length);
                let similarity = 0;
                
                for (let i = 0; i < minLength; i++) {
                    similarity += 1 - Math.abs(validInputData[i] - validOutputData[i]);
                }
                
                harmony = similarity / minLength;
            }
        }
        
        // Ensure values are valid numbers and in the correct range
        energy = isNaN(energy) ? 0.5 : Math.max(0, Math.min(1, energy));
        harmony = isNaN(harmony) ? 0.5 : Math.max(0, Math.min(1, harmony));
        
        return { energy, harmony };
    }, []);
    
    // Update flow field based on input and output data, and whether they changed
    const updateFlowField = useCallback((currentInputData, currentOutputData, inputActuallyChanged, outputActuallyChanged) => {
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const width = canvas.width;
        const height = canvas.height;
        const resolution = 20;
        const cols = Math.floor(width / resolution);
        const rows = Math.floor(height / resolution);
        
        // Use logical viewport dimensions for positioning centers based on percentages
        const logicalWidth = window.innerWidth;
        const logicalHeight = window.innerHeight;
        
        // Use only the first 8 values for creating centers
        const activeInputData = Array.isArray(currentInputData) ? currentInputData.slice(0, Math.min(currentInputData.length, 8)) : [];
        const activeOutputData = Array.isArray(currentOutputData) ? currentOutputData.slice(0, Math.min(currentOutputData.length, 8)) : [];
        
        // Calculate metrics based on the *current* data, regardless of whether it changed this cycle,
        // as the overall energy/harmony might still be relevant for particle behavior if any centers are active.
        const metrics = calculateDataMetrics(activeInputData, activeOutputData) || { energy: 0.5, harmony: 0.5 };
        
        stateRef.current.energy = metrics.energy;
        stateRef.current.harmony = metrics.harmony;
        const energy = metrics.energy;

        const centers = [];
        let inputCenterCount = 0;
        if (inputActuallyChanged) { // Only create input centers if input data changed
            activeInputData.forEach((val, i) => {
                if (val > 0.2) {
                    centers.push({
                        x: Math.random() * logicalWidth * 0.4, 
                        y: Math.random() * logicalHeight,    
                        strength: val * 2,
                        isInput: true
                    });
                    inputCenterCount++;
                }
            });
        }
        
        let outputCenterCount = 0;
        if (outputActuallyChanged) { // Only create output centers if output data changed
            activeOutputData.forEach((val, i) => {
                if (val > 0.2) {
                    centers.push({
                        x: logicalWidth * 0.6 + Math.random() * logicalWidth * 0.4, 
                        y: Math.random() * logicalHeight,    
                        strength: val * 2,
                        isInput: false
                    });
                    outputCenterCount++;
                }
            });
        }

        // Map data to influence flow field
        // This part will now use the potentially fewer (or zero) centers
        for (let y_coord = 0; y_coord < rows; y_coord++) { // Renamed y to y_coord to avoid conflict
            for (let x_coord = 0; x_coord < cols; x_coord++) { // Renamed x to x_coord
                const index = y_coord * cols + x_coord;
                let angle = flowFieldRef.current[index];
                const px = x_coord * resolution;
                const py = y_coord * resolution;
                
                // Apply base pattern - changes based on harmony
                const patternScale = 0.05 * (1 - metrics.harmony);
                angle += Math.sin(x_coord * 0.05 + y_coord * 0.05) * patternScale;
                
                // Apply influence from each center
                centers.forEach(center => {
                    const dx = px - center.x;
                    const dy = py - center.y;
                    const distance = Math.sqrt(dx*dx + dy*dy);
                    const maxDistance = 300 * center.strength;
                    
                    if (distance < maxDistance) {
                        // Different pattern based on input/output
                        if (center.isInput) {
                            // Input creates spiral pattern
                            const targetAngle = Math.atan2(dy, dx) + Math.PI * (1 - distance/maxDistance);
                            angle = angle * 0.7 + targetAngle * 0.3;
                        } else {
                            // Output: Harmony interpolates between repel (high harmony) and attract (low harmony)
                            const targetAngle = Math.atan2(dy, dx) + Math.PI * (1 - distance/maxDistance);
                            angle = angle * 0.7 + targetAngle * 0.3;
                        }
                    }
                });
                
                // Add some noise based on harmony (less noise with higher harmony)
                angle += (Math.random() - 0.5) * 0.1 * (1 - metrics.harmony);
                
                flowFieldRef.current[index] = angle;
            }
        }
        
        // Update particle properties based on energy and harmony
        particlesRef.current.forEach(particle => {
            // Higher energy = faster particles
            particle.speedMultiplier = 0.5 + energy * 1.5;
            
            // Vary pulse rate with harmony
            if (particle.pulsing) {
                particle.pulseRate = 0.01 + (1 - metrics.harmony) * 0.1;
            }
        });
        
        // Spawn new particles only on significant data changes (active centers)
        const now = Date.now();
        const rawLastSpawnTime = stateRef.current.lastParticleSpawnTime;
        const currentLastSpawnTime = rawLastSpawnTime === undefined ? 0 : rawLastSpawnTime;
        const timeSinceLastSpawn = now - currentLastSpawnTime;
        
        // Only generate particles if there is active input/output (centers exist)
        // and enough time has passed since the last generation.
        if (timeSinceLastSpawn > 1000 && centers.length > 0) {
            // Create new particles around active centers
            const numNewParticles = Math.floor(energy * 20); // More energy = more particles
            
            for (let i = 0; i < numNewParticles; i++) {
                const center = centers[Math.floor(Math.random() * centers.length)];
                const isHuman = center.isInput;
                const colorPalette = isHuman ? humanColorPalette.current : aiColorPalette.current;
                
                particlesRef.current.push({
                    x: center.x + (Math.random() - 0.5) * 100,
                    y: center.y + (Math.random() - 0.5) * 100,
                    size: Math.random() * 4 + 3,
                    color: colorPalette[Math.floor(Math.random() * colorPalette.length)],
                    speed: Math.random() * 2 + 1,
                    speedMultiplier: 1.5,
                    isHuman,
                    history: [],
                    pulsing: true,
                    pulseRate: Math.random() * 0.1 + 0.05,
                    pulsePhase: Math.random() * Math.PI * 2,
                    birthTime: now,
                    lifespan: Math.random() * 5000 + 3000
                });
            }
            
            stateRef.current.lastParticleSpawnTime = now;
        }
    }, [calculateDataMetrics]);
    
    // Animation loop with enhanced visuals
    const animate = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const resolution = 20;
        const cols = Math.floor(width / resolution);
        const rows = Math.floor(height / resolution);
        
        // Get current metrics with safe defaults
        const { energy = 0.5, harmony = 0.5 } = stateRef.current || {};
        
        // Re-introduce semi-transparent background for trail fade effect
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'; // Adjust alpha for desired fade speed
        ctx.fillRect(0, 0, width, height);
        
        // Current time for animations
        const now = Date.now();
        
        // Safety check for particles array
        if (!Array.isArray(particlesRef.current)) {
            particlesRef.current = [];
            requestAnimationFrame(animate);
            return;
        }
        
        // Update and draw particles with enhanced effects
        particlesRef.current = particlesRef.current.filter(particle => {
            // Skip invalid particles
            if (!particle) return false;
            
            // Remove particles that exceed their lifespan
            if (now - particle.birthTime > particle.lifespan) {
                return false;
            }
            
            // Find the flow field cell the particle is in
            const x = Math.floor(particle.x / resolution);
            const y = Math.floor(particle.y / resolution);
            const index = y * cols + x;
            
            // Check if the index is valid
            if (index >= 0 && index < flowFieldRef.current.length) {
                // Get the angle from the flow field
                const angle = flowFieldRef.current[index];
                
                // Calculate effective speed based on energy
                const effectiveSpeed = particle.speed * particle.speedMultiplier;
                
                // Move particle based on the angle
                particle.x += Math.cos(angle) * effectiveSpeed;
                particle.y += Math.sin(angle) * effectiveSpeed;
                
                // Store position history with timestamp
                particle.history.push({ x: particle.x, y: particle.y, time: now });
                
                // Time-based pruning for history - keep only last 5 seconds
                particle.history = particle.history.filter(point => (now - point.time) <= 10000);
                
                // Calculate age-based opacity for the particle itself (not trail, trail fades via fillRect)
                let ageOpacity = 1;
                const age = now - particle.birthTime;
                const fadeInTime = 300;
                const fadeOutTime = 1000;
                
                // Fade in and out
                if (age < fadeInTime) {
                    ageOpacity = age / fadeInTime;
                } else if (age > particle.lifespan - fadeOutTime) {
                    ageOpacity = (particle.lifespan - age) / fadeOutTime;
                }
                
                // Add pulsing effect
                let pulseOpacity = 1;
                if (particle.pulsing) {
                    pulseOpacity = 0.7 + 0.3 * Math.sin(age * particle.pulseRate + particle.pulsePhase);
                }
                
                // Draw the particle trail with gradient
                if (particle.history.length > 1) {
                    // Create smooth or angular curves based on harmony
                    ctx.beginPath();
                    
                    try {
                        if (particle.isHuman && particle.history.length > 3) {
                            // Smooth curves for high harmony (now specifically for Human particles)
                            ctx.moveTo(particle.history[0].x, particle.history[0].y);
                            
                            for (let i = 1; i < particle.history.length - 2; i++) {
                                if (!particle.history[i] || !particle.history[i+1]) continue;
                                
                                const xc = (particle.history[i].x + particle.history[i+1].x) / 2;
                                const yc = (particle.history[i].y + particle.history[i+1].y) / 2;
                                ctx.quadraticCurveTo(
                                    particle.history[i].x, 
                                    particle.history[i].y, 
                                    xc, 
                                    yc
                                );
                            }
                            
                            // Connect to last point
                            const lastIdx = particle.history.length - 1;
                            const prevIdx = particle.history.length - 2;
                            
                            if (particle.history[prevIdx] && particle.history[lastIdx]) {
                                ctx.quadraticCurveTo(
                                    particle.history[prevIdx].x,
                                    particle.history[prevIdx].y,
                                    particle.history[lastIdx].x,
                                    particle.history[lastIdx].y
                                );
                            }
                        } else {
                            // Simple line segments for low harmony (now for AI particles or short Human trails)
                            ctx.moveTo(particle.history[0].x, particle.history[0].y);
                            for (let i = 1; i < particle.history.length; i++) {
                                if (!particle.history[i]) continue;
                                ctx.lineTo(particle.history[i].x, particle.history[i].y);
                            }
                        }
                    } catch (err) {
                        // Reset history if we encounter an error
                        particle.history = [];
                        return true; // Keep the particle but reset its history
                    }
                    
                    // Parse the color to add gradient with transparency
                    const colorMatch = particle.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
                    if (colorMatch) {
                        const r = parseInt(colorMatch[1]);
                        const g = parseInt(colorMatch[2]);
                        const b = parseInt(colorMatch[3]);
                        
                        // Fade out from tail to head
                        const opacity = ageOpacity * pulseOpacity;
                        ctx.strokeStyle = `rgba(${r},${g},${b},${opacity * 0.6})`;
                    } else {
                        ctx.strokeStyle = particle.color;
                    }
                    
                    ctx.lineWidth = particle.size * 0.6 * (0.5 + energy * 0.5);
                    ctx.stroke();
                    
                    // Draw particle with optional glow based on energy
                    ctx.beginPath();
                    const particleRenderSize = particle.size * (0.7 + energy * 0.5);
                    if (particle.isHuman) {
                        ctx.arc(particle.x, particle.y, particleRenderSize, 0, Math.PI * 2);
                    } else {
                        // AI particles as squares
                        const sideLength = particleRenderSize * 2; // Make side length diameter of equivalent circle
                        ctx.rect(particle.x - particleRenderSize, particle.y - particleRenderSize, sideLength, sideLength);
                    }
                    
                    // Add glow for high energy particles
                    if (energy > 0.7 && particle.size > 2) {
                        ctx.shadowBlur = 5;
                        ctx.shadowColor = particle.color;
                    }
                    
                    if (colorMatch) {
                        const r = parseInt(colorMatch[1]);
                        const g = parseInt(colorMatch[2]);
                        const b = parseInt(colorMatch[3]);
                        const opacity = ageOpacity * pulseOpacity;
                        ctx.fillStyle = `rgba(${r},${g},${b},${opacity})`;
                    } else {
                        ctx.fillStyle = particle.color;
                    }
                    
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
                
                // Reset if out of bounds and clear history to prevent line artifacts
                if (particle.x < 0) {
                    particle.x = width;
                    particle.history = []; // Clear history on wrap
                }
                if (particle.x > width) {
                    particle.x = 0;
                    particle.history = []; // Clear history on wrap
                }
                if (particle.y < 0) {
                    particle.y = height;
                    particle.history = []; // Clear history on wrap
                }
                if (particle.y > height) {
                    particle.y = 0;
                    particle.history = []; // Clear history on wrap
                }
            }
            
            return true;
        });
        
        // Continue animation only if model is running
        if (isModelRunning) {
            animationRef.current = requestAnimationFrame(animate);
        }
    }, [isModelRunning]);
    
    // Setup effect - start or stop animation based on isModelRunning
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        // Set canvas dimensions to fill the viewport
        const setupCanvas = () => {
            try {
                // Use devicePixelRatio for better quality on high-DPI screens
                const dpr = window.devicePixelRatio || 1;
                canvas.width = window.innerWidth * dpr;
                canvas.height = window.innerHeight * dpr;
                
                // Scale context to maintain correct dimensions
                const ctx = canvas.getContext('2d');
                if (!ctx) return; // Exit if we can't get context
                
                ctx.scale(dpr, dpr);
                
                // Clear the canvas when not running
                if (!isModelRunning) {
                    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
                } else {
                    // Initialize particles when starting
                    particlesRef.current = []; // Reset particles
                    initParticles();
                    // Fill with black to start fresh
                    ctx.fillStyle = 'black';
                    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
                }
            } catch (error) {
                console.error("Error setting up canvas:", error);
            }
        };
        
        // Call setupCanvas immediately
        setupCanvas();
        
        // Add resize listener
        window.addEventListener('resize', setupCanvas);
        
        // Start animation only when model is running
        if (isModelRunning) {
            animationRef.current = requestAnimationFrame(animate);
        } else if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
        }
        
        // Cleanup function
        return () => {
            window.removeEventListener('resize', setupCanvas);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [animate, initParticles, isModelRunning]);
    
    // Update effect when input or output data changes
    useEffect(() => {
        if (isModelRunning) {
            const inputChanged = areArraysDifferent(inputData, prevInputDataRef.current);
            const outputChanged = areArraysDifferent(outputData, prevOutputDataRef.current);

            if (inputChanged || outputChanged) {
                updateFlowField(inputData, outputData, inputChanged, outputChanged);
                
                prevInputDataRef.current = Array.isArray(inputData) ? [...inputData] : inputData;
                prevOutputDataRef.current = Array.isArray(outputData) ? [...outputData] : outputData;
            }
        } else {
            prevInputDataRef.current = null;
            prevOutputDataRef.current = null;
        }
    }, [inputData, outputData, isModelRunning, updateFlowField]);
    
    return <BackgroundCanvas ref={canvasRef} active={isModelRunning} />;
};

// Helper function to compare arrays (can be outside the component or memoized if preferred)
const areArraysDifferent = (arr1, arr2) => {
    if (!arr1 && !arr2) return false; // Both null/undefined
    if (!arr1 || !arr2) return true;  // One is null/undefined, the other isn't
    if (arr1.length !== arr2.length) return true;

    for (let i = 0; i < arr1.length; i++) {
        // Assuming values are numbers or simple types that can be compared with ===
        // For floating point numbers, a threshold comparison might be more robust
        // but for this visualization, direct comparison is likely fine.
        if (arr1[i] !== arr2[i]) {
            return true;
        }
    }
    return false;
};

export default CreativeBackground; 