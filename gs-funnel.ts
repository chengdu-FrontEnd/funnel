module nuoke {

    export class GsFunnel {
        selector: any;
        canvasWidth: number;
        canvasHeight: number;
        width: number;
        height: number;
        chartPaddingLeft: number;
        bottomWidth: number;
        labelFormatter: LabelFormatter;
        gap: Gap;
        curve: Curve;
        block: Block;
        specification: Specification;
        ratioBar: RatioBar;
        colorizer;
        static defaultOption = {
            chart: {
                width: 500,
                height: 550,
                bottomWidth: 1 / 3,
                animationDuring: 0,
                fill: {
                    scale: d3.scale.category10(),
                    type: 'gradient',
                },
                dynamicHeight: false,
            },
            curve: {
                enable: false,
                height: 20,
            },
            label: {
                fontSize: '14px',
                fill: '#fff',
                format: '{l}: {f}',
            },
            gap: {
                enable: false,
                height: 10
            },
            specification: {
                enable: true,
                spaceWidth:10
            },
            ratioBar: {
                enable: true,
                postionInblock: true,
                height:10,
                leftColor: '',
                rightColor: '',
                animationDuring:400
            }

        }
        constructor(selector) {
            this.selector = selector;
        }
        private _initialize(data, options) {
            const settings = this._mergeOption(options);
            this.canvasWidth = parseInt(d3.select(this.selector).style('width'), 10);
            this.canvasHeight = parseInt(d3.select(this.selector).style('height'), 10);
            this.width = settings.chart.width;
            this.height = settings.chart.height;
            this.chartPaddingLeft = (this.canvasWidth - this.width)/2;
            this.bottomWidth = settings.chart.width * settings.chart.bottomWidth;
            this.labelFormatter = new LabelFormatter();
            this.labelFormatter.setFormat(settings.label.format);
            this.colorizer = new Colorizer(settings.label.fill, settings.chart.fill.scale);
            this.curve = this._createCurve(settings);
            this.gap = this._createGap(settings);
            this.ratioBar = this._createRatioBar(settings);
            this.block = this._createBlock(settings, data, this.labelFormatter);
            this.specification = this._createSpecification(settings, data, this.labelFormatter);
        }

        private _mergeOption(options) {
            var settings = Utils.extend({}, GsFunnel.defaultOption);
            //settings.chart.width = parseInt(d3.select(this.selector).style('width'), 10);
            //settings.chart.height = parseInt(d3.select(this.selector).style('height'), 10);
            settings = Utils.extend(settings, options);
            return settings;
        }

        private _createCurve(settings: any) {
            if (settings.curve.enable) {
                return new Curve(settings.curve);
            } else {
                return null;
            }
        }

        private _createBlock(settings: any, data, labelFormatter) {
            return new Block(data, settings.chart, this.curve, this.gap, labelFormatter, this.colorizer, this.chartPaddingLeft);
        }

        private _createGap(setting: any) {
            if (setting.gap.enable) {
                return new Gap(setting.gap);
            } else {
                return null;
            }
        }

        private _createSpecification(setting: any, data, labelFormatter) {
            if (setting.specification.enable) {
                var ySpace: number;
                if (this.gap) {
                    var ySpace = this.gap.height;
                } else {
                    ySpace = 0;
                }
                return new Specification(setting.specification, this.chartPaddingLeft, ySpace, this.block);
            } else {
                return null;
            }
        }

        private _createRatioBar(setting: any) {
            if (setting.ratioBar.enable) {
                return new RatioBar(setting.ratioBar);
            } else {
                return null;
            }
        }

        destroy() {
            const container = d3.select(this.selector);
            container.selectAll('svg').remove();
            container.selectAll('*').remove();
            container.text('');
        }

        _draw() {
            var svg = d3.select(this.selector)
                .append('svg')
                .attr('width', this.canvasWidth)
                .attr('height', this.canvasHeight);
            this.block.drawBlocks(svg);
            if (this.specification) {
                this.specification.draw(svg);
            }
            if (this.ratioBar){
                this.ratioBar.draw(svg, this.block.blockPaths, this.block.blocks);
            }

        }

        draw(data, options = {}) {
            this.destroy();
            this._initialize(data, options);
            this._draw();
        }
    }

    export class Block {
        layoutWidth: number;
        layoutHeight: number;
        xSpace: number;
        ySpace: number;
        bottomWidth: number;
        bottomLeftX: number;
        dynamicHeight: number;
        blocks: any;
        blockPaths: any;
        colors: string[];
        fillType: string;
        animationDuring: number;
        constructor(data, chart: any, private curve: Curve, private gap: Gap, private labelFormatter, private colorizer, private chartPaddingLeft: number) {
            this.layoutHeight = chart.height;
            this.layoutWidth = chart.width;
            this.animationDuring = chart.animationDuring;
            this.fillType = chart.fill.type;
            this.bottomWidth = chart.width * chart.bottomWidth;
            this.dynamicHeight = chart.dynamicHeight;
            if (chart.colors && chart.colors.length >= data.length) {
                this.colors = chart.colors;
            }
            this.bottomLeftX = (this.layoutWidth - this.bottomWidth) / 2;
            this._setBlocks(data);
            this.xSpace = this._getXSpace();
            this.ySpace = this._getYSpace();
        }
        private _getYSpace() {
            if (this.curve && !this.gap) {
                return (this.layoutHeight - this.curve.height) / this.blocks.length;
            }
            if (this.gap) {
                return (this.layoutHeight - this.gap.height * (this.blocks.length - 1)) / this.blocks.length;
            }
            return this.layoutHeight / this.blocks.length;
        }

        private _getXSpace() {
            //if (this.gap && this.curve) {
            //    return this.bottomLeftX / this.blocks.length + (this.gap.height + this.curve.height) * (this.bottomLeftX / this.layoutHeight) / this.blocks.length;
            //}
            //if (this.gap && !this.curve) {
            //    return this.bottomLeftX / this.blocks.length + this.gap.height * (this.bottomLeftX / this.layoutHeight) / this.blocks.length;
            //}
            return this.bottomLeftX / this.blocks.length;
        }



        private _setBlocks(data) {
            //const totalCount = this._getTotalCount(data);
            const totalCount = this._getRawBlockCount(data[0]);
            this.blocks = this._standardizeData(data, totalCount);
        }

        private _getTotalCount(data) {
            var total = 0;

            data.forEach((block) => {
                total += this._getRawBlockCount(block);
            });

            return total;
        }

        private _standardizeData(data, totalCount) {
            const standardized = [];
            var count;
            var ratio;
            var label;
            var lastStepCount = 0;
            data.forEach((block, index) => {
                count = this._getRawBlockCount(block);
                ratio = totalCount?(count / totalCount):0;
                label = block[0];
                standardized.push({
                    index: index,
                    value: count,
                    ratio: ratio,
                    stepRatio: lastStepCount? (count / lastStepCount) : 0,
                    height: this.layoutHeight * ratio,
                    fill: this.colors[index] ? this.colorizer.getBlockFill(block, index, this.fillType, this.colors[index])
                        : this.colorizer.getBlockFill(block, index, this.fillType),
                    label: {
                        raw: label,
                        formatted: this.labelFormatter.format(label, count),
                        color: this.colorizer.getLabelFill(block)
                    },
                });
                lastStepCount = count;
            });

            return standardized;
        }

        _getRawBlockCount(block) {
            var value = Array.isArray(block[1]) ? block[1][0] : block[1];
            return parseInt(value);
        }

        private _creatPaths() {
            const paths = [];
            const middle = this.layoutWidth / 2;
            var dx = this.xSpace;
            var dy = this.ySpace;
            var prevLeftX = this.chartPaddingLeft;
            var prevRightX = prevLeftX + this.layoutWidth;
            var prevHeight = 0;
            var nextLeftX = 0;
            var nextRightX = 0;
            var nextHeight = 0;
            var xRevise = 0;
            var yRevise = 0;
            var slopeHeight = this.layoutHeight;
            //const slope = 2 * slopeHeight / (this.layoutWidth - this.bottomWidth);
            const slope = (this.layoutWidth - this.bottomWidth) / slopeHeight / 2;
            if (this.gap) {
                this.gap.setSlope(slope);
                xRevise = this.gap.xRevise;
                yRevise = this.gap.yRevise;
            }
            if (this.curve) {
                prevHeight = this.curve.height;
            }
            var totalHeight = this.layoutHeight;
            this.blocks.forEach((block, i) => {
                nextLeftX = prevLeftX + dx - xRevise;
                nextRightX = prevRightX - dx + xRevise;
                nextHeight = prevHeight + dy - yRevise;
                paths.push([
                    // Start position
                    [prevLeftX, prevHeight, 'M'],
                    // Move to right
                    [prevRightX, prevHeight, 'L'],
                    // Move down
                    [nextRightX, nextHeight, 'L'],
                    // Move to left
                    [nextLeftX, nextHeight, 'L'],
                    // Wrap back to top
                    [prevLeftX, prevHeight, 'L'],
                ]);
                prevLeftX = nextLeftX + 2 * xRevise;
                prevRightX = nextRightX - 2 * xRevise;
                prevHeight = nextHeight + 2 * yRevise;
            });
            return paths;
        }

        private _getBlockPath(group, index) {
            const path = group.append('path');
            if (this.animationDuring !== 0) {
                this._addBeforeTransition(path, index);
            }
            return path;
        }

        private _addBeforeTransition(path, index) {
            const paths = this.blockPaths[index];

            var beforePath = '';
            var beforeFill = '';
            beforePath = Utils.convertPathArrayToSvgD([
                ['M', paths[0][0], paths[0][1]],
                ['L', paths[1][0], paths[1][1]],
                ['L', paths[1][0], paths[1][1]],
                ['L', paths[0][0], paths[0][1]],
            ]);
            if (this.fillType === 'solid' && index > 0) {
                beforeFill = this.blocks[index - 1].fill.actual;
            } else {
                beforeFill = this.blocks[index].fill.actual;
            }

            path.attr('d', beforePath)
                .attr('fill', beforeFill);
        }

        _addBlockLabel(group, index) {
            const path = this.blockPaths[index];

            const text = this.blocks[index].label.formatted;
            const fill = this.blocks[index].label.color;

            const x = this.layoutWidth / 2 + this.chartPaddingLeft;
            const y = this._getTextY(path);

            group.append('text')
                .text(text)
                .attr({
                    'x': x,
                    'y': y,
                    'text-anchor': 'middle',
                    'dominant-baseline': 'middle',
                    'fill': fill,
                    'pointer-events': 'none',
                })
                .style('font-size', '14px');//something need remove to lable class
        }

        _getTextY(paths) {
            var y = (paths[1][1] + paths[2][1]) / 2;
            if (this.curve) {
                y = y + (this.curve.height / this.blocks.length / 2);
            }
            return y;
        }

        private _drawBlock(svg, index) {
            if (index === this.blocks.length) {
                return;
            }
            if (this.curve) {
                this.curve.drawCurve(svg, this.blockPaths[index], this.blocks[index].fill.raw);
            }
            const blockGroup = svg.append('g');
            const path = this._getBlockPath(blockGroup, index);
            path.data([this.blocks[index]]);
            if (this.animationDuring !== 0) {
                path.transition()
                    .duration(this.animationDuring)
                    .ease('linear')
                    .attr('fill', this.blocks[index].fill.actual)
                    .attr('d', Utils.getPathDefinition(index, this.blockPaths))
                    .each('end', () => {
                        this._drawBlock(svg, index + 1);
                    });
            } else {
                path.attr('fill', this.blocks[index].fill.actual)
                    .attr('d', Utils.getPathDefinition(index, this.blockPaths));
                this._drawBlock(svg, index + 1);
            }

            this._addBlockLabel(blockGroup, index);
            // Add the  events
            //todo
        }

        drawBlocks(svg) {
            this.blockPaths = this._creatPaths();
            if (this.fillType === 'gradient') {
                this._defineColorGradients(svg);
            }
            //if (this.curve) {
            //    this.curve.drawCurve(svg, this.blockPaths[0],this.blocks[0].fill.raw);
            //}
            this._drawBlock(svg, 0);
        }

        private _defineColorGradients(svg) {
            const defs = svg.append('defs');

            // Create a gradient for each block
            this.blocks.forEach((block, index) => {
                const color = block.fill.raw;
                const shade = Colorizer.shade(color, -0.2);

                // Create linear gradient
                const gradient = defs.append('linearGradient')
                    .attr({
                        id: 'gradient-' + index,
                    });

                // Define the gradient stops
                const stops = [
                    [0, shade],
                    [40, color],
                    [60, color],
                    [100, shade],
                ];

                // Add the gradient stops
                stops.forEach((stop) => {
                    gradient.append('stop').attr({
                        offset: stop[0] + '%',
                        style: 'stop-color:' + stop[1],
                    });
                });
            });
        }


    }

    export class Curve {
        height: number;
        fillColor: string;
        constructor(curveSettings) {
            this.height = curveSettings.height;
        }
        drawCurve(svg, blockPath, fill) {
            var leftX = blockPath[0][0];
            var rightX = blockPath[1][0];
            const centerX = (rightX + leftX) / 2;
            const path = blockPath;
            const topCurve = path[1][1] - this.height;
            const downCurve = path[1][1] + this.height
            const pathD = Utils.convertPathArrayToSvgD([
                ['M', leftX, path[0][1]],
                ['Q', centerX, downCurve],
                [' ', rightX, path[1][1]],
                ['M', rightX, path[0][1]],
                ['Q', centerX, topCurve],
                [' ', leftX, path[0][1]],
            ]);

            svg.append('path')
                .attr('fill', '#19C5F9')
                .attr('d', pathD);
        }
    }

    export class Gap {
        height: number;
        slope: number;
        xRevise: number;
        yRevise: number;
        constructor(gapSetting: any) {
            this.height = gapSetting.height;
        }
        setSlope(slope: number) {
            this.slope = slope;
            this.yRevise = this.height / 2;
            this.xRevise = this.height * slope / 2;
        }
    }

    export class Specification {
        ySpace: number;
        xSpace: number;
        topContainSpaceWidth: number;
        specificationPaths: any[][];
        marginLeft: number;
        constructor(specificationSetting: any, topContainSpaceWidth: number, ySpace: number, private block: Block) {
            this.marginLeft = 10;
            this.topContainSpaceWidth = topContainSpaceWidth;
            if (this.topContainSpaceWidth < specificationSetting.spaceWidth + this.marginLeft) {
                this.xSpace = topContainSpaceWidth;
            } else {
                this.xSpace = specificationSetting.spaceWidth;
            }
            this.ySpace = ySpace;
        }

        private _creatPaths(blockPaths: any[]) {
            var that = this;
            var paths = [];
            blockPaths.forEach(function (path: any[][]) {
                paths.push([
                    // Start position
                    [that.marginLeft, path[0][1], 'M'],
                    // Move to right
                    [path[0][0] - that.xSpace, path[1][1], 'L'],
                    // Move down
                    [path[3][0] - that.xSpace, path[2][1], 'L'],
                    // Move to left
                    [that.marginLeft, path[3][1], 'L'],
                    // Wrap back to top
                    [that.marginLeft, path[4][1], 'L'],
                ]);

            })
            return paths;
        }

        private _drawSpecificationPath(svg, index) {
            if (index === this.specificationPaths.length) {
                return;
            }
            const specificationBlockGroup = svg.append('g');
            var path = specificationBlockGroup.append('path');
            path.attr('fill', '#EFF8FF')
                .attr('d', Utils.getPathDefinition(index, this.specificationPaths));
            this._drawSpecificationPath(svg, index + 1);

        }

        draw(svg) {
            this.specificationPaths = this._creatPaths(this.block.blockPaths);
            this._drawSpecificationPath(svg, 0);
        }
    }

    export class RatioBar {
        positonInBlock: boolean;
        leftColor: boolean;
        rightColor: boolean;
        height: number;
        ratioPaths: any;
        minWidth: number;
        animationDuring: number;
        constructor(ratioBarSetting) {
            this.positonInBlock = ratioBarSetting.positonInBlock;
            this.leftColor = ratioBarSetting.leftColor;
            this.rightColor = ratioBarSetting.rightColor;
            this.height = ratioBarSetting.height;
            this.animationDuring = ratioBarSetting.animationDuring;
            this.minWidth = 30;
        }
        draw(svg,blockPaths, blocks) {
            this.ratioPaths = this._createPaths(blockPaths, blocks);
            this._drawRatioBar(svg, 0, blocks, blockPaths);
        }

        private _createPaths(blockPaths: any[], blocks: any[]) {
            var that = this;
            var paths = [];
            blockPaths.forEach(function (path: any[][], index) {
                if (index == 0) {
                    return;
                }
                var stepRatio = blocks[index].ratio;
                var topXLeft = (blockPaths[index - 1][2][0] - blockPaths[index-1][3][0]) * (1 - stepRatio) / 2;
                var bottomXLeft = (path[1][0] - path[0][0]) * (1 - stepRatio) / 2;
                paths.push([
                    // Start position
                    [blockPaths[index - 1][3][0] + topXLeft, blockPaths[index - 1][3][1], 'M'],
                    // Move to right
                    [blockPaths[index - 1][2][0] - topXLeft, blockPaths[index - 1][2][1], 'L'],
                    // Move down
                    [path[1][0] - bottomXLeft, path[1][1], 'L'],
                    // Move to left
                    [path[0][0] + bottomXLeft, path[0][1], 'L'],
                    // Wrap back to top
                    [blockPaths[index - 1][3][0] + topXLeft, blockPaths[index - 1][3][1], 'L'],
                ]);
            })
            return paths;
        }

        private _drawRatioBar(svg, index, blocks, blockPaths) {
            if (index === this.ratioPaths.length) {
                return;
            }
            const ratioBarGroup = svg.append('g');
            var path = ratioBarGroup.append('path');
            if (this.animationDuring !== 0) {
                path.transition()
                    .duration(this.animationDuring)
                    .ease('linear')
                    .attr('fill', '#19C5F9')
                    .attr('fill-opacity', '0.5')
                    .attr('d', Utils.getPathDefinition(index, this.ratioPaths))
                    .each('end', () => {
                        this._addRatioBarLabel(ratioBarGroup, index, blocks,blockPaths);
                        this._drawRatioBar(svg, index + 1, blocks, blockPaths);
                    });
            } else {
                path.attr('fill', '#19C5F9')
                    .attr('fill-opacity', '0.5')
                    .attr('d', Utils.getPathDefinition(index, this.ratioPaths));
                this._addRatioBarLabel(ratioBarGroup, index, blocks, blockPaths);
                this._drawRatioBar(svg, index + 1, blocks, blockPaths);
            }
        }

        private _addRatioBarLabel(group, index, blocks, blockPaths) {
            const path = this.ratioPaths[index];
            var savedRatio: number = blocks[index+1].stepRatio * 100;
            var costRatio: number = (1 - blocks[index+1].stepRatio) * 100;
            const costRatioText = costRatio.toFixed(2) + '%';
            const savedRatioText = savedRatio.toFixed(2) + '%';
            const x1 = (blockPaths[index][2][0] - blockPaths[index][3][0]) / 2 + blockPaths[index][3][0];
            const x2 = blockPaths[index][2][0];
            const y = path[3][1] -( path[3][1] - path[1][1])/2;

            group.append('text')
                .text(savedRatioText)
                .attr({
                    'x': x1,
                    'y': y,
                    'text-anchor': 'middle',
                    'dominant-baseline': 'middle',
                    'fill': '#333',
                    'pointer-events': 'none',
                })
                .style('font-size', '14px');

            group.append('text')
                .text(costRatioText)
                .attr({
                    'x': x2,
                    'y': y,
                    'text-anchor': 'start',
                    'dominant-baseline': 'middle',
                    'fill': '#FD3A01',
                    'pointer-events': 'none',
                })
                .style('font-size', '14px');
        }
    }

    class Utils {
        static extend(a, b) {
            var prop;

            for (prop in b) {
                if (b.hasOwnProperty(prop)) {
                    if (typeof b[prop] === 'object' && !Array.isArray(b[prop]) && b[prop] !== null) {
                        if (typeof a[prop] === 'object' && !Array.isArray(a[prop]) && b[prop] !== null) {
                            a[prop] = Utils.extend(a[prop], b[prop]);
                        } else {
                            a[prop] = Utils.extend({}, b[prop]);
                        }
                    } else {
                        a[prop] = b[prop];
                    }
                }
            }

            return a;
        }
        static getRangeColors(value: number) {
            //todo
        }
        static convertPathArrayToSvgD(pathArray: any[]) {
            var path = '';
            pathArray.forEach((command) => {
                path += command[0] + command[1] + ',' + command[2] + ' ';
            });

            return path.replace(/ +/g, ' ').trim();
        }

        static getPathDefinition(index, pathsWithMLLL) {
            const commands = [];

            pathsWithMLLL[index].forEach((command) => {
                commands.push([command[2], command[0], command[1]]);
            });

            return Utils.convertPathArrayToSvgD(commands);
        }
    }
    export class LabelFormatter {

        /**
         * Initial the formatter.
         *
         * @return {void}
         */
        expression;
        formatter;
        constructor() {
            this.expression = null;
        }

        /**
         * Register the format function.
         *
         * @param {string|function} format
         *
         * @return {void}
         */
        setFormat(format) {
            if (typeof format === 'function') {
                this.formatter = format;
            } else {
                this.expression = format;
                this.formatter = this.stringFormatter;
            }
        }

        /**
         * Format the given value according to the data point or the format.
         *
         * @param {string} label
         * @param {number} value
         *
         * @return string
         */
        format(label, value) {
            // Try to use any formatted value specified through the data
            // Otherwise, attempt to use the format function
            if (Array.isArray(value)) {
                return this.formatter(label, value[0], value[1]);
            }

            return this.formatter(label, value, null);
        }

        /**
         * Format the string according to a simple expression.
         *
         * {l}: label
         * {v}: raw value
         * {f}: formatted value
         *
         * @param {string} label
         * @param {number} value
         * @param {*}      fValue
         *
         * @return {string}
         */
        stringFormatter(label, value, fValue = null) {
            var formatted = fValue;

            // Attempt to use supplied formatted value
            // Otherwise, use the default
            if (fValue === null) {
                formatted = this.getDefaultFormattedValue(value);
            }

            return this.expression
                .split('{l}').join(label)
                .split('{v}').join(value)
                .split('{f}').join(formatted);
        }

        /**
         * @param {number} value
         *
         * @return {string}
         */
        getDefaultFormattedValue(value) {
            return value.toLocaleString();
        }

    }
    class Colorizer {
        hexExpression;
        labelFill;
        scale;
        constructor(labelFill, scale) {
            this.hexExpression = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

            this.labelFill = labelFill;

            this.scale = scale;
        }

        /**
         * @param {string} fill
         *
         * @return {void}
         */
        setLabelFill(fill) {
            this.labelFill = fill;
        }

        /**
         * @param {function|Array} scale
         *
         * @return {void}
         */
        setScale(scale) {
            this.scale = scale;
        }

        /**
         * Given a raw data block, return an appropriate color for the block.
         *
         * @param {Array}  block
         * @param {Number} index
         * @param {string} type
         *
         * @return {Object}
         */
        getBlockFill(block, index, type, color?) {
            var raw
            if (color) {
                raw = color;
            } else {
                raw = this.getBlockRawFill(block, index);
            }
            return {
                raw: raw,
                actual: this.getBlockActualFill(raw, index, type),
            };
        }

        /**
         * Return the raw hex color for the block.
         *
         * @param {Array}  block
         * @param {Number} index
         *
         * @return {string}
         */
        getBlockRawFill(block, index) {
            // Use the block's color, if set and valid
            if (block.length > 2 && this.hexExpression.test(block[2])) {
                return block[2];
            }

            // Otherwise, attempt to use the array scale
            if (Array.isArray(this.scale)) {
                return this.scale[index];
            }

            // Finally, use a functional scale
            return this.scale(index);
        }

        /**
         * Return the actual background for the block.
         *
         * @param {string} raw
         * @param {Number} index
         * @param {string} type
         *
         * @return {string}
         */
        getBlockActualFill(raw, index, type) {
            if (type === 'solid') {
                return raw;
            }

            return 'url(#gradient-' + index + ')';
        }

        /**
         * Given a raw data block, return an appropriate label color.
         *
         * @param {Array} block
         *
         * @return {string}
         */
        getLabelFill(block) {
            // Use the label's color, if set and valid
            if (block.length > 3 && this.hexExpression.test(block[3])) {
                return block[3];
            }

            return this.labelFill;
        }

        /**
         * Shade a color to the given percentage.
         *
         * @param {string} color A hex color.
         * @param {number} shade The shade adjustment. Can be positive or negative.
         *
         * @return {string}
         */
        static shade(color, shade) {
            var hex = color.slice(1);

            if (hex.length === 3) {
                hex = Colorizer.expandHex(hex);
            }

            const f = parseInt(hex, 16);
            const t = shade < 0 ? 0 : 255;
            const p = shade < 0 ? shade * -1 : shade;

            const R = f >> 16;
            const G = f >> 8 & 0x00FF;
            const B = f & 0x0000FF;

            const converted = 0x1000000 +
                (Math.round((t - R) * p) + R) * 0x10000 +
                (Math.round((t - G) * p) + G) * 0x100 +
                (Math.round((t - B) * p) + B);

            return '#' + converted.toString(16).slice(1);
        }

        /**
         * Expands a three character hex code to six characters.
         *
         * @param {string} hex
         *
         * @return {string}
         */
        static expandHex(hex) {
            return hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }

    }
}