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

const ViolinGraph = ({ data }) => {
    const svgRef = useRef();

    useEffect(() => {
        if (!data || !data.samples || data.samples.length === 0) return;

        // Clear previous graph
        d3.select(svgRef.current).selectAll("*").remove();

        // Set dimensions
        const margin = { top: 40, right: 40, bottom: 40, left: 60 };
        const width = 800 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        // Create SVG
        const svg = d3.select(svgRef.current)
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Create scales
        const xScale = d3.scaleBand()
            .range([0, width])
            .domain([...Array(data.dimension).keys()].map(d => `Parameter ${d + 1}`))
            .padding(0.05);

        const yScale = d3.scaleLinear()
            .domain([0, 1])
            .range([height, 0]);

        // Compute kernel density estimation for each parameter
        const kde = kernelDensityEstimator(kernelEpanechnikov(0.02), yScale.ticks(50));
        
        // Draw violin for each parameter
        for (let i = 0; i < data.dimension; i++) {
            const values = data.samples.map(d => d.values[i]);
            const density = kde(values);
            const xTranslate = xScale(`Parameter ${i + 1}`);

            // Create path
            const area = d3.area()
                .x0(d => -d[1] * 50)
                .x1(d => d[1] * 50)
                .y(d => yScale(d[0]))
                .curve(d3.curveCatmullRom);

            svg.append('g')
                .attr('transform', `translate(${xTranslate + xScale.bandwidth()/2},0)`)
                .append('path')
                .datum(density)
                .attr('fill', d3.schemeCategory10[i])
                .attr('opacity', 0.6)
                .attr('stroke', '#000')
                .attr('stroke-width', 1)
                .attr('d', area);

            // Add mean line
            const mean = d3.mean(values);
            svg.append('line')
                .attr('x1', xTranslate + xScale.bandwidth()/2 - 20)
                .attr('x2', xTranslate + xScale.bandwidth()/2 + 20)
                .attr('y1', yScale(mean))
                .attr('y2', yScale(mean))
                .attr('stroke', 'black')
                .attr('stroke-width', 2);
        }

        // Add axes
        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale));

        svg.append('g')
            .call(d3.axisLeft(yScale).tickFormat(d3.format('.0%')));

        // Add title
        svg.append('text')
            .attr('x', width/2)
            .attr('y', -margin.top/2)
            .attr('text-anchor', 'middle')
            .style('font-size', '16px')
            .text('Parameter Distribution (Violin Plot)');

        // Helper functions for KDE
        function kernelDensityEstimator(kernel, X) {
            return function(V) {
                return X.map(x => [x, d3.mean(V, v => kernel(x - v))]);
            };
        }

        function kernelEpanechnikov(k) {
            return function(v) {
                return Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
            };
        }

    }, [data]);

    return (
        <GraphContainer>
            <StyledSVG ref={svgRef}></StyledSVG>
            <div style={{ 
                padding: '10px', 
                fontSize: '12px', 
                color: '#666',
                textAlign: 'center' 
            }}>
            </div>
        </GraphContainer>
    );
};

export default ViolinGraph; 