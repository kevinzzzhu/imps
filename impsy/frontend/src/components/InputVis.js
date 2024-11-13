import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const InputVisualization = ({data}) => {
    const ref = useRef();

    // Function to update the chart based on viewport dimensions
    const updateChart = () => {
        const width = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0) * 0.35; // 35% of the viewport width
        const height = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0) * 0.75; // 75% of the viewport height

        // Remove the previous SVG elements
        d3.select(ref.current).selectAll("*").remove();

        const svg = d3.select(ref.current)
            .attr('width', width)
            .attr('height', height)
            .style('border', '1px solid black');

        // Create scales
        const xScale = d3.scaleBand()
            .domain(d3.range(data.length))
            .range([0, width])
            .padding(0.1);

        const yScale = d3.scaleLinear()
            .domain([0, 1]) // data is between 0 and 1
            .range([height, 0]); // Invert scale for y-axis

        const colorScale = d3.scaleOrdinal(d3.schemeTableau10).range(
            d3.schemeTableau10.map(color => d3.color(color).darker(1).toString())
        );

        // Append rectangles for the bar chart
        svg.selectAll("rect")
            .data(data)
            .enter()
            .append("rect")
            .attr("x", (d, i) => xScale(i))
            .attr("y", (d) => yScale(d))
            .attr("width", xScale.bandwidth())
            .attr("height", (d) => height - yScale(d))
            .attr("fill", (d, i) => colorScale(i)); // Apply a darker color based on the index
    };

    useEffect(() => {
        updateChart();
    
        const handleResize = () => {
            updateChart();
        };
    
        window.addEventListener('resize', handleResize);
    
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [data]); // Add data to dependency array

    return <svg ref={ref}></svg>;
};

export default InputVisualization;
