import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const TimeSeriesGraph = ({ data }) => {
    const svgRef = useRef();

    useEffect(() => {
        if (!data || !data.samples || data.samples.length === 0) return;

        // Clear previous graph
        d3.select(svgRef.current).selectAll("*").remove();

        // Set dimensions
        const margin = { top: 20, right: 30, bottom: 30, left: 40 };
        const width = 800 - margin.left - margin.right;
        const height = 300 - margin.top - margin.bottom;

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

        // Create line generators for each dimension
        const lineGenerators = [];
        for (let i = 0; i < data.dimension; i++) {
            lineGenerators.push(
                d3.line()
                    .x(d => xScale(d.timestamp))
                    .y(d => yScale(d.values[i]))
            );
        }

        // Add X and Y axes
        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale));

        svg.append('g')
            .call(d3.axisLeft(yScale)
                .ticks(5)
                .tickFormat(d3.format('.0%')));

        // Add grid lines
        svg.append('g')
            .attr('class', 'grid')
            .call(d3.axisLeft(yScale)
                .tickSize(-width)
                .tickFormat('')
            )
            .style('stroke-dasharray', '3,3')
            .style('opacity', 0.2);

        // Draw lines for each dimension
        const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

        for (let i = 0; i < data.dimension; i++) {
            svg.append('path')
                .datum(data.samples)
                .attr('fill', 'none')
                .attr('stroke', colorScale(i))
                .attr('stroke-width', 1.5)
                .attr('d', lineGenerators[i]);
        }

        // Add legend
        const legend = svg.append('g')
            .attr('font-family', 'sans-serif')
            .attr('font-size', 10)
            .attr('text-anchor', 'start')
            .selectAll('g')
            .data([...Array(data.dimension).keys()])
            .enter().append('g')
            .attr('transform', (d, i) => `translate(${width - 100},${i * 20})`);

        legend.append('rect')
            .attr('x', 0)
            .attr('width', 19)
            .attr('height', 19)
            .attr('fill', colorScale);

        legend.append('text')
            .attr('x', 24)
            .attr('y', 9.5)
            .attr('dy', '0.32em')
            .text((d) => `Param ${d + 1}`);

    }, [data]);

    return <svg ref={svgRef}></svg>;
};

export default TimeSeriesGraph; 