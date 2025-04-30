import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';

const InputVisualization = ({data}) => {
    const ref = useRef();
    const [previousData, setPreviousData] = useState(Array.isArray(data) ? data : []);
    
    // Validate and clean data
    const validateData = useCallback((inputData) => {
        if (!inputData || !Array.isArray(inputData)) return [];
        return inputData.map(value => {
            const num = parseFloat(value);
            if (isNaN(num)) return 0;
            return Math.max(0, Math.min(1, num)); // Clamp between 0 and 1
        });
    }, []);

    // Function to update the chart based on viewport dimensions
    const updateChart = useCallback(() => {
        if (!ref.current) return;

        const width = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0) * 0.35;
        const height = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0) * 0.75;

        // Remove the previous SVG elements
        d3.select(ref.current).selectAll("*").remove();

        const svg = d3.select(ref.current)
            .attr('width', width)
            .attr('height', height)
            .style('border', 'none');
            
        // Define gradients
        const defs = svg.append("defs");
        
        // Validate data for chart rendering
        const validData = validateData(data);
        const validPrevData = validateData(previousData);
        
        // Create scales - even with empty data, we still want axes
        const xScale = d3.scaleBand()
            .domain(d3.range(validData.length || 1))
            .range([0, width])
            .padding(0.1);

        const yScale = d3.scaleLinear()
            .domain([0, 1])
            .range([height, 0]);

        // Create a beautiful color palette - softer, more elegant
        const baseColors = [
            "#CC4B4A", // Dimmed Coral
            "#D08A3C", // Dimmed Amber
            "#D5B84B", // Dimmed Yellow
            "#3BA771", // Dimmed Emerald Green
            "#2991C0", // Dimmed Bright Blue
            "#406BC0", // Dimmed Royal Blue
            "#7B5DD4", // Dimmed Purple
            "#C34BD4", // Dimmed Magenta
            "#D455A3", // Dimmed Hot Pink
            "#D43C69"  // Dimmed Red-Pink
        ];

        // Create gradient definitions for each bar
        validData.forEach((_, i) => {
            const gradientId = `input-gradient-${i}`;
            const baseColor = baseColors[i % baseColors.length];
            
            // Create darker version for bottom of gradient
            const darkColor = d3.color(baseColor).darker(1);
            
            const gradient = defs.append("linearGradient")
                .attr("id", gradientId)
                .attr("x1", "0%")
                .attr("y1", "0%")
                .attr("x2", "0%")
                .attr("y2", "100%");
            
            // Start with more transparent version of color
            gradient.append("stop")
                .attr("offset", "0%")
                .attr("stop-color", baseColor)
                .attr("stop-opacity", 0.7);
                
            // Add a middle stop for more dimension
            gradient.append("stop")
                .attr("offset", "50%")
                .attr("stop-color", d3.color(baseColor))
                .attr("stop-opacity", 0.6);
            
            // End with darker version
            gradient.append("stop")
                .attr("offset", "100%")
                .attr("stop-color", darkColor)
                .attr("stop-opacity", 0.65);
        });

        // Add a subtle background
        svg.append("rect")
            .attr("width", width)
            .attr("height", height)
            .attr("fill", "transparent");

        // Add a drop shadow filter
        const filter = defs.append("filter")
            .attr("id", "drop-shadow")
            .attr("height", "130%");
            
        filter.append("feGaussianBlur")
            .attr("in", "SourceAlpha")
            .attr("stdDeviation", 2)
            .attr("result", "blur");
            
        filter.append("feOffset")
            .attr("in", "blur")
            .attr("dx", 1)
            .attr("dy", 2)
            .attr("result", "offsetBlur");
            
        const feComponentTransfer = filter.append("feComponentTransfer")
            .attr("in", "offsetBlur")
            .attr("result", "offsetBlur");
            
        feComponentTransfer.append("feFuncA")
            .attr("type", "linear")
            .attr("slope", 0.3);
            
        const feMerge = filter.append("feMerge");
        feMerge.append("feMergeNode")
            .attr("in", "offsetBlur");
        feMerge.append("feMergeNode")
            .attr("in", "SourceGraphic");

        // Add grid lines BEFORE rectangles
        svg.append("g")
            .attr("class", "grid")
            .call(d3.axisLeft(yScale)
                .tickSize(-width)
                .tickFormat("")
            )
            .style("stroke-dasharray", "3,3")
            .style("opacity", 0.2)
            .style("pointer-events", "none"); // This ensures the grid doesn't interfere with interactions

        // Add rectangles with error handling
        if (validData.length > 0) {
            svg.selectAll("rect.bar")
                .data(validData)
                .join(
                    enter => enter.append("rect")
                        .attr("class", "bar")
                        .attr("x", (d, i) => xScale(i))
                        .attr("y", (d, i) => {
                            const y = yScale(validPrevData[i] || 0);
                            return isNaN(y) ? height : y;
                        })
                        .attr("width", xScale.bandwidth())
                        .attr("height", (d, i) => {
                            const h = height - yScale(validPrevData[i] || 0);
                            return isNaN(h) ? 0 : h;
                        })
                        .attr("fill", (d, i) => `url(#input-gradient-${i})`)
                        .attr("filter", "url(#drop-shadow)")
                        .attr("rx", 2) // Rounded corners
                        .attr("ry", 2)
                        .style("stroke", (d, i) => d3.color(baseColors[i % baseColors.length]).darker(0.5))
                        .style("stroke-width", 0.5)
                        .style("stroke-opacity", 0.7)
                        .call(enter => enter.transition()
                            .duration(750)
                            .ease(d3.easeQuadOut)
                            .attr("y", d => {
                                const y = yScale(d);
                                return isNaN(y) ? height : y;
                            })
                            .attr("height", d => {
                                const h = height - yScale(d);
                                return isNaN(h) ? 0 : h;
                            })),
                    update => update
                        .transition()
                        .duration(750)
                        .ease(d3.easeQuadOut)
                        .attr("y", d => {
                            const y = yScale(d);
                            return isNaN(y) ? height : y;
                        })
                        .attr("height", d => {
                            const h = height - yScale(d);
                            return isNaN(h) ? 0 : h;
                        }),
                    exit => exit
                        .transition()
                        .duration(750)
                        .attr("y", height)
                        .attr("height", 0)
                        .remove()
                );
                
            // Add glow effect when value changes
            svg.selectAll("rect.bar")
                .filter((d, i) => d !== validPrevData[i])
                .append("animate")
                .attr("attributeName", "stroke-width")
                .attr("values", "2;0.5")
                .attr("dur", "0.5s");
        }

        // Add X and Y axes with improved styling
        const xAxis = d3.axisBottom(xScale)
            .tickFormat((d, i) => `P${i+1}`); // Parameter labels
        
        const yAxis = d3.axisLeft(yScale)
            .ticks(5)
            .tickFormat(d3.format(".0%")); // Format as percentage

        // Add axes LAST (so they're always on top)
        svg.append("g")
            .attr("transform", `translate(0, ${height})`)
            .call(xAxis)
            .selectAll("text")
            .style("font-size", "10px")
            .style("font-family", "Arial, sans-serif");

        svg.append("g")
            .call(yAxis)
            .selectAll("text")
            .style("font-size", "10px")
            .style("font-family", "Arial, sans-serif");

        // Add labels with improved styling
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height + 40)
            .attr("text-anchor", "middle")
            .style("font-family", "Arial, sans-serif")
            .style("font-size", "12px")
            .style("fill", "#333")
            .text("Parameters");

        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -40)
            .attr("text-anchor", "middle")
            .style("font-family", "Arial, sans-serif")
            .style("font-size", "12px")
            .style("fill", "#333")
            .text("Value");

        // Update previous data for next render
        setPreviousData(validData);
    }, [data]);

    useEffect(() => {
        updateChart();
    
        const handleResize = () => {
            updateChart();
        };
    
        window.addEventListener('resize', handleResize);
    
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [data, updateChart]); // Add updateChart to dependency array

    return <svg ref={ref}></svg>;
};

export default InputVisualization;
