import React from 'react';
import {
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    Legend,
    ResponsiveContainer,
    Tooltip
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

const RadarGraph = ({ data }) => {
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

    // Create radar lines for each parameter
    const radarLines = [...Array(data.dimension)].map((_, index) => ({
        dataKey: `Parameter ${index + 1}`,
        stroke: `${d3.schemeCategory10[index]}`,
        fill: `${d3.schemeCategory10[index]}`,
        fillOpacity: 0.3
    }));

    return (
        <GraphContainer>
            <Title>Parameter Radar Visualization</Title>
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart
                    outerRadius="70%"
                    data={transformedData}
                >
                    <PolarGrid gridType="circle" />
                    <PolarAngleAxis
                        dataKey="name"
                        tick={{ fill: '#666', fontSize: 12 }}
                    />
                    <PolarRadiusAxis
                        angle={90}
                        domain={[0, 1]}
                        tickFormatter={(value) => `${(value * 100)}%`}
                    />
                    {radarLines.map((line, index) => (
                        <Radar
                            key={line.dataKey}
                            name={line.dataKey}
                            dataKey={line.dataKey}
                            stroke={line.stroke}
                            fill={line.fill}
                            fillOpacity={line.fillOpacity}
                        />
                    ))}
                    <Tooltip
                        formatter={(value, name, props) => [`${(value * 100).toFixed(1)}%`, name]}
                        labelFormatter={(label) => {
                            const sample = transformedData.find(d => d.name === label);
                            return `Time: ${sample.timestamp.toLocaleTimeString()}`;
                        }}
                    />
                    <Legend />
                </RadarChart>
            </ResponsiveContainer>
        </GraphContainer>
    );
};

export default RadarGraph; 