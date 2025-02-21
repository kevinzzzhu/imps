import React, { useState } from 'react';
import HeatMap from 'react-heatmap-grid';
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
    overflow: auto;
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

const HeatmapGraph = ({ data }) => {
    const [groupSize, setGroupSize] = useState(10);

    if (!data || !data.samples || data.samples.length === 0) {
        return null;
    }

    // Function to aggregate data points
    const aggregateData = (samples, size) => {
        const groups = [];
        for (let i = 0; i < samples.length; i += size) {
            const group = samples.slice(i, i + size);
            const avgValues = group[0].values.map((_, paramIdx) => {
                const paramValues = group.map(sample => sample.values[paramIdx]);
                return paramValues.reduce((a, b) => a + b, 0) / paramValues.length;
            });
            groups.push({
                values: avgValues,
                groupIndex: Math.floor(i / size) + 1
            });
        }
        return groups;
    };

    // Aggregate the data based on group size
    const aggregatedSamples = aggregateData(data.samples, groupSize);

    // Create x-axis labels (just group numbers)
    const xLabels = aggregatedSamples.map(group => `G${group.groupIndex}`);

    // Create y-axis labels (parameters)
    const yLabels = [...Array(data.dimension)].map((_, idx) => `Parameter ${idx + 1}`);

    // Transform data into 2D array format
    const heatmapData = [...Array(data.dimension)].map((_, paramIdx) => 
        aggregatedSamples.map(group => group.values[paramIdx])
    );

    // Calculate min and max values for color scaling
    const allValues = heatmapData.flat();
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);

    // Custom cell style function
    const cellStyle = (background, value, min, max) => {
        const colorScale = d3.scaleSequential()
            .domain([0, 1])
            .interpolator(d3.interpolateViridis);

        const normalizedValue = (value - minValue) / (maxValue - minValue);
        
        return {
            background: colorScale(normalizedValue),
            fontSize: '11px',
            color: normalizedValue > 0.5 ? '#fff' : '#000',
            border: '1px solid #fff',
            padding: '4px',
            textAlign: 'center'
        };
    };

    // Available group size options
    const groupSizeOptions = [
        { value: 1, label: 'No grouping' },
        { value: 5, label: 'Group by 5' },
        { value: 10, label: 'Group by 10' },
        { value: 20, label: 'Group by 20' },
        { value: 50, label: 'Group by 50' },
        { value: 100, label: 'Group by 100' }
    ];

    return (
        <GraphContainer>
            <Title>Parameter Values Heatmap</Title>
            
            <ControlsContainer>
                <FormControl size="small" style={{ minWidth: 150 }}>
                    <Typography variant="caption" style={{ marginBottom: 4 }}>Group Size</Typography>
                    <Select
                        value={groupSize}
                        onChange={(e) => setGroupSize(e.target.value)}
                        size="small"
                    >
                        {groupSizeOptions.map(option => (
                            <MenuItem key={option.value} value={option.value}>
                                {option.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </ControlsContainer>

            <div style={{ overflowX: 'auto' }}>
                <HeatMap
                    xLabels={xLabels}
                    yLabels={yLabels}
                    data={heatmapData}
                    cellStyle={cellStyle}
                    cellRender={value => `${(value * 100).toFixed(1)}%`}
                    title={(value) => `Value: ${(value * 100).toFixed(1)}%`}
                    onClick={(x, y) => {
                        const group = aggregatedSamples[x];
                        console.log(
                            `Clicked: Parameter ${y + 1} at group ${group.groupIndex}`
                        );
                    }}
                    xLabelWidth={40}
                    yLabelWidth={100}
                    height={35}
                    squares={true}
                />
            </div>
        </GraphContainer>
    );
};

export default HeatmapGraph; 