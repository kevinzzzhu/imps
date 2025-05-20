import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Delaunay } from 'd3-delaunay';
import styled from 'styled-components';
import { Button } from '@mui/material';

const GraphContainer = styled.div`
    position: relative;
    width: 90%;
    margin: 20px auto;
`;

const StyledSVG = styled.svg`
    background: #fff;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const DelaunayGraph = ({ data }) => {
    const svgRef = useRef();
    const [isMultiGraphView, setIsMultiGraphView] = useState(false);

    useEffect(() => {
        if (!data || !data.samples || data.samples.length === 0) {
            // Clear SVG if no data
            const root = d3.select(svgRef.current);
            root.selectAll("*").remove();
            d3.select(svgRef.current.parentNode).select(".tooltip").remove(); // Remove tooltip if it exists
            d3.select(svgRef.current.parentNode).select(".tooltip-multi").remove(); // Also remove multi-tooltip if present
            root.attr('width', 0).attr('height', 0); // Collapse SVG
            return;
        }

        const containerNode = svgRef.current ? svgRef.current.parentNode : null;
        if (!containerNode) return; // Ensure parent node is available for width calculation

        const actualContainerWidth = containerNode.clientWidth; // Get dynamic width

        const rootSvg = d3.select(svgRef.current);
        const tDuration = 500; // Transition duration in ms

        // Remove any existing tooltip that might be outside the SVG
        d3.select(svgRef.current.parentNode).select(".tooltip").remove();
        d3.select(svgRef.current.parentNode).select(".tooltip-multi").remove(); // Also remove multi-tooltip if present

        // 1. Fade out all current SVG content
        rootSvg.selectAll("*")
            .transition().duration(tDuration / 2)
            .style("opacity", 0)
            .end() // Returns a promise that resolves when all transitions end
            .then(() => {
                rootSvg.selectAll("*").remove(); // Clear SVG content after fade out

                // 2. Determine new dimensions for the SVG
                let newWidth, newHeight;
                const baseCombinedMargin = { top: 20, right: 120, bottom: 30, left: 40 };
                const baseCombinedPlotWidth = actualContainerWidth - baseCombinedMargin.left - baseCombinedMargin.right;
                const baseCombinedPlotHeight = 400 - baseCombinedMargin.top - baseCombinedMargin.bottom;

                const graphsPerRowMultiView = 2;
                const individualSubGraphHeightMultiView = 150;
                const verticalPaddingMultiView = 40;
                const horizontalPaddingMultiView = 50;
                const marginMultiView = { top: 30, right: 30, bottom: 30, left: 50 };
                
                const availableContentWidthMultiView = actualContainerWidth - marginMultiView.left - marginMultiView.right;
                const individualSubGraphContentWidthMultiView = Math.max(100, (availableContentWidthMultiView - (graphsPerRowMultiView - 1) * horizontalPaddingMultiView) / graphsPerRowMultiView); // Ensure min width

                if (!isMultiGraphView) {
                    newWidth = actualContainerWidth;
                    newHeight = baseCombinedPlotHeight + baseCombinedMargin.top + baseCombinedMargin.bottom;
                } else {
                    const numGraphs = data.dimension;
                    if (numGraphs === 0) {
                        rootSvg.attr('width', 0).attr('height', 0); return;
                    }
                    const numRowsMultiView = Math.ceil(numGraphs / graphsPerRowMultiView);
                    newWidth = actualContainerWidth;
                    newHeight = marginMultiView.top + numRowsMultiView * individualSubGraphHeightMultiView + 
                                (numRowsMultiView > 0 ? (numRowsMultiView - 1) * verticalPaddingMultiView : 0) + 
                                marginMultiView.bottom;
                }

                // 3. Transition SVG to new dimensions
                rootSvg.transition().duration(tDuration)
                    .attr('width', newWidth)
                    .attr('height', newHeight)
                    .on("end", () => {
                        // 4. Draw new content with fade-in animation
                        if (!isMultiGraphView) {
                            // === SINGLE COMBINED GRAPH (Logic mostly from previous version) ===
                            const svg = rootSvg.append('g')
                                .attr('transform', `translate(${baseCombinedMargin.left},${baseCombinedMargin.top})`)
                                .style("opacity", 0);

                            const xScale = d3.scaleTime().domain(d3.extent(data.samples, d => d.timestamp)).range([0, baseCombinedPlotWidth]);
                            const yScale = d3.scaleLinear().domain([0, 1]).range([baseCombinedPlotHeight, 0]);
                            const colorScale = d3.scaleOrdinal(d3.schemeCategory10);
                            const lineGenerators = [];
                            const allPoints = [];

                            for (let i = 0; i < data.dimension; i++) {
                                lineGenerators.push(d3.line().x(d => xScale(d.timestamp)).y(d => yScale(d.values[i])).curve(d3.curveMonotoneX));
                                data.samples.forEach(sample => {
                                    allPoints.push({ x: xScale(sample.timestamp), y: yScale(sample.values[i]), dimension: i, timestamp: sample.timestamp, value: sample.values[i] });
                                });
                            }

                            svg.append('g').attr('class', 'grid').attr('opacity', 0.1).call(d3.axisLeft(yScale).tickSize(-baseCombinedPlotWidth).tickFormat(''));
                            svg.append('g').attr('class', 'grid').attr('transform', `translate(0,${baseCombinedPlotHeight})`).attr('opacity', 0.1).call(d3.axisBottom(xScale).tickSize(-baseCombinedPlotHeight).tickFormat(''));

                            for (let i = 0; i < data.dimension; i++) {
                                const path = svg.append('path').datum(data.samples).attr('fill', 'none').attr('stroke', colorScale(i)).attr('stroke-width', 2).attr('opacity', 0.7).attr('d', lineGenerators[i]);
                                const pathNode = path.node();
                                if (pathNode) { const pathLength = pathNode.getTotalLength(); path.attr('stroke-dasharray', pathLength).attr('stroke-dashoffset', pathLength).transition().duration(1000).attr('stroke-dashoffset', 0); }
                            }

                            const delaunay = Delaunay.from(allPoints, d => d.x, d => d.y);
                            const voronoi = delaunay.voronoi([0, 0, baseCombinedPlotWidth, baseCombinedPlotHeight]);
                            
                            const tooltip = d3.select(svgRef.current.parentNode).append('div').attr('class', 'tooltip')
                                .style('position', 'absolute').style('visibility', 'hidden').style('background-color', 'rgba(255, 255, 255, 0.95)')
                                .style('padding', '8px').style('border-radius', '4px').style('box-shadow', '0 2px 4px rgba(0,0,0,0.1)')
                                .style('font-size', '12px').style('pointer-events', 'none').style('z-index', '1000');

                            const focus = svg.append('g').style('display', 'none');
                            focus.append('circle').attr('r', 5).style('fill', 'white').style('stroke-width', 2);

                            svg.append('g').selectAll('path').data(allPoints).join('path')
                                .style('fill', 'none').style('pointer-events', 'all').attr('d', (_, i) => voronoi.renderCell(i))
                                .on('mouseover', function(event, d) {
                                    focus.style('display', null).select('circle').attr('cx', d.x).attr('cy', d.y).style('stroke', colorScale(d.dimension));
                                    tooltip
                                        .style('visibility', 'visible')
                                        .html(`<strong>Parameter ${d.dimension + 1}</strong><br/>Time: ${d.timestamp.toLocaleTimeString()}<br/>Value: ${d.value.toFixed(3)}`);
                                    
                                    const containerRect = svgRef.current.parentNode.getBoundingClientRect();
                                    const tooltipNode = tooltip.node();
                                    const tooltipWidth = tooltipNode.offsetWidth;
                                    const tooltipHeight = tooltipNode.offsetHeight;

                                    let left = event.pageX - containerRect.left + 15; // Offset from cursor
                                    let top = event.pageY - containerRect.top - tooltipHeight - 10; // Above cursor

                                    // Adjust if tooltip goes out of bounds
                                    if (left + tooltipWidth > containerRect.width) {
                                        left = event.pageX - containerRect.left - tooltipWidth - 15;
                                    }
                                    if (left < 0) {
                                        left = 5; // Prevent going off left edge
                                    }
                                    if (top < 0) {
                                        top = event.pageY - containerRect.top + 15; // Below cursor if no space above
                                    }
                                    if (top + tooltipHeight > containerRect.height) {
                                         top = containerRect.height - tooltipHeight - 5; // Prevent going off bottom edge
                                    }

                                    tooltip.style('left', `${left}px`).style('top', `${top}px`);
                                })
                                .on('mousemove', function(event) { 
                                    const containerRect = svgRef.current.parentNode.getBoundingClientRect();
                                    const tooltipNode = tooltip.node();
                                    const tooltipWidth = tooltipNode.offsetWidth;
                                    const tooltipHeight = tooltipNode.offsetHeight;

                                    let left = event.pageX - containerRect.left + 15;
                                    let top = event.pageY - containerRect.top - tooltipHeight - 10;

                                    if (left + tooltipWidth > containerRect.width) {
                                        left = event.pageX - containerRect.left - tooltipWidth - 15;
                                    }
                                    if (left < 0) {
                                        left = 5;
                                    }
                                    if (top < 0) {
                                        top = event.pageY - containerRect.top + 15;
                                    }
                                     if (top + tooltipHeight > containerRect.height) {
                                         top = containerRect.height - tooltipHeight - 5;
                                    }
                                    tooltip.style('left', `${left}px`).style('top', `${top}px`);
                                })
                                .on('mouseout', function() { focus.style('display', 'none'); tooltip.style('visibility', 'hidden'); });

                            svg.append('g').attr('transform', `translate(0,${baseCombinedPlotHeight})`).call(d3.axisBottom(xScale)).style('font-size', '12px');
                            svg.append('g').call(d3.axisLeft(yScale).ticks(5).tickFormat(d3.format('.0%'))).style('font-size', '12px');

                            const legend = svg.append('g').attr('font-family', 'sans-serif').attr('font-size', 10).attr('text-anchor', 'start')
                                .selectAll('g').data([...Array(data.dimension).keys()]).enter().append('g')
                                .attr('transform', (d, i) => `translate(${baseCombinedPlotWidth + 10},${i * 20 + 20})`).style('cursor', 'pointer');
                            legend.append('rect').attr('x', 0).attr('width', 19).attr('height', 19).attr('fill', colorScale).attr('opacity', 0.7);
                            legend.append('text').attr('x', 24).attr('y', 9.5).attr('dy', '0.32em').text((d) => `Parameter ${d + 1}`);

                            svg.append('text').attr('x', baseCombinedPlotWidth / 2).attr('y', -baseCombinedMargin.top / 2).attr('text-anchor', 'middle')
                                .style('font-size', '14px').style('font-weight', 'bold').text('Time Series Data (Combined)');

                            svg.transition().duration(tDuration).style("opacity", 1);

                        } else {
                            // === MULTIPLE INDIVIDUAL GRAPHS ===
                            const numGraphs = data.dimension;
                            if (numGraphs === 0) return;

                            // Tooltip for multi-graph view
                            // Ensure to remove any previous multi-tooltip instance before creating a new one
                            d3.select(svgRef.current.parentNode).select(".tooltip-multi").remove();
                            const tooltipMulti = d3.select(svgRef.current.parentNode)
                                .append('div')
                                .attr('class', 'tooltip-multi') // Use a distinct class
                                .style('position', 'absolute')
                                .style('visibility', 'hidden')
                                .style('background-color', 'rgba(255, 255, 255, 0.95)')
                                .style('padding', '8px')
                                .style('border-radius', '4px')
                                .style('box-shadow', '0 1px 3px rgba(0,0,0,0.2)')
                                .style('font-size', '11px')
                                .style('pointer-events', 'none')
                                .style('z-index', '1001'); // Ensure it's above other elements

                            const xScale = d3.scaleTime()
                                .domain(d3.extent(data.samples, d => d.timestamp))
                                .range([0, individualSubGraphContentWidthMultiView]);
                            
                            const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

                            for (let i = 0; i < numGraphs; i++) {
                                const rowIndex = Math.floor(i / graphsPerRowMultiView);
                                const colIndex = i % graphsPerRowMultiView;

                                const xPlotOffset = marginMultiView.left + colIndex * (individualSubGraphContentWidthMultiView + horizontalPaddingMultiView);
                                const yPlotOffset = marginMultiView.top + rowIndex * (individualSubGraphHeightMultiView + verticalPaddingMultiView);
                                
                                const subGraphG = rootSvg.append('g')
                                    .attr('transform', `translate(${xPlotOffset},${yPlotOffset})`)
                                    .style("opacity", 0);

                                const yScaleIndividual = d3.scaleLinear().domain([0, 1]).range([individualSubGraphHeightMultiView, 0]);
                                const lineGeneratorIndividual = d3.line().x(d => xScale(d.timestamp))
                                    .y(d => { const val = d.values[i]; return (val === undefined || val === null) ? yScaleIndividual(0) : yScaleIndividual(val); })
                                    .defined(d => d.values[i] !== undefined && d.values[i] !== null).curve(d3.curveMonotoneX);

                                subGraphG.append('g').attr('class', 'grid').attr('opacity', 0.1).call(d3.axisLeft(yScaleIndividual).tickSize(-individualSubGraphContentWidthMultiView).tickFormat(''));
                                subGraphG.append('g').attr('class', 'grid').attr('transform', `translate(0,${individualSubGraphHeightMultiView})`).attr('opacity', 0.1).call(d3.axisBottom(xScale).tickSize(-individualSubGraphHeightMultiView).tickFormat(''));
                                
                                const path = subGraphG.append('path').datum(data.samples).attr('fill', 'none').attr('stroke', colorScale(i)).attr('stroke-width', 1.5).attr('d', lineGeneratorIndividual);
                                const pathNode = path.node();
                                if (pathNode) { const pathLength = pathNode.getTotalLength(); if (pathLength > 0) { path.attr('stroke-dasharray', pathLength).attr('stroke-dashoffset', pathLength).transition().duration(800).attr('stroke-dashoffset', 0);}}

                                // Add invisible circles for tooltip interaction on individual graphs
                                subGraphG.selectAll(`.dot-series-${i}`)
                                    .data(data.samples.filter(d => d.values[i] !== undefined && d.values[i] !== null))
                                    .enter()
                                    .append('circle')
                                    .attr('class', `dot-series-${i}`)
                                    .attr('cx', d_point => xScale(d_point.timestamp))
                                    .attr('cy', d_point => yScaleIndividual(d_point.values[i]))
                                    .attr('r', 4) // Radius for hover target
                                    .style('fill', 'transparent')
                                    .style('stroke', 'none')
                                    .style('pointer-events', 'all')
                                    .on('mouseover', function(event, d_point) {
                                        tooltipMulti
                                            .style('visibility', 'visible')
                                            .html(`<strong>Param ${i + 1}</strong><br/>
                                                   Time: ${d_point.timestamp.toLocaleTimeString()}<br/>
                                                   Value: ${d_point.values[i].toFixed(3)}`);
                                        
                                        // Get bounding box of the graph container for positioning
                                        const containerRect = svgRef.current.parentNode.getBoundingClientRect();
                                        const tooltipWidth = tooltipMulti.node().offsetWidth;
                                        const tooltipHeight = tooltipMulti.node().offsetHeight;

                                        let left = event.pageX - containerRect.left + 15;
                                        let top = event.pageY - containerRect.top - tooltipHeight - 5; // Position above cursor

                                        // Adjust if tooltip goes out of bounds on the right
                                        if (left + tooltipWidth > containerRect.width) {
                                            left = event.pageX - containerRect.left - tooltipWidth - 15;
                                        }
                                        // Adjust if tooltip goes out of bounds on the top
                                        if (top < 0) {
                                            top = event.pageY - containerRect.top + 15;
                                        }

                                        tooltipMulti.style('left', `${left}px`).style('top', `${top}px`);
                                    })
                                    .on('mousemove', function(event) {
                                        const containerRect = svgRef.current.parentNode.getBoundingClientRect();
                                        const tooltipWidth = tooltipMulti.node().offsetWidth;
                                        const tooltipHeight = tooltipMulti.node().offsetHeight;
                                        let left = event.pageX - containerRect.left + 15;
                                        let top = event.pageY - containerRect.top - tooltipHeight - 5;
                                        if (left + tooltipWidth > containerRect.width) { left = event.pageX - containerRect.left - tooltipWidth - 15; }
                                        if (top < 0) { top = event.pageY - containerRect.top + 15; }
                                        tooltipMulti.style('left', `${left}px`).style('top', `${top}px`);
                                    })
                                    .on('mouseout', function() {
                                        tooltipMulti.style('visibility', 'hidden');
                                    });

                                subGraphG.append('g').attr('transform', `translate(0,${individualSubGraphHeightMultiView})`).call(d3.axisBottom(xScale).ticks(Math.max(2, Math.floor(individualSubGraphContentWidthMultiView / 80)))).style('font-size', '10px'); // Adjusted tick count basis
                                subGraphG.append('g').call(d3.axisLeft(yScaleIndividual).ticks(3).tickFormat(d3.format('.0%'))).style('font-size', '10px');
                                subGraphG.append('text').attr('x', individualSubGraphContentWidthMultiView / 2).attr('y', -marginMultiView.top / 2 + 10 ).attr('text-anchor', 'middle')
                                    .style('font-size', '12px').style('font-weight', 'bold').text(`Parameter ${i + 1}`);

                                subGraphG.transition().duration(tDuration).delay(i * (tDuration / numGraphs / 2)).style("opacity", 1); // Staggered fade-in
                            }
                        }
                    });
            })
            .catch(err => {
                // This catch block is important if rootSvg.selectAll("*") initially selects no elements,
                // as .end() might not behave as expected or a transition gets interrupted.
                console.warn("Initial fade-out transition warning (might be normal if SVG was empty or transition interrupted):", err);
                // As a fallback, ensure SVG is clear and proceed with resize and redraw
                rootSvg.selectAll("*").remove();
                
                // Re-calculate dimensions and set them (similar to above)
                let newWidth, newHeight;
                const baseCombinedMargin = { top: 20, right: 120, bottom: 30, left: 40 };
                const baseCombinedPlotWidth = actualContainerWidth - baseCombinedMargin.left - baseCombinedMargin.right;
                const baseCombinedPlotHeight = 400 - baseCombinedMargin.top - baseCombinedMargin.bottom;
                const graphsPerRowMultiView = 2;
                const individualSubGraphHeightMultiView = 150;
                const verticalPaddingMultiView = 40;
                const horizontalPaddingMultiView = 30;
                const marginMultiView = { top: 30, right: 30, bottom: 30, left: 50 };
                
                const availableContentWidthMultiView = actualContainerWidth - marginMultiView.left - marginMultiView.right;
                const individualSubGraphContentWidthMultiView = Math.max(100, (availableContentWidthMultiView - (graphsPerRowMultiView - 1) * horizontalPaddingMultiView) / graphsPerRowMultiView); // Ensure min width

                if (!isMultiGraphView) {
                    newWidth = actualContainerWidth;
                    newHeight = baseCombinedPlotHeight + baseCombinedMargin.top + baseCombinedMargin.bottom;
                } else {
                    const numGraphs = data.dimension;
                    if (numGraphs === 0) { rootSvg.attr('width', 0).attr('height', 0); return; }
                    const numRowsMultiView = Math.ceil(numGraphs / graphsPerRowMultiView);
                    newWidth = actualContainerWidth;
                    newHeight = marginMultiView.top + numRowsMultiView * individualSubGraphHeightMultiView + 
                                (numRowsMultiView > 0 ? (numRowsMultiView - 1) * verticalPaddingMultiView : 0) + 
                                marginMultiView.bottom;
                }
                rootSvg.attr('width', newWidth).attr('height', newHeight); // Set size directly if transition failed
                
                // Manually trigger the drawing logic that would have been in .on("end", ...)
                // This part is a bit repetitive but ensures graph draws even if initial fade-out promise chain had issues.
                if (!isMultiGraphView) {
                     // === SINGLE COMBINED GRAPH (Copied drawing logic with opacity transition) ===
                    const svg = rootSvg.append('g')
                        .attr('transform', `translate(${baseCombinedMargin.left},${baseCombinedMargin.top})`)
                        .style("opacity", 0);
                    // ... (Full drawing logic for combined graph as above) ...
                     const xScale = d3.scaleTime().domain(d3.extent(data.samples, d => d.timestamp)).range([0, baseCombinedPlotWidth]);
                    const yScale = d3.scaleLinear().domain([0, 1]).range([baseCombinedPlotHeight, 0]);
                    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);
                    const lineGenerators = [];
                    const allPoints = [];
                    for (let i = 0; i < data.dimension; i++) {
                        lineGenerators.push(d3.line().x(d => xScale(d.timestamp)).y(d => yScale(d.values[i])).curve(d3.curveMonotoneX));
                        data.samples.forEach(sample => { allPoints.push({ x: xScale(sample.timestamp), y: yScale(sample.values[i]), dimension: i, timestamp: sample.timestamp, value: sample.values[i] }); });
                    }
                    svg.append('g').attr('class', 'grid').attr('opacity', 0.1).call(d3.axisLeft(yScale).tickSize(-baseCombinedPlotWidth).tickFormat(''));
                    svg.append('g').attr('class', 'grid').attr('transform', `translate(0,${baseCombinedPlotHeight})`).attr('opacity', 0.1).call(d3.axisBottom(xScale).tickSize(-baseCombinedPlotHeight).tickFormat(''));
                    for (let i = 0; i < data.dimension; i++) {
                        const path = svg.append('path').datum(data.samples).attr('fill', 'none').attr('stroke', colorScale(i)).attr('stroke-width', 2).attr('opacity', 0.7).attr('d', lineGenerators[i]);
                        const pathNode = path.node(); if (pathNode) { const pathLength = pathNode.getTotalLength(); path.attr('stroke-dasharray', pathLength).attr('stroke-dashoffset', pathLength).transition().duration(1000).attr('stroke-dashoffset', 0); }
                    }
                    const delaunay = Delaunay.from(allPoints, d => d.x, d => d.y);
                    const voronoi = delaunay.voronoi([0, 0, baseCombinedPlotWidth, baseCombinedPlotHeight]);
                    const tooltip = d3.select(svgRef.current.parentNode).append('div').attr('class', 'tooltip')
                                .style('position', 'absolute').style('visibility', 'hidden').style('background-color', 'rgba(255, 255, 255, 0.95)')
                                .style('padding', '8px').style('border-radius', '4px').style('box-shadow', '0 2px 4px rgba(0,0,0,0.1)')
                                .style('font-size', '12px').style('pointer-events', 'none').style('z-index', '1000'); 
                    const focus = svg.append('g').style('display', 'none'); focus.append('circle').attr('r', 5).style('fill', 'white').style('stroke-width', 2); 
                    svg.append('g').selectAll('path').data(allPoints).join('path')
                        .style('fill', 'none').style('pointer-events', 'all').attr('d', (_, i) => voronoi.renderCell(i))
                        .on('mouseover', function(event, d) {
                            focus.style('display', null).select('circle').attr('cx', d.x).attr('cy', d.y).style('stroke', colorScale(d.dimension));
                            tooltip
                                .style('visibility', 'visible')
                                .html(`<strong>Parameter ${d.dimension + 1}</strong><br/>Time: ${d.timestamp.toLocaleTimeString()}<br/>Value: ${d.value.toFixed(3)}`);
                            const containerRect = svgRef.current.parentNode.getBoundingClientRect();
                            const tooltipNode = tooltip.node();
                            const tooltipWidth = tooltipNode.offsetWidth;
                            const tooltipHeight = tooltipNode.offsetHeight;
                            let left = event.pageX - containerRect.left + 15;
                            let top = event.pageY - containerRect.top - tooltipHeight - 10;
                            if (left + tooltipWidth > containerRect.width) { left = event.pageX - containerRect.left - tooltipWidth - 15; }
                            if (left < 0) { left = 5; }
                            if (top < 0) { top = event.pageY - containerRect.top + 15; }
                            if (top + tooltipHeight > containerRect.height) { top = containerRect.height - tooltipHeight - 5; }
                            tooltip.style('left', `${left}px`).style('top', `${top}px`);
                        })
                        .on('mousemove', function(event) {
                            const containerRect = svgRef.current.parentNode.getBoundingClientRect();
                            const tooltipNode = tooltip.node();
                            const tooltipWidth = tooltipNode.offsetWidth;
                            const tooltipHeight = tooltipNode.offsetHeight;
                            let left = event.pageX - containerRect.left + 15;
                            let top = event.pageY - containerRect.top - tooltipHeight - 10;
                            if (left + tooltipWidth > containerRect.width) { left = event.pageX - containerRect.left - tooltipWidth - 15; }
                            if (left < 0) { left = 5; }
                            if (top < 0) { top = event.pageY - containerRect.top + 15; }
                            if (top + tooltipHeight > containerRect.height) { top = containerRect.height - tooltipHeight - 5; }
                            tooltip.style('left', `${left}px`).style('top', `${top}px`);
                        })
                        .on('mouseout', function() { focus.style('display', 'none'); tooltip.style('visibility', 'hidden'); });
                    svg.append('g').attr('transform', `translate(0,${baseCombinedPlotHeight})`).call(d3.axisBottom(xScale)).style('font-size', '12px');
                    svg.append('g').call(d3.axisLeft(yScale).ticks(5).tickFormat(d3.format('.0%'))).style('font-size', '12px');
                    const legend = svg.append('g')
                        .attr('font-family', 'sans-serif').attr('font-size', 10).attr('text-anchor', 'start')
                        .selectAll('g').data([...Array(data.dimension).keys()]).enter().append('g')
                        .attr('transform', (d, i) => `translate(${baseCombinedPlotWidth + 10},${i * 20 + 20})`).style('cursor', 'pointer');
                    legend.append('rect').attr('x', 0).attr('width', 19).attr('height', 19).attr('fill', colorScale).attr('opacity', 0.7);
                    legend.append('text').attr('x', 24).attr('y', 9.5).attr('dy', '0.32em').text((d) => `Parameter ${d + 1}`);
                    svg.append('text').attr('x', baseCombinedPlotWidth / 2).attr('y', -baseCombinedMargin.top / 2).attr('text-anchor', 'middle')
                        .style('font-size', '14px').style('font-weight', 'bold').text('Time Series Data (Combined)');
                    svg.transition().duration(tDuration).style("opacity", 1);
                } else {
                    // === MULTIPLE INDIVIDUAL GRAPHS (Copied drawing logic with opacity transition) ===
                    const numGraphs = data.dimension; if (numGraphs === 0) return;

                    // Ensure to remove any previous multi-tooltip instance before creating a new one
                    d3.select(svgRef.current.parentNode).select(".tooltip-multi").remove(); 
                    const tooltipMultiFallback = d3.select(svgRef.current.parentNode)
                        .append('div')
                        .attr('class', 'tooltip-multi') 
                        .style('position', 'absolute')
                        .style('visibility', 'hidden')
                        .style('background-color', 'rgba(255, 255, 255, 0.95)')
                        .style('padding', '8px')
                        .style('border-radius', '4px')
                        .style('box-shadow', '0 1px 3px rgba(0,0,0,0.2)')
                        .style('font-size', '11px')
                        .style('pointer-events', 'none')
                        .style('z-index', '1001');

                    const xScale = d3.scaleTime()
                        .domain(d3.extent(data.samples, d => d.timestamp))
                        .range([0, individualSubGraphContentWidthMultiView]);
                    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);
                    for (let i = 0; i < numGraphs; i++) {
                        const rowIndex = Math.floor(i / graphsPerRowMultiView);
                        const colIndex = i % graphsPerRowMultiView;

                        const xPlotOffset = marginMultiView.left + colIndex * (individualSubGraphContentWidthMultiView + horizontalPaddingMultiView);
                        const yPlotOffset = marginMultiView.top + rowIndex * (individualSubGraphHeightMultiView + verticalPaddingMultiView);
                        
                        const subGraphG = rootSvg.append('g')
                            .attr('transform', `translate(${xPlotOffset},${yPlotOffset})`)
                            .style("opacity", 0);
                        const yScaleIndividual = d3.scaleLinear().domain([0, 1]).range([individualSubGraphHeightMultiView, 0]);
                        const lineGeneratorIndividual = d3.line().x(d => xScale(d.timestamp)).y(d => { const val = d.values[i]; return (val === undefined || val === null) ? yScaleIndividual(0) : yScaleIndividual(val); }).defined(d => d.values[i] !== undefined && d.values[i] !== null).curve(d3.curveMonotoneX);
                        const path = subGraphG.append('path').datum(data.samples).attr('fill', 'none').attr('stroke', colorScale(i)).attr('stroke-width', 1.5).attr('d', lineGeneratorIndividual);
                        const pathNode = path.node();
                        if (pathNode) { 
                            const pathLength = pathNode.getTotalLength(); 
                            if (pathLength > 0) { 
                                path.attr('stroke-dasharray', pathLength).attr('stroke-dashoffset', pathLength).transition().duration(800).attr('stroke-dashoffset', 0);
                            }
                        } 

                        // Add invisible circles for tooltip interaction (fallback logic)
                        subGraphG.selectAll(`.dot-series-fallback-${i}`)
                            .data(data.samples.filter(d => d.values[i] !== undefined && d.values[i] !== null))
                            .enter()
                            .append('circle')
                            .attr('class', `dot-series-fallback-${i}`)
                            .attr('cx', d_point => xScale(d_point.timestamp))
                            .attr('cy', d_point => yScaleIndividual(d_point.values[i]))
                            .attr('r', 4)
                            .style('fill', 'transparent')
                            .style('stroke', 'none')
                            .style('pointer-events', 'all')
                            .on('mouseover', function(event, d_point) {
                                tooltipMultiFallback
                                    .style('visibility', 'visible')
                                    .html(`<strong>Param ${i + 1}</strong><br/>
                                           Time: ${d_point.timestamp.toLocaleTimeString()}<br/>
                                           Value: ${d_point.values[i].toFixed(3)}`);
                                
                                const containerRect = svgRef.current.parentNode.getBoundingClientRect();
                                const tooltipWidth = tooltipMultiFallback.node().offsetWidth;
                                const tooltipHeight = tooltipMultiFallback.node().offsetHeight;
                                let left = event.pageX - containerRect.left + 15;
                                let top = event.pageY - containerRect.top - tooltipHeight - 5;
                                if (left + tooltipWidth > containerRect.width) { left = event.pageX - containerRect.left - tooltipWidth - 15; }
                                if (top < 0) { top = event.pageY - containerRect.top + 15; }
                                tooltipMultiFallback.style('left', `${left}px`).style('top', `${top}px`);
                            })
                            .on('mousemove', function(event) {
                                const containerRect = svgRef.current.parentNode.getBoundingClientRect();
                                const tooltipWidth = tooltipMultiFallback.node().offsetWidth;
                                const tooltipHeight = tooltipMultiFallback.node().offsetHeight;
                                let left = event.pageX - containerRect.left + 15;
                                let top = event.pageY - containerRect.top - tooltipHeight - 5;
                                if (left + tooltipWidth > containerRect.width) { left = event.pageX - containerRect.left - tooltipWidth - 15; }
                                if (top < 0) { top = event.pageY - containerRect.top + 15; }
                                tooltipMultiFallback.style('left', `${left}px`).style('top', `${top}px`);
                            })
                            .on('mouseout', function() {
                                tooltipMultiFallback.style('visibility', 'hidden');
                            });

                        subGraphG.append('g').attr('transform', `translate(0,${individualSubGraphHeightMultiView})`).call(d3.axisBottom(xScale).ticks(Math.max(2, Math.floor(individualSubGraphContentWidthMultiView / 80)))).style('font-size', '10px'); 
                        subGraphG.append('g').call(d3.axisLeft(yScaleIndividual).ticks(3).tickFormat(d3.format('.0%'))).style('font-size', '10px');
                        subGraphG.append('text').attr('x', individualSubGraphContentWidthMultiView / 2).attr('y', -marginMultiView.top / 2 + 10 ).attr('text-anchor', 'middle')
                            .style('font-size', '12px').style('font-weight', 'bold').text(`Parameter ${i + 1}`);

                        subGraphG.transition().duration(tDuration).delay(i * (tDuration / numGraphs / 2)).style("opacity", 1);
                    }
                }
            });

    }, [data, isMultiGraphView]);

    return (
        <>
            <Button 
                variant="outlined" 
                onClick={() => setIsMultiGraphView(prev => !prev)}
                sx={{ 
                    display: 'block', 
                    margin: '10px auto', 
                    borderColor: 'rgba(255, 255, 255, 0.7)',
                    color: 'rgba(255, 255, 255, 0.9)',
                    '&:hover': {
                        borderColor: 'white',
                        backgroundColor: 'rgba(255, 255, 255, 0.08)'
                    }
                }}
            >
                {isMultiGraphView ? "Show Combined Graph" : "Show Individual Graphs"}
            </Button>
            <GraphContainer>
                <StyledSVG ref={svgRef}></StyledSVG>
            </GraphContainer>
        </>
    );
};

export default DelaunayGraph; 