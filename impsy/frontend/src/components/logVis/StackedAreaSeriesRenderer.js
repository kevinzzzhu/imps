export class StackedAreaSeriesRenderer {
    constructor() {
        this._data = null;
        this._options = null;
    }

    update(data, options) {
        this._data = data;
        this._options = options;
    }

    draw(ctx, pixelRatio, seriesData) {
        if (!this._data || !this._options || !seriesData || !seriesData.length) {
            return;
        }

        const colors = this._options.colors;
        const lineWidth = this._options.lineWidth || 2;
        const dimension = this._data[0].values.length;

        ctx.save();
        ctx.lineWidth = lineWidth * pixelRatio;

        // For each time point, calculate cumulative values
        const cumulativeData = seriesData.map(point => {
            const values = [];
            let sum = 0;
            for (let i = 0; i < dimension; i++) {
                const value = this._data.find(d => d.time === point.time)?.values[i] || 0;
                sum += value;
                values.push({
                    value: sum,
                    x: point.x,
                    y: point.y * (1 - sum)
                });
            }
            return values;
        });

        // Draw areas from bottom to top
        for (let i = dimension - 1; i >= 0; i--) {
            ctx.beginPath();
            
            // Move to the first point
            const firstPoint = cumulativeData[0][i];
            ctx.moveTo(firstPoint.x, firstPoint.y);

            // Draw line to each point
            for (let j = 1; j < cumulativeData.length; j++) {
                const point = cumulativeData[j][i];
                ctx.lineTo(point.x, point.y);
            }

            // Draw line back to baseline for area
            for (let j = cumulativeData.length - 1; j >= 0; j--) {
                const baseY = j === cumulativeData.length - 1 || j === 0 
                    ? ctx.canvas.height 
                    : cumulativeData[j][i - 1]?.y || ctx.canvas.height;
                ctx.lineTo(cumulativeData[j][0].x, baseY);
            }

            ctx.closePath();
            ctx.fillStyle = colors[i].area;
            ctx.fill();
        }

        // Draw lines from bottom to top
        for (let i = dimension - 1; i >= 0; i--) {
            ctx.beginPath();
            ctx.strokeStyle = colors[i].line;

            const firstPoint = cumulativeData[0][i];
            ctx.moveTo(firstPoint.x, firstPoint.y);

            for (let j = 1; j < cumulativeData.length; j++) {
                const point = cumulativeData[j][i];
                ctx.lineTo(point.x, point.y);
            }

            ctx.stroke();
        }

        ctx.restore();
    }
} 