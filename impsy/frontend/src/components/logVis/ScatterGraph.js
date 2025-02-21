import React, { useState } from 'react';
import {
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import styled from 'styled-components';
import * as d3 from 'd3';
import { FormControl, Select, MenuItem, Typography } from '@mui/material';

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

const ControlsContainer = styled.div`
    display: flex;
    justify-content: center;
    gap: 20px;
    margin-bottom: 20px;
`;

const ScatterGraph = ({ data }) => {
    // Move useState hooks before the conditional return
    const [xAxis, setXAxis] = useState(0);
    const [yAxis, setYAxis] = useState(1);

    if (!data || !data.samples || data.samples.length === 0) {
        return null;
    }

    // Transform the data for scatter plot
    const transformedData = data.samples.map((sample, idx) => ({
        x: sample.values[xAxis],
        y: sample.values[yAxis],
        timestamp: sample.timestamp,
        index: idx
    }));

    // Create parameter options for dropdowns
    const parameterOptions = [...Array(data.dimension)].map((_, index) => ({
        value: index,
        label: `Parameter ${index + 1}`
    }));

    return (
        <GraphContainer>
            <Title>Parameter Correlation Scatter Plot</Title>
            
            <ControlsContainer>
                <FormControl size="small" style={{ minWidth: 120 }}>
                    <Typography variant="caption" style={{ marginBottom: 4 }}>X-Axis</Typography>
                    <Select
                        value={xAxis}
                        onChange={(e) => setXAxis(e.target.value)}
                        size="small"
                    >
                        {parameterOptions.map(option => (
                            <MenuItem key={option.value} value={option.value}>
                                {option.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl size="small" style={{ minWidth: 120 }}>
                    <Typography variant="caption" style={{ marginBottom: 4 }}>Y-Axis</Typography>
                    <Select
                        value={yAxis}
                        onChange={(e) => setYAxis(e.target.value)}
                        size="small"
                    >
                        {parameterOptions.map(option => (
                            <MenuItem key={option.value} value={option.value}>
                                {option.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </ControlsContainer>

            <ResponsiveContainer width="100%" height="80%">
                <ScatterChart
                    margin={{
                        top: 20,
                        right: 20,
                        bottom: 20,
                        left: 20,
                    }}
                >
                    <CartesianGrid />
                    <XAxis 
                        type="number" 
                        dataKey="x" 
                        name={`Parameter ${xAxis + 1}`}
                        domain={[0, 1]}
                        tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                    />
                    <YAxis 
                        type="number" 
                        dataKey="y" 
                        name={`Parameter ${yAxis + 1}`}
                        domain={[0, 1]}
                        tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                    />
                    <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        formatter={(value, name) => [`${(value * 100).toFixed(1)}%`, name]}
                        labelFormatter={(value, entry) => {
                            const point = entry[0].payload;
                            return `Time: ${point.timestamp.toLocaleTimeString()}`;
                        }}
                    />
                    <Legend />
                    <Scatter
                        name="Parameters Correlation"
                        data={transformedData}
                        fill={d3.schemeCategory10[0]}
                        line={{ stroke: d3.schemeCategory10[1], strokeWidth: 1 }}
                        lineType="fitting"
                    />
                </ScatterChart>
            </ResponsiveContainer>
        </GraphContainer>
    );
};

export default ScatterGraph; 