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
    const stateRef = useRef({
        energy: 0.5,
        harmony: 0.5,
        lastUpdate: Date.now()
    });
    
    // Enhanced color palettes with better colors
    const humanColorPalette = useRef([
        'rgba(52, 152, 219, 0.7)', // Blue
        'rgba(26, 188, 156, 0.7)', // Turquoise
        'rgba(46, 204, 113, 0.7)', // Green
        'rgba(155, 89, 182, 0.7)', // Purple
        'rgba(52, 73, 94, 0.7)',   // Dark Blue-Gray
        'rgba(22, 160, 133, 0.7)'  // Dark Cyan
    ]);
    
    const aiColorPalette = useRef([
        'rgba(231, 76, 60, 0.7)',  // Red
        'rgba(243, 156, 18, 0.7)', // Yellow
        'rgba(211, 84, 0, 0.7)',   // Orange
        'rgba(142, 68, 173, 0.7)', // Dark Purple
        'rgba(230, 126, 34, 0.7)', // Carrot Orange
        'rgba(231, 76, 60, 0.7)'   // Red
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
                size: Math.random() * 3 + 1,
                color: colorPalette[Math.floor(Math.random() * colorPalette.length)],
                speed: Math.random() * 1.5 + 0.5,
                speedMultiplier: 1,
                isHuman,
                history: [],
                historyLength: Math.floor(Math.random() * 10) + 5, // Varied trail lengths
                pulsing: Math.random() > 0.6, // Some particles will pulse
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
        
        // Update state
        stateRef.current = {
            energy,
            harmony,
            lastUpdate: Date.now()
        };
        
        return { energy, harmony };
    }, []);
    
    // Update flow field based on input and output data
    const updateFlowField = useCallback((inputData, outputData) => {
        if (!canvasRef.current) return;
        
        const canvas = canvasRef.current;
        const width = canvas.width;
        const height = canvas.height;
        const resolution = 20;
        const cols = Math.floor(width / resolution);
        const rows = Math.floor(height / resolution);
        
        // Get more values from input and output
        const validInputData = Array.isArray(inputData) ? inputData.slice(0, Math.min(inputData.length, 8)) : [];
        const validOutputData = Array.isArray(outputData) ? outputData.slice(0, Math.min(outputData.length, 8)) : [];
        
        // Calculate metrics for more dynamic behavior - use safe defaults if calculation fails
        const metrics = calculateDataMetrics(validInputData, validOutputData) || { energy: 0.5, harmony: 0.5 };
        const { energy, harmony } = metrics;
        
        // Create centers of influence from active input/output values
        const centers = [];
        validInputData.forEach((val, i) => {
            if (val > 0.2) {
                centers.push({
                    x: width * (0.2 + (i / validInputData.length) * 0.6),
                    y: height * 0.3,
                    strength: val * 2,
                    isInput: true
                });
            }
        });
        
        validOutputData.forEach((val, i) => {
            if (val > 0.2) {
                centers.push({
                    x: width * (0.2 + (i / validOutputData.length) * 0.6), 
                    y: height * 0.7,
                    strength: val * 2,
                    isInput: false
                });
            }
        });
        
        // Map data to influence flow field
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const index = y * cols + x;
                let angle = flowFieldRef.current[index];
                const px = x * resolution;
                const py = y * resolution;
                
                // Apply base pattern - changes based on harmony
                const patternScale = 0.05 * (1 - harmony);
                angle += Math.sin(x * 0.05 + y * 0.05) * patternScale;
                
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
                            // Output creates outward/inward flow
                            const targetAngle = Math.atan2(dy, dx) + (harmony > 0.5 ? 0 : Math.PI);
                            angle = angle * 0.7 + targetAngle * 0.3;
                        }
                    }
                });
                
                // Add some noise based on harmony (less noise with higher harmony)
                angle += (Math.random() - 0.5) * 0.1 * (1 - harmony);
                
                flowFieldRef.current[index] = angle;
            }
        }
        
        // Update particle properties based on energy and harmony
        particlesRef.current.forEach(particle => {
            // Higher energy = faster particles
            particle.speedMultiplier = 0.5 + energy * 1.5;
            
            // Higher harmony = longer trails
            particle.historyLength = Math.floor(3 + harmony * 20);
            
            // Vary pulse rate with harmony
            if (particle.pulsing) {
                particle.pulseRate = 0.01 + (1 - harmony) * 0.1;
            }
        });
        
        // Ensure we have a minimum number of particles at all times
        const minParticles = 300;
        if (particlesRef.current.length < minParticles) {
            const particlesToAdd = minParticles - particlesRef.current.length;
            addRandomParticles(particlesToAdd, width, height);
        }
        
        // Spawn new particles on significant data changes 
        const now = Date.now();
        const timeSinceLastUpdate = now - stateRef.current.lastUpdate;
        
        // Always create some particles periodically regardless of centers
        if (timeSinceLastUpdate > 1000) {
            // Add a small number of regular particles to keep the system alive
            const maintenanceParticles = 10 + Math.floor(Math.random() * 10);
            addRandomParticles(maintenanceParticles, width, height);
            
            if (centers.length > 0) {
                // Create new particles around active centers
                const numNewParticles = Math.floor(energy * 20); // More energy = more particles
                
                for (let i = 0; i < numNewParticles; i++) {
                    const center = centers[Math.floor(Math.random() * centers.length)];
                    const isHuman = center.isInput;
                    const colorPalette = isHuman ? humanColorPalette.current : aiColorPalette.current;
                    
                    particlesRef.current.push({
                        x: center.x + (Math.random() - 0.5) * 100,
                        y: center.y + (Math.random() - 0.5) * 100,
                        size: Math.random() * 3 + 2,
                        color: colorPalette[Math.floor(Math.random() * colorPalette.length)],
                        speed: Math.random() * 2 + 1,
                        speedMultiplier: 1.5,
                        isHuman,
                        history: [],
                        historyLength: Math.floor(Math.random() * 10) + 10,
                        pulsing: true,
                        pulseRate: Math.random() * 0.1 + 0.05,
                        pulsePhase: Math.random() * Math.PI * 2,
                        birthTime: now,
                        lifespan: Math.random() * 5000 + 3000
                    });
                }
            }
            
            stateRef.current.lastUpdate = now;
        }
    }, [calculateDataMetrics]);
    
    // Helper function to add random particles
    const addRandomParticles = useCallback((count, width, height) => {
        if (!width || !height) return;
        
        for (let i = 0; i < count; i++) {
            const isHuman = Math.random() > 0.5;
            const colorPalette = isHuman ? humanColorPalette.current : aiColorPalette.current;
            const now = Date.now();
            
            particlesRef.current.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 3 + 1,
                color: colorPalette[Math.floor(Math.random() * colorPalette.length)],
                speed: Math.random() * 1.5 + 0.5,
                speedMultiplier: 1,
                isHuman,
                history: [],
                historyLength: Math.floor(Math.random() * 10) + 5,
                pulsing: Math.random() > 0.6,
                pulseRate: Math.random() * 0.05 + 0.01,
                pulsePhase: Math.random() * Math.PI * 2,
                birthTime: now,
                lifespan: Math.random() * 8000 + 7000 // Longer lifespan for general particles
            });
        }
    }, []);
    
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
        
        // Semi-transparent background for trail effect - varies with energy
        ctx.fillStyle = `rgba(0, 0, 0, ${0.02 + (1-energy) * 0.03})`;
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
                
                // Store position history with length based on harmony
                particle.history.push({ x: particle.x, y: particle.y });
                if (particle.history.length > particle.historyLength) {
                    particle.history.shift();
                }
                
                // Calculate age-based opacity
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
                        if (harmony > 0.6 && particle.history.length > 3) {
                            // Smooth curves for high harmony
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
                            // Simple line segments for low harmony
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
                    ctx.arc(particle.x, particle.y, particle.size * (0.7 + energy * 0.5), 0, Math.PI * 2);
                    
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
                
                // Reset if out of bounds
                if (particle.x < 0) particle.x = width;
                if (particle.x > width) particle.x = 0;
                if (particle.y < 0) particle.y = height;
                if (particle.y > height) particle.y = 0;
            }
            
            return true;
        });
        
        // Check if we need to replenish particles
        if (particlesRef.current.length < 100) {
            // Emergency replenishment if too few particles remain
            addRandomParticles(200, width, height);
        }
        
        // Continue animation only if model is running
        if (isModelRunning) {
            animationRef.current = requestAnimationFrame(animate);
        }
    }, [isModelRunning, addRandomParticles]);
    
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
    
    // Update effect when input or output data changes, but only if running
    useEffect(() => {
        if (isModelRunning) {
            updateFlowField(inputData, outputData);
        }
    }, [inputData, outputData, updateFlowField, isModelRunning]);
    
    return <BackgroundCanvas ref={canvasRef} active={isModelRunning} />;
};

export default CreativeBackground; 