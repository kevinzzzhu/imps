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

const ParallelGraph = ({ data }) => {
    const svgRef = useRef();

    useEffect(() => {
        if (!data || !data.samples || data.samples.length === 0) return;

        // Clear previous graph
        d3.select(svgRef.current).selectAll("*").remove();

        // Set dimensions
        const margin = { top: 30, right: 50, bottom: 30, left: 50 };
        const width = 800 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        // Create SVG
        const svg = d3.select(svgRef.current)
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Create scales for each dimension
        const dimensions = [...Array(data.dimension).keys()];
        const y = {};

        dimensions.forEach(i => {
            y[i] = d3.scaleLinear()
                .domain([0, 1])
                .range([height, 0]);
        });

        // Create x scale for dimensions
        const x = d3.scalePoint()
            .range([0, width])
            .domain(dimensions);

        // Create the lines
        const line = d3.line()
            .defined(d => !isNaN(d[1]))
            .x(d => x(d[0]))
            .y(d => d[1]);

        // Color scale
        const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

        // Add background lines
        const background = svg.append('g')
            .attr('class', 'background')
            .selectAll('path')
            .data(data.samples)
            .enter()
            .append('path')
            .attr('d', d => line(dimensions.map(i => [i, y[i](d.values[i])])))
            .style('fill', 'none')
            .style('stroke', '#ddd')
            .style('opacity', 0.3);

        // Add foreground lines with interaction
        const foreground = svg.append('g')
            .attr('class', 'foreground')
            .selectAll('path')
            .data(data.samples)
            .enter()
            .append('path')
            .attr('d', d => line(dimensions.map(i => [i, y[i](d.values[i])])))
            .style('fill', 'none')
            .style('stroke', (d, i) => colorScale(i % data.dimension))
            .style('opacity', 0.7)
            .on('mouseover', function (event, d) {
                d3.select(this)
                    .style('stroke-width', '3')
                    .style('opacity', 1);

                tooltip
                    .style('visibility', 'visible')
                    .html(`Time: ${d.timestamp.toLocaleTimeString()}<br/>` +
                        dimensions.map(i => `Param ${i + 1}: ${d.values[i].toFixed(3)}`).join('<br/>'))
                    .style('left', `${event.offsetX + 150 / 4}px`)
                    .style('top', `${event.offsetY - 150 / 2}px`);
            })
            .on('mouseout', function () {
                d3.select(this)
                    .style('stroke-width', '1')
                    .style('opacity', 0.7);
                tooltip.style('visibility', 'hidden');
            });

        // Add axes
        const axes = svg.selectAll('.dimension')
            .data(dimensions)
            .enter()
            .append('g')
            .attr('class', 'dimension')
            .attr('transform', d => `translate(${x(d)},0)`);

        // Add axis lines and labels
        axes.append('g')
            .each(function (d) {
                d3.select(this).call(d3.axisLeft(y[d]).ticks(5));
            });

        // Add titles
        axes.append('text')
            .attr('y', -9)
            .attr('text-anchor', 'middle')
            .style('fill', 'black')
            .text(d => `Parameter ${d + 1}`);

        // Add brushing
        axes.append('g')
            .attr('class', 'brush')
            .each(function (d) {
                d3.select(this).call(
                    d3.brushY()
                        .extent([[-8, 0], [8, height]])
                        .on('brush', function (event) {
                            const selection = event.selection;
                            if (!selection) return;

                            const dimension = d;
                            const [min, max] = selection.map(y[dimension].invert);

                            foreground.style('display', sample => {
                                const value = sample.values[dimension];
                                return value >= min && value <= max ? null : 'none';
                            });
                        })
                        .on('end', function (event) {
                            if (!event.selection) {
                                foreground.style('display', null);
                            }
                        })
                );
            });

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

    }, [data]);

    return (
        <GraphContainer>
            <StyledSVG ref={svgRef}></StyledSVG>
        </GraphContainer>
    );
};

export default ParallelGraph; 