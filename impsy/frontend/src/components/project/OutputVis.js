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
            .style('border', '1px solid black');

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

        const colorScale = d3.scaleOrdinal(d3.schemeTableau10).range(
            d3.schemeTableau10.map(color => d3.color(color).brighter(0.8).toString())
        );

        // Append rectangles with error checking
        svg.selectAll("rect")
            .data(validData)
            .join(
                enter => enter.append("rect")
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
                    .attr("fill", (d, i) => colorScale(i))
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

        // Add axes LAST (so they're always on top)
        svg.append("g")
            .attr("transform", `translate(0, ${height})`)
            .call(d3.axisBottom(xScale)
                .tickFormat((d, i) => `O${i+1}`)); // Output labels

        svg.append("g")
            .call(d3.axisLeft(yScale)
                .ticks(5)
                .tickFormat(d3.format(".0%")));

        // Add labels
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height + 40)
            .attr("text-anchor", "middle")
            .text("Outputs");

        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -40)
            .attr("text-anchor", "middle")
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
