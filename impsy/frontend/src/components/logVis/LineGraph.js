import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Brush
} from 'recharts';
import styled from 'styled-components';
import * as d3 from 'd3';

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

const Title = styled.h3`
    text-align: center;
    margin: 0 0 20px 0;
    color: #333;
`;

const LineGraph = ({ data }) => {
    if (!data || !data.samples || data.samples.length === 0) {
        return null;
    }

    // Transform the data into the format Recharts expects
    const transformedData = data.samples.map((sample, idx) => {
        const dataPoint = {
            name: `T${idx + 1}`,
            timestamp: sample.timestamp,
        };
        
        // Add each parameter value
        sample.values.forEach((value, i) => {
            dataPoint[`Parameter ${i + 1}`] = value;
        });
        
        return dataPoint;
    });

    // Create line configurations for each parameter
    const lineConfigs = [...Array(data.dimension)].map((_, index) => ({
        dataKey: `Parameter ${index + 1}`,
        stroke: d3.schemeCategory10[index],
        strokeWidth: 2,
        dot: {
            r: 3,
            fill: d3.schemeCategory10[index],
            strokeWidth: 1
        }
    }));

    // Calculate moving averages for smoother lines
    const movingAverageWindow = 3;
    const smoothedData = transformedData.map((point, idx) => {
        const smoothedPoint = { ...point };
        lineConfigs.forEach(config => {
            const values = [];
            for (let i = Math.max(0, idx - movingAverageWindow + 1); i <= idx; i++) {
                values.push(transformedData[i][config.dataKey]);
            }
            smoothedPoint[`${config.dataKey} (MA)`] = values.reduce((a, b) => a + b, 0) / values.length;
        });
        return smoothedPoint;
    });

    return (
        <GraphContainer>
            <Title>Parameter Time Series Lines</Title>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={smoothedData}
                    margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 30
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                        dataKey="name"
                        tick={{ fill: '#666', fontSize: 12 }}
                        label={{ 
                            value: 'Time Points', 
                            position: 'bottom',
                            fill: '#666'
                        }}
                    />
                    <YAxis
                        tick={{ fill: '#666', fontSize: 12 }}
                        domain={[0, 1]}
                        tickFormatter={(value) => `${(value * 100)}%`}
                        label={{ 
                            value: 'Parameter Values', 
                            angle: -90, 
                            position: 'insideLeft',
                            fill: '#666'
                        }}
                    />
                    <Tooltip
                        formatter={(value, name) => [`${(value * 100).toFixed(1)}%`, name]}
                        labelFormatter={(label) => {
                            const sample = smoothedData.find(d => d.name === label);
                            return `Time: ${sample.timestamp.toLocaleTimeString()}`;
                        }}
                    />
                    <Legend 
                        verticalAlign="top"
                        height={36}
                    />
                    {lineConfigs.map((config) => (
                        <Line
                            key={config.dataKey}
                            type="monotone"
                            dataKey={`${config.dataKey} (MA)`}
                            name={config.dataKey}
                            stroke={config.stroke}
                            strokeWidth={config.strokeWidth}
                            dot={config.dot}
                            activeDot={{ r: 5 }}
                            animationDuration={500}
                        />
                    ))}
                    <Brush 
                        dataKey="name"
                        height={30}
                        stroke="#8884d8"
                        startIndex={0}
                    />
                </LineChart>
            </ResponsiveContainer>
        </GraphContainer>
    );
};

export default LineGraph; 