import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { throttle } from 'lodash';

const OutputVisualization = ({data}) => {
    const ref = useRef();
    const [previousData, setPreviousData] = useState(Array.isArray(data) ? data : []);
    const [smoothedData, setSmoothedData] = useState(Array.isArray(data) ? data : []);
    const dataBufferRef = useRef([]);
    
    // Validate and clean data
    const validateData = useCallback((data) => {
        if (!Array.isArray(data)) return [];
        return data.map(value => {
            const num = Number(value);
            return isNaN(num) ? 0 : Math.max(0, Math.min(1, num)); // Clamp between 0 and 1
        });
    }, []);

    // Smooth data updates using moving average
    const smoothData = useCallback((newData) => {
        const validData = validateData(newData);
        const bufferSize = 5;
        
        dataBufferRef.current.push(validData);
        if (dataBufferRef.current.length > bufferSize) {
            dataBufferRef.current.shift();
        }
        
        // Weighted moving average with error checking
        const smoothed = validData.map((_, index) => {
            try {
                const values = dataBufferRef.current.map(d => d[index] || 0);
                const weights = values.map((_, i) => i + 1);
                const weightedSum = values.reduce((a, b, i) => a + (b || 0) * weights[i], 0);
                const weightSum = weights.reduce((a, b) => a + b, 0);
                const result = weightedSum / weightSum;
                return isNaN(result) ? 0 : result;
            } catch (error) {
                console.error('Smoothing error:', error);
                return 0;
            }
        });
        
        return smoothed;
    }, [validateData]);

    // Throttled update with error handling
    const throttledUpdate = useCallback(
        throttle((newData) => {
            try {
                const smoothed = smoothData(newData);
                setSmoothedData(smoothed);
                setPreviousData(smoothed);
            } catch (error) {
                console.error('Update error:', error);
            }
        }, 50),
        [smoothData]
    );

    useEffect(() => {
        throttledUpdate(data);
    }, [data, throttledUpdate]);

    const updateChart = useCallback(() => {
        if (!ref.current) return;

        const width = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0) * 0.35;
        const height = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0) * 0.75;

        d3.select(ref.current).selectAll("*").remove();

        const svg = d3.select(ref.current)
            .attr('width', width)
            .attr('height', height)
            .style('border', 'none');
            
        // Define gradients and filters
        const defs = svg.append("defs");

        // Ensure we have valid data
        const validData = validateData(smoothedData);
        const validPrevData = validateData(previousData);

        // Create scales
        const xScale = d3.scaleBand()
            .domain(d3.range(validData.length))
            .range([0, width])
            .padding(0.1);

        const yScale = d3.scaleLinear()
            .domain([0, 1])
            .range([height, 0]);

        // Define vibrant, modern color palette for outputs - more saturated and brighter
        const baseColors = [
            "#FF5E5B", // Vibrant Coral
            "#FFA647", // Amber
            "#FFDE59", // Bright Yellow
            "#45CB85", // Emerald Green
            "#32ADE6", // Bright Blue
            "#4D80E4", // Royal Blue
            "#9270FF", // Bright Purple
            "#E85AFF", // Bright Magenta
            "#FF66C4", // Hot Pink
            "#FF477E"  // Bright Red-Pink
        ];

        // Create fancier gradients for output bars
        validData.forEach((value, i) => {
            const gradientId = `output-gradient-${i}`;
            const baseColor = baseColors[i % baseColors.length];
            const color = d3.color(baseColor);
            
            // Create gradient
            const gradient = defs.append("linearGradient")
                .attr("id", gradientId)
                .attr("x1", "0%")
                .attr("y1", "0%")
                .attr("x2", "0%")
                .attr("y2", "100%");
                
            // Top of gradient - brighter
            gradient.append("stop")
                .attr("offset", "0%")
                .attr("stop-color", color.brighter(0.5))
                .attr("stop-opacity", 0.95);
                
            // Middle stop
            gradient.append("stop")
                .attr("offset", "50%")
                .attr("stop-color", baseColor)
                .attr("stop-opacity", 0.9);
                
            // Add sparkle to high values
            if (value > 0.7) {
                gradient.append("stop")
                    .attr("offset", "70%")
                    .attr("stop-color", color.brighter(0.8))
                    .attr("stop-opacity", 0.95);
                    
                gradient.append("stop")
                    .attr("offset", "80%")
                    .attr("stop-color", baseColor)
                    .attr("stop-opacity", 0.9);
            }
            
            // Bottom of gradient - slightly darker
            gradient.append("stop")
                .attr("offset", "100%")
                .attr("stop-color", color.darker(0.5))
                .attr("stop-opacity", 0.85);
        });
        
        // Create a fancy glow filter
        const glowFilter = defs.append("filter")
            .attr("id", "glow-effect")
            .attr("x", "-50%")
            .attr("y", "-50%")
            .attr("width", "200%")
            .attr("height", "200%");
            
        glowFilter.append("feGaussianBlur")
            .attr("stdDeviation", "2")
            .attr("result", "blur");
            
        glowFilter.append("feComposite")
            .attr("in", "blur")
            .attr("in2", "SourceGraphic")
            .attr("operator", "out")
            .attr("result", "glow");
            
        const feMerge = glowFilter.append("feMerge");
        feMerge.append("feMergeNode")
            .attr("in", "glow");
        feMerge.append("feMergeNode")
            .attr("in", "SourceGraphic");
        
        // Add subtle background
        svg.append("rect")
            .attr("width", width)
            .attr("height", height)
            .attr("fill", "transparent");

        // Add grid lines behind
        svg.append("g")
            .attr("class", "grid")
            .call(d3.axisLeft(yScale)
                .tickSize(-width)
                .tickFormat("")
            )
            .style("stroke-dasharray", "3,3")
            .style("opacity", 0.2)
            .style("pointer-events", "none");

        // Append rectangles with enhanced styling and error checking
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
                    .attr("fill", (d, i) => `url(#output-gradient-${i})`)
                    .attr("rx", 3) // Rounded corners
                    .attr("ry", 3)
                    .style("stroke", (d, i) => d3.color(baseColors[i % baseColors.length]).darker(0.3))
                    .style("stroke-width", 1)
                    .style("stroke-opacity", 0.8)
                    .call(enter => enter.transition()
                        .duration(100)
                        .ease(d3.easeCubicOut)
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
                    .duration(100)
                    .ease(d3.easeCubicOut)
                    .attr("y", d => {
                        const y = yScale(d);
                        return isNaN(y) ? height : y;
                    })
                    .attr("height", d => {
                        const h = height - yScale(d);
                        return isNaN(h) ? 0 : h;
                    }),
                exit => exit.remove()
            );
            
        // Add special glow effect to bars with high values
        svg.selectAll("rect.bar")
            .filter(d => d > 0.8) // Only bars with high values
            .style("filter", "url(#glow-effect)");
            
        // Add value indicators for significant values
        svg.selectAll(".value-indicator")
            .data(validData.filter(d => d > 0.7)) // Only show for significant values
            .join("circle")
            .attr("class", "value-indicator")
            .attr("cx", (d, i) => {
                // Find the original index in validData
                const originalIndex = validData.findIndex(val => val === d);
                return xScale(originalIndex) + xScale.bandwidth() / 2;
            })
            .attr("cy", d => yScale(d) - 8)
            .attr("r", 3)
            .attr("fill", "white")
            .attr("stroke", "#333")
            .attr("stroke-width", 1)
            .style("opacity", 0)
            .transition()
            .duration(300)
            .style("opacity", 1);
            
        // Add subtle pulsing animation to the bars
        svg.selectAll("rect.bar")
            .each(function(d, i) {
                // Only add animation to active bars
                if (d > 0.3) {
                    const node = d3.select(this);
                    
                    // Create unique animation IDs
                    const pulseId = `pulse-${i}-${Date.now()}`;
                    
                    // Add pulsing animation definition
                    const animation = defs.append("animate")
                        .attr("id", pulseId)
                        .attr("attributeName", "stroke-opacity")
                        .attr("values", "0.8;1;0.8")
                        .attr("dur", `${1 + d}s`) // Duration based on value
                        .attr("repeatCount", "indefinite");
                        
                    // Apply the animation
                    node.attr("stroke-opacity", 0.8)
                       .style("animation", pulseId);
                }
            });

        // Add axes LAST with modern styling
        svg.append("g")
            .attr("transform", `translate(0, ${height})`)
            .call(d3.axisBottom(xScale)
                .tickFormat((d, i) => `O${i+1}`)) // Output labels
            .selectAll("text")
            .style("font-family", "'Helvetica Neue', Arial, sans-serif")
            .style("font-size", "10px")
            .style("font-weight", "500");

        svg.append("g")
            .call(d3.axisLeft(yScale)
                .ticks(5)
                .tickFormat(d3.format(".0%")))
            .selectAll("text")
            .style("font-family", "'Helvetica Neue', Arial, sans-serif")
            .style("font-size", "10px")
            .style("font-weight", "500");

        // Add improved labels
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height + 40)
            .attr("text-anchor", "middle")
            .style("font-family", "'Helvetica Neue', Arial, sans-serif")
            .style("font-weight", "bold")
            .style("font-size", "12px")
            .style("fill", "#333")
            .text("Outputs");

        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -40)
            .attr("text-anchor", "middle")
            .style("font-family", "'Helvetica Neue', Arial, sans-serif")
            .style("font-weight", "bold")
            .style("font-size", "12px")
            .style("fill", "#333")
            .text("Value");
    }, [smoothedData, previousData, validateData]);

    // Update chart effect
    useEffect(() => {
        updateChart();
    }, [smoothedData, updateChart]);

    // Resize handler
    useEffect(() => {
        const handleResize = throttle(() => {
            updateChart();
        }, 100);

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            handleResize.cancel();
        };
    }, [updateChart]);

    return <svg ref={ref}></svg>;
};

export default OutputVisualization;
