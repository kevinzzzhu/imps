import {
    CustomSeriesPricePlotValues,
    ICustomSeriesPaneView,
} from 'lightweight-charts';
import { StackedAreaSeriesRenderer } from './StackedAreaSeriesRenderer';  // We'll create this next

export class StackedAreaSeries {
    constructor() {
        this._renderer = new StackedAreaSeriesRenderer();
    }

    priceValueBuilder(plotRow) {
        return [
            0,
            plotRow.values.reduce(
                (previousValue, currentValue) => previousValue + currentValue,
                0
            ),
        ];
    }

    isWhitespace(data) {
        return !Boolean(data.values?.length);
    }

    renderer() {
        return this._renderer;
    }

    update(data, options) {
        this._renderer.update(data, options);
    }

    defaultOptions() {
        return {
            colors: [
                { line: '#2962FF', area: 'rgba(41, 98, 255, 0.2)' },
                { line: '#FF6D00', area: 'rgba(255, 109, 0, 0.2)' },
                { line: '#2E7D32', area: 'rgba(46, 125, 50, 0.2)' },
                { line: '#D50000', area: 'rgba(213, 0, 0, 0.2)' },
                { line: '#6A1B9A', area: 'rgba(106, 27, 154, 0.2)' }
            ],
            lineWidth: 2,
        };
    }
} 