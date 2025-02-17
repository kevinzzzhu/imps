import React, { useEffect, useRef } from 'react';
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

const SplomGraph = ({ data }) => {
    const svgRef = useRef();

    useEffect(() => {
        if (!data || !data.samples || data.samples.length === 0) return;

        // Clear previous graph
        d3.select(svgRef.current).selectAll("*").remove();

        // Set dimensions
        const size = 150;
        const padding = 80;
        const margin = { 
            top: 70,
            right: 60,
            bottom: 60,
            left: 80
        };
        
        // Only show lower triangle of the matrix to avoid redundancy
        const width = size * data.dimension + padding * (data.dimension - 1) + margin.left + margin.right;
        const height = width;

        // Create SVG
        const svg = d3.select(svgRef.current)
            .attr('width', width)
            .attr('height', height)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Create scales for each dimension
        const scales = [];
        for (let i = 0; i < data.dimension; i++) {
            scales.push(d3.scaleLinear()
                .domain([0, 1])
                .range([0, size]));
        }

        // Create color scale for time-based coloring
        const timeExtent = d3.extent(data.samples, d => d.timestamp);
        const colorScale = d3.scaleSequential(d3.interpolateViridis)
            .domain(timeExtent);

        // Add title to explain the visualization
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', -45)
            .attr('text-anchor', 'middle')
            .attr('font-size', '16px')
            .attr('font-weight', 'bold')
            .text('Parameter Correlation Matrix');

        // Add explanation text
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', -25)
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .attr('fill', '#666')
            .text('Each plot shows correlation between two parameters.');

        // Create cells only for lower triangle
        for (let i = 0; i < data.dimension; i++) {
            for (let j = 0; j <= i; j++) {
                const cell = svg.append('g')
                    .attr('transform', `translate(${j * (size + padding)},${i * (size + padding)})`);

                // Add background
                cell.append('rect')
                    .attr('width', size)
                    .attr('height', size)
                    .attr('fill', '#f8f8f8')
                    .attr('stroke', '#ddd');

                // Add grid lines
                const gridLines = [0.25, 0.5, 0.75];
                gridLines.forEach(line => {
                    cell.append('line')
                        .attr('x1', 0)
                        .attr('x2', size)
                        .attr('y1', size * (1 - line))
                        .attr('y2', size * (1 - line))
                        .attr('stroke', '#ddd')
                        .attr('stroke-dasharray', '2,2');

                    cell.append('line')
                        .attr('x1', size * line)
                        .attr('x2', size * line)
                        .attr('y1', 0)
                        .attr('y2', size)
                        .attr('stroke', '#ddd')
                        .attr('stroke-dasharray', '2,2');
                });

                // Add scatter plot points
                cell.selectAll('circle')
                    .data(data.samples)
                    .join('circle')
                    .attr('cx', d => scales[j](d.values[j]))
                    .attr('cy', d => size - scales[i](d.values[i]))
                    .attr('r', 3)
                    .attr('fill', d => colorScale(d.timestamp))
                    .attr('opacity', 0.6)
                    .on('mouseover', function(event, d) {
                        d3.select(this)
                            .attr('r', 6)
                            .attr('opacity', 1);
                        
                        tooltip
                            .style('visibility', 'visible')
                            .html(`
                                <strong>Time: ${d.timestamp.toLocaleTimeString()}</strong><br/>
                                Parameter ${j + 1}: ${d.values[j].toFixed(3)}<br/>
                                Parameter ${i + 1}: ${d.values[i].toFixed(3)}
                            `)
                            .style('left', `${event.offsetX + 150 / 4}px`)
                            .style('top', `${event.offsetY - 150 / 2}px`);

                        // Highlight corresponding points
                        svg.selectAll('circle')
                            .filter(pd => pd === d)
                            .attr('r', 6)
                            .attr('opacity', 1);
                    })
                    .on('mouseout', function() {
                        svg.selectAll('circle')
                            .attr('r', 3)
                            .attr('opacity', 0.6);
                        tooltip.style('visibility', 'hidden');
                    });

                // Add axes
                if (i === data.dimension - 1) {
                    cell.append('g')
                        .attr('transform', `translate(0,${size})`)
                        .call(d3.axisBottom(scales[j]).ticks(5));
                }
                if (j === 0) {
                    cell.append('g')
                        .call(d3.axisLeft(scales[i]).ticks(5));
                }

                // Add labels
                if (i === data.dimension - 1) {
                    cell.append('text')
                        .attr('x', size / 2)
                        .attr('y', size + 40)
                        .attr('text-anchor', 'middle')
                        .attr('font-size', '11px')
                        // .text(`Parameter ${j + 1}`);
                }
                if (j === 0) {
                    cell.append('text')
                        .attr('transform', 'rotate(-90)')
                        .attr('x', -size / 2)
                        .attr('y', -50)
                        .attr('text-anchor', 'middle')
                        .attr('font-size', '11px')
                        .text(`Parameter ${i + 1}`);
                }

                // Add plot description
                cell.append('text')
                    .attr('x', size / 2)
                    .attr('y', -15)
                    .attr('text-anchor', 'middle')
                    .attr('font-size', '11px')
                    .attr('fill', '#666')
                    .text(() => {
                        if (i === j) {
                            return `Distribution of Parameter ${i + 1}`;
                        } else {
                            return `P${j + 1} vs P${i + 1} Correlation`;
                        }
                    });

                // Add axis labels with units
                if (i === data.dimension - 1) {
                    cell.append('text')
                        .attr('x', size / 2)
                        .attr('y', size + 40)
                        .attr('text-anchor', 'middle')
                        .attr('font-size', '11px')
                        .attr('dy', '1em')
                        .html(`Parameter ${j + 1} (0-1 normalized)`);
                }
                if (j === 0) {
                    cell.append('text')
                        .attr('transform', 'rotate(-90)')
                        .attr('x', -size / 2)
                        .attr('y', -50)
                        .attr('text-anchor', 'middle')
                        .attr('font-size', '11px')
                        // .html(`Parameter ${i + 1} (0-1 normalized)`);
                }
            }
        }

        // Add color legend for time
        const legendWidth = 200;
        const legendHeight = 20;
        
        const legendScale = d3.scaleTime()
            .domain(timeExtent)
            .range([0, legendWidth]);

        const legend = svg.append('g')
            .attr('transform', `translate(${width - legendWidth - margin.right},${margin.top})`);

        // Create gradient
        const gradient = legend.append('defs')
            .append('linearGradient')
            .attr('id', 'time-gradient')
            .attr('x1', '0%')
            .attr('x2', '100%')
            .attr('y1', '0%')
            .attr('y2', '0%');

        gradient.selectAll('stop')
            .data(d3.ticks(0, 1, 10))
            .enter()
            .append('stop')
            .attr('offset', d => d * 100 + '%')
            .attr('stop-color', d => d3.interpolateViridis(d));

        // Add tooltip
        const tooltip = d3.select(svgRef.current.parentNode)
            .append('div')
            .style('position', 'absolute')
            .style('visibility', 'hidden')
            .style('background-color', 'rgba(255, 255, 255, 0.95)')
            .style('padding', '8px')
            .style('border-radius', '4px')
            .style('box-shadow', '0 2px 4px rgba(0,0,0,0.1)')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('z-index', '1000');


        // Add rotation to long labels if needed
        if (data.dimension > 4) {
            svg.selectAll('.xLabel')
                .attr('transform', 'rotate(-45)')
                .attr('text-anchor', 'end');
        }

    }, [data]);

    return (
        <GraphContainer>
            <StyledSVG ref={svgRef}></StyledSVG>
            <div style={{ 
                marginTop: '10px',
                padding: '10px', 
                fontSize: '12px', 
                color: '#666',
                textAlign: 'center' 
            }}>
            </div>
        </GraphContainer>
    );
};

export default SplomGraph; 