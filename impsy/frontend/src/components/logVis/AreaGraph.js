import React from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
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

const AreaGraph = ({ data }) => {
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

    // Create area configurations for each parameter
    const areaConfigs = [...Array(data.dimension)].map((_, index) => ({
        dataKey: `Parameter ${index + 1}`,
        stroke: d3.schemeCategory10[index],
        fill: d3.schemeCategory10[index],
        fillOpacity: 0.3,
        stackId: "1" // Stack the areas on top of each other
    }));

    return (
        <GraphContainer>
            <Title>Parameter Area Visualization</Title>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={transformedData}
                    margin={{
                        top: 10,
                        right: 30,
                        left: 0,
                        bottom: 0,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                        dataKey="name"
                        tick={{ fill: '#666', fontSize: 12 }}
                    />
                    <YAxis 
                        tick={{ fill: '#666', fontSize: 12 }}
                        domain={[0, 1]}
                        tickFormatter={(value) => `${(value * 100)}%`}
                    />
                    <Tooltip
                        formatter={(value, name) => [`${(value * 100).toFixed(1)}%`, name]}
                        labelFormatter={(label) => {
                            const sample = transformedData.find(d => d.name === label);
                            return `Time: ${sample.timestamp.toLocaleTimeString()}`;
                        }}
                    />
                    <Legend />
                    {areaConfigs.map((config, index) => (
                        <Area
                            key={config.dataKey}
                            type="monotone"
                            {...config}
                        />
                    ))}
                </AreaChart>
            </ResponsiveContainer>
        </GraphContainer>
    );
};

export default AreaGraph; 