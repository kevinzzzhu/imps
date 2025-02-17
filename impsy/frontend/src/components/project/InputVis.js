import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const InputVisualization = ({data}) => {
    const ref = useRef();
    const [previousData, setPreviousData] = useState(data);

    // Function to update the chart based on viewport dimensions
    const updateChart = () => {
        const width = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0) * 0.35;
        const height = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0) * 0.75;

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
            .domain([0, 1])
            .range([height, 0]);

        const colorScale = d3.scaleOrdinal(d3.schemeTableau10).range(
            d3.schemeTableau10.map(color => d3.color(color).darker(1).toString())
        );

        // Add X and Y axes
        const xAxis = d3.axisBottom(xScale)
            .tickFormat((d, i) => `P${i+1}`); // Parameter labels
        
        const yAxis = d3.axisLeft(yScale)
            .ticks(5)
            .tickFormat(d3.format(".0%")); // Format as percentage

        // Append rectangles FIRST (so they appear behind)
        svg.selectAll("rect")
            .data(data)
            .join(
                enter => enter.append("rect")
                    .attr("x", (d, i) => xScale(i))
                    .attr("y", (d, i) => yScale(previousData[i] || 0))
                    .attr("width", xScale.bandwidth())
                    .attr("height", (d, i) => height - yScale(previousData[i] || 0))
                    .attr("fill", (d, i) => colorScale(i))
                    .call(enter => enter.transition()
                        .duration(750)
                        .ease(d3.easeQuadOut)
                        .attr("y", d => yScale(d))
                        .attr("height", d => height - yScale(d))),
                update => update
                    .transition()
                    .duration(750)
                    .ease(d3.easeQuadOut)
                    .attr("y", d => yScale(d))
                    .attr("height", d => height - yScale(d)),
                exit => exit
                    .transition()
                    .duration(750)
                    .attr("y", height)
                    .attr("height", 0)
                    .remove()
            );

        // Add grid lines AFTER (so they appear in front)
        svg.append("g")
            .attr("class", "grid")
            .call(d3.axisLeft(yScale)
                .tickSize(-width)
                .tickFormat("")
            )
            .style("stroke-dasharray", "3,3")
            .style("opacity", 0.2)
            .style("pointer-events", "none"); // This ensures the grid doesn't interfere with interactions

        // Add axes LAST (so they're always on top)
        svg.append("g")
            .attr("transform", `translate(0, ${height})`)
            .call(xAxis);

        svg.append("g")
            .call(yAxis);

        // Add labels
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height + 40)
            .attr("text-anchor", "middle")
            .text("Parameters");

        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -40)
            .attr("text-anchor", "middle")
            .text("Value");

        // Update previous data for next render
        setPreviousData(data);
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
