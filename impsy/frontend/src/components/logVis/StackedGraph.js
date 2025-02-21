import React, { useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';
import styled from 'styled-components';
import * as d3 from 'd3';
import { StackedAreaSeries } from './StackedAreaSeries';

const GraphContainer = styled.div`
    position: relative;
    width: 800px;
    height: 400px;
    margin: 20px auto;
    background: #fff;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    padding: 20px;
`;

const ChartContainer = styled.div`
    width: 100%;
    height: 100%;
`;

const Title = styled.h3`
    text-align: center;
    margin: 0 0 20px 0;
    color: #333;
`;

const defaultOptions = {
    colors: [
        { line: '#2962FF', area: 'rgba(41, 98, 255, 0.2)' },
        { line: '#FF6D00', area: 'rgba(255, 109, 0, 0.2)' },
        { line: '#2E7D32', area: 'rgba(46, 125, 50, 0.2)' },
        { line: '#D50000', area: 'rgba(213, 0, 0, 0.2)' },
        { line: '#6A1B9A', area: 'rgba(106, 27, 154, 0.2)' }
    ]
};

const StackedGraph = ({ data }) => {
    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        if (!data || !data.samples || data.samples.length === 0 || !chartContainerRef.current) {
            return;
        }

        // Create chart instance
        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { color: '#ffffff' },
                textColor: '#333',
            },
            grid: {
                vertLines: { color: '#f0f0f0' },
                horzLines: { color: '#f0f0f0' },
            },
            rightPriceScale: {
                visible: true,
                borderColor: '#f0f0f0',
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.1,
                },
                format: (price) => `${(price * 100).toFixed(1)}%`,
            },
            timeScale: {
                borderColor: '#f0f0f0',
                timeVisible: true,
                secondsVisible: false,
            },
        });

        // Create custom stacked area series
        const customSeriesView = new StackedAreaSeries();
        const stackedSeries = chart.addCustomSeries(customSeriesView, {
            colors: data.dimension <= 5 ? defaultOptions.colors : 
                Array.from({ length: data.dimension }, (_, i) => ({
                    line: d3.schemeCategory10[i],
                    area: `${d3.schemeCategory10[i]}20`
                })),
            lineWidth: 2,
        });

        // Transform data for stacked areas and ensure unique timestamps
        const seriesData = data.samples
            .map((sample, index) => ({
                time: sample.timestamp.getTime() / 1000 + (index * 0.001), // Add small offset for duplicate timestamps
                values: sample.values
            }))
            .sort((a, b) => a.time - b.time);

        // Set the data
        stackedSeries.setData(seriesData);

        // Fit content
        chart.timeScale().fitContent();

        chartRef.current = chart;

        return () => {
            chart.remove();
        };
    }, [data]);

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            if (chartRef.current && chartContainerRef.current) {
                chartRef.current.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                    height: chartContainerRef.current.clientHeight,
                });
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <GraphContainer>
            <Title>Parameter Time Series (Stacked Areas)</Title>
            <ChartContainer ref={chartContainerRef} />
        </GraphContainer>
    );
};

export default StackedGraph;