import React from 'react';
import {
    FunnelChart,
    Funnel,
    LabelList,
    Tooltip,
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

const FunnelGraph = ({ data }) => {
    if (!data || !data.samples || data.samples.length === 0) {
        return null;
    }

    // Calculate average values for each parameter
    const parameterAverages = [...Array(data.dimension)].map((_, paramIndex) => {
        const values = data.samples.map(sample => sample.values[paramIndex]);
        const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
        return {
            name: `Parameter ${paramIndex + 1}`,
            value: avg,
            fill: d3.schemeCategory10[paramIndex],
            // Calculate standard deviation for additional info
            stdDev: Math.sqrt(
                values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length
            )
        };
    });

    // Sort by value to create funnel effect
    const sortedData = [...parameterAverages].sort((a, b) => b.value - a.value);

    return (
        <GraphContainer>
            <Title>Parameter Distribution Funnel</Title>
            <ResponsiveContainer width="100%" height="100%">
                <FunnelChart>
                    <Tooltip
                        formatter={(value, name) => [
                            `${(value * 100).toFixed(1)}% ±${(sortedData.find(d => d.name === name).stdDev * 100).toFixed(1)}%`,
                            name
                        ]}
                    />
                    <Funnel
                        dataKey="value"
                        data={sortedData}
                        isAnimationActive
                        labelLine
                    >
                        <LabelList
                            position="right"
                            fill="#000"
                            stroke="none"
                            dataKey="name"
                        />
                        <LabelList
                            position="left"
                            fill="#000"
                            stroke="none"
                            dataKey={(entry) => `${(entry.value * 100).toFixed(1)}%`}
                        />
                    </Funnel>
                </FunnelChart>
            </ResponsiveContainer>
        </GraphContainer>
    );
};

export default FunnelGraph; 