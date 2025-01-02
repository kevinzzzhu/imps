import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import styled from 'styled-components';

const GraphContainer = styled.div`
    position: relative;
    width: 800px;
    margin: 20px auto;
`;

const StyledSVG = styled.svg`
    background: #fff;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const Controls = styled.div`
    margin: 10px 0;
    padding: 10px;
    background: #f5f5f5;
    border-radius: 4px;
    
    label {
        margin: 0 10px;
    }
    
    input {
        margin: 0 5px;
        width: 100px;
    }
`;

const OscillationGraph = ({ data }) => {
    const svgRef = useRef();
    const [frequency, setFrequency] = useState(1);
    const [amplitude, setAmplitude] = useState(1);
    const [damping, setDamping] = useState(0.2);
    const [isAnimating, setIsAnimating] = useState(true);

    useEffect(() => {
        // Clear previous graph
        d3.select(svgRef.current).selectAll("*").remove();

        const margin = { top: 40, right: 20, bottom: 40, left: 40 };
        const width = 800 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        const svg = d3.select(svgRef.current)
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Create scales
        const xScale = d3.scaleLinear()
            .domain([0, 2 * Math.PI])
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain([-1.5, 1.5])
            .range([height, 0]);

        // Create axes
        const xAxis = d3.axisBottom(xScale)
            .ticks(10)
            .tickFormat(d => `${(d / Math.PI).toFixed(1)}π`);

        const yAxis = d3.axisLeft(yScale)
            .ticks(10);

        // Add axes
        svg.append('g')
            .attr('transform', `translate(0,${height/2})`)
            .call(xAxis);

        svg.append('g')
            .call(yAxis);

        // Create line generator
        const line = d3.line()
            .x(d => xScale(d.x))
            .y(d => yScale(d.y))
            .curve(d3.curveBasis);

        let phase = 0;

        // Generate wave data with parameters
        function generateWaveData() {
            const points = [];
            const numPoints = Math.floor(2 * Math.PI * 10); // Number of points to match data array size
            
            if (data && Array.isArray(data)) {
                // Use input data if available
                for (let i = 0; i < data.length; i++) {
                    points.push({
                        x: (i / data.length) * 2 * Math.PI,
                        y: data[i]
                    });
                }
            } else {
                // Generate sine wave if no data
                for (let x = 0; x <= 2 * Math.PI; x += 0.1) {
                    points.push({
                        x: x,
                        y: amplitude * Math.sin(frequency * x + phase)
                    });
                }
            }
            return points;
        }

        // Add wave paths
        const wavePath = svg.append('path')
            .attr('class', 'wave')
            .attr('fill', 'none')
            .attr('stroke', '#2196F3')
            .attr('stroke-width', 2);

        const dampedWavePath = svg.append('path')
            .attr('class', 'damped-wave')
            .attr('fill', 'none')
            .attr('stroke', '#FF4081')
            .attr('stroke-width', 2);

        // Add title
        svg.append('text')
            .attr('x', width/2)
            .attr('y', -margin.top/2)
            .attr('text-anchor', 'middle')
            .style('font-size', '16px')
            .text('Oscillation Visualization');

        // Animation function
        function animate() {
            if (!isAnimating) return;

            // Only animate phase if no input data
            if (!data || !Array.isArray(data)) {
                phase += 0.05;
            }

            const waveData = generateWaveData();
            const dampedWaveData = waveData.map(d => ({
                x: d.x,
                y: d.y * Math.exp(-d.x * damping)
            }));

            wavePath.attr('d', line(waveData));
            dampedWavePath.attr('d', line(dampedWaveData));

            requestAnimationFrame(animate);
        }

        // Add legend
        const legend = svg.append('g')
            .attr('transform', `translate(${width - 120}, 20)`);

        legend.append('line')
            .attr('x1', 0)
            .attr('x2', 20)
            .attr('y1', 0)
            .attr('y2', 0)
            .attr('stroke', '#2196F3')
            .attr('stroke-width', 2);

        legend.append('line')
            .attr('x1', 0)
            .attr('x2', 20)
            .attr('y1', 20)
            .attr('y2', 20)
            .attr('stroke', '#FF4081')
            .attr('stroke-width', 2);

        legend.append('text')
            .attr('x', 25)
            .attr('y', 5)
            .text('Original Wave');

        legend.append('text')
            .attr('x', 25)
            .attr('y', 25)
            .text('Damped Wave');

        // Start animation
        if (isAnimating) {
            animate();
        }

        return () => {
            setIsAnimating(false);
        };
    }, [data, frequency, amplitude, damping, isAnimating]);

    return (
        <GraphContainer>
            <Controls>
                <label>
                    Frequency:
                    <input 
                        type="range" 
                        min="0.1" 
                        max="5" 
                        step="0.1" 
                        value={frequency}
                        onChange={(e) => setFrequency(parseFloat(e.target.value))}
                    />
                    {frequency.toFixed(1)}
                </label>
                <label>
                    Amplitude:
                    <input 
                        type="range" 
                        min="0.1" 
                        max="1.5" 
                        step="0.1" 
                        value={amplitude}
                        onChange={(e) => setAmplitude(parseFloat(e.target.value))}
                    />
                    {amplitude.toFixed(1)}
                </label>
                <label>
                    Damping:
                    <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.05" 
                        value={damping}
                        onChange={(e) => setDamping(parseFloat(e.target.value))}
                    />
                    {damping.toFixed(2)}
                </label>
                <button onClick={() => setIsAnimating(!isAnimating)}>
                    {isAnimating ? 'Pause' : 'Play'}
                </button>
            </Controls>
            <StyledSVG ref={svgRef}></StyledSVG>
        </GraphContainer>
    );
};

export default OscillationGraph; 