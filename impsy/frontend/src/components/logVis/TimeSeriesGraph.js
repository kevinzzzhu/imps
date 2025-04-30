import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Delaunay } from 'd3-delaunay';
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

const DelaunayGraph = ({ data }) => {
    const svgRef = useRef();

    useEffect(() => {
        if (!data || !data.samples || data.samples.length === 0) return;

        // Clear previous graph
        d3.select(svgRef.current).selectAll("*").remove();

        // Set dimensions
        const margin = { top: 20, right: 120, bottom: 30, left: 40 };
        const width = 800 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        // Create SVG
        const svg = d3.select(svgRef.current)
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Create scales
        const xScale = d3.scaleTime()
            .domain(d3.extent(data.samples, d => d.timestamp))
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain([0, 1])
            .range([height, 0]);

        // Create line generators and points for each dimension
        const lineGenerators = [];
        const allPoints = [];
        const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

        for (let i = 0; i < data.dimension; i++) {
            lineGenerators.push(
                d3.line()
                    .x(d => xScale(d.timestamp))
                    .y(d => yScale(d.values[i]))
                    .curve(d3.curveMonotoneX) // Add smooth curves
            );

            // Create points for Voronoi
            data.samples.forEach(sample => {
                allPoints.push({
                    x: xScale(sample.timestamp),
                    y: yScale(sample.values[i]),
                    dimension: i,
                    timestamp: sample.timestamp,
                    value: sample.values[i]
                });
            });
        }

        // Add background grid
        svg.append('g')
            .attr('class', 'grid')
            .attr('opacity', 0.1)
            .call(d3.axisLeft(yScale)
                .tickSize(-width)
                .tickFormat('')
            );

        svg.append('g')
            .attr('class', 'grid')
            .attr('transform', `translate(0,${height})`)
            .attr('opacity', 0.1)
            .call(d3.axisBottom(xScale)
                .tickSize(-height)
                .tickFormat('')
            );

        // Draw lines with animation
        for (let i = 0; i < data.dimension; i++) {
            const path = svg.append('path')
                .datum(data.samples)
                .attr('fill', 'none')
                .attr('stroke', colorScale(i))
                .attr('stroke-width', 2)
                .attr('opacity', 0.7)
                .attr('d', lineGenerators[i]);

            // Add line animation
            const pathLength = path.node().getTotalLength();
            path.attr('stroke-dasharray', pathLength)
                .attr('stroke-dashoffset', pathLength)
                .transition()
                .duration(1000)
                .attr('stroke-dashoffset', 0);
        }

        // Create Voronoi diagram
        const delaunay = Delaunay.from(
            allPoints,
            d => d.x,
            d => d.y
        );
        const voronoi = delaunay.voronoi([0, 0, width, height]);

        // Add tooltip container
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

        // Add focus elements
        const focus = svg.append('g')
            .style('display', 'none');

        focus.append('circle')
            .attr('r', 5)
            .style('fill', 'white')
            .style('stroke-width', 2);

        // Add Voronoi overlay
        svg.append('g')
            .selectAll('path')
            .data(allPoints)
            .join('path')
            .style('fill', 'none')
            .style('pointer-events', 'all')
            .attr('d', (_, i) => voronoi.renderCell(i))
            .on('mouseover', function(event, d) {
                focus.style('display', null);
                focus.select('circle')
                    .attr('cx', d.x)
                    .attr('cy', d.y)
                    .style('stroke', colorScale(d.dimension));

                const tooltipWidth = 150; // Approximate width of tooltip
                const xOffset = -tooltipWidth / 2; // Center horizontally
                const yOffset = -40; // Position above the cursor

                tooltip
                    .style('visibility', 'visible')
                    .html(`
                        <strong>Parameter ${d.dimension + 1}</strong><br/>
                        Time: ${d.timestamp.toLocaleTimeString()}<br/>
                        Value: ${d.value.toFixed(3)}
                    `)
                    .style('left', `${event.offsetX + xOffset}px`)
                    .style('top', `${event.offsetY + yOffset}px`);
            })
            .on('mousemove', function(event) {
                const tooltipWidth = 150;
                
                tooltip
                    .style('left', `${event.offsetX + tooltipWidth / 4}px`)
                    .style('top', `${event.offsetY - tooltipWidth / 2}px`);
            })
            .on('mouseout', function() {
                focus.style('display', 'none');
                tooltip.style('visibility', 'hidden');
            });

        // Add axes
        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale))
            .style('font-size', '12px');

        svg.append('g')
            .call(d3.axisLeft(yScale)
                .ticks(5)
                .tickFormat(d3.format('.0%')))
            .style('font-size', '12px');

        // Add legend with interaction
        const legend = svg.append('g')
            .attr('font-family', 'sans-serif')
            .attr('font-size', 10)
            .attr('text-anchor', 'start')
            .selectAll('g')
            .data([...Array(data.dimension).keys()])
            .enter().append('g')
            .attr('transform', (d, i) => `translate(${width + 10},${i * 20 + 20})`)
            .style('cursor', 'pointer');

        legend.append('rect')
            .attr('x', 0)
            .attr('width', 19)
            .attr('height', 19)
            .attr('fill', colorScale)
            .attr('opacity', 0.7);

        legend.append('text')
            .attr('x', 24)
            .attr('y', 9.5)
            .attr('dy', '0.32em')
            .text((d) => `Parameter ${d + 1}`);

        // Add title
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', -margin.top / 2)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .text('Time Series Data');

    }, [data]);

    return (
        <GraphContainer>
            <StyledSVG ref={svgRef}></StyledSVG>
        </GraphContainer>
    );
};

export default DelaunayGraph; 