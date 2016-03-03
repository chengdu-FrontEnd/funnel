var nuoke;
(function (nuoke) {
    var GsFunnel = (function () {
        function GsFunnel(selector) {
            this.selector = selector;
        }
        GsFunnel.prototype._initialize = function (data, options) {
            var settings = this._mergeOption(options);
            this.canvasWidth = parseInt(d3.select(this.selector).style('width'), 10);
            this.canvasHeight = parseInt(d3.select(this.selector).style('height'), 10);
            this.width = settings.chart.width;
            this.height = settings.chart.height;
            this.chartPaddingLeft = (this.canvasWidth - this.width) / 2;
            this.bottomWidth = settings.chart.width * settings.chart.bottomWidth;
            this.labelFormatter = new LabelFormatter();
            this.labelFormatter.setFormat(settings.label.format);
            this.colorizer = new Colorizer(settings.label.fill, settings.chart.fill.scale);
            this.curve = this._createCurve(settings);
            this.gap = this._createGap(settings);
            this.ratioBar = this._createRatioBar(settings);
            this.block = this._createBlock(settings, data, this.labelFormatter);
            this.specification = this._createSpecification(settings, data, this.labelFormatter);
        };
        GsFunnel.prototype._mergeOption = function (options) {
            var settings = Utils.extend({}, GsFunnel.defaultOption);
            //settings.chart.width = parseInt(d3.select(this.selector).style('width'), 10);
            //settings.chart.height = parseInt(d3.select(this.selector).style('height'), 10);
            settings = Utils.extend(settings, options);
            return settings;
        };
        GsFunnel.prototype._createCurve = function (settings) {
            if (settings.curve.enable) {
                return new Curve(settings.curve);
            }
            else {
                return null;
            }
        };
        GsFunnel.prototype._createBlock = function (settings, data, labelFormatter) {
            return new Block(data, settings.chart, this.curve, this.gap, labelFormatter, this.colorizer, this.chartPaddingLeft);
        };
        GsFunnel.prototype._createGap = function (setting) {
            if (setting.gap.enable) {
                return new Gap(setting.gap);
            }
            else {
                return null;
            }
        };
        GsFunnel.prototype._createSpecification = function (setting, data, labelFormatter) {
            if (setting.specification.enable) {
                var ySpace;
                if (this.gap) {
                    var ySpace = this.gap.height;
                }
                else {
                    ySpace = 0;
                }
                return new Specification(setting.specification, this.chartPaddingLeft, ySpace, this.block);
            }
            else {
                return null;
            }
        };
        GsFunnel.prototype._createRatioBar = function (setting) {
            if (setting.ratioBar.enable) {
                return new RatioBar(setting.ratioBar);
            }
            else {
                return null;
            }
        };
        GsFunnel.prototype.destroy = function () {
            var container = d3.select(this.selector);
            container.selectAll('svg').remove();
            container.selectAll('*').remove();
            container.text('');
        };
        GsFunnel.prototype._draw = function () {
            var svg = d3.select(this.selector)
                .append('svg')
                .attr('width', this.canvasWidth)
                .attr('height', this.canvasHeight);
            this.block.drawBlocks(svg);
            if (this.specification) {
                this.specification.draw(svg);
            }
            if (this.ratioBar) {
                this.ratioBar.draw(svg, this.block.blockPaths, this.block.blocks);
            }
        };
        GsFunnel.prototype.draw = function (data, options) {
            if (options === void 0) { options = {}; }
            this.destroy();
            this._initialize(data, options);
            this._draw();
        };
        GsFunnel.defaultOption = {
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
                spaceWidth: 10
            },
            ratioBar: {
                enable: true,
                postionInblock: true,
                height: 10,
                leftColor: '',
                rightColor: '',
                animationDuring: 400
            }
        };
        return GsFunnel;
    })();
    nuoke.GsFunnel = GsFunnel;
    var Block = (function () {
        function Block(data, chart, curve, gap, labelFormatter, colorizer, chartPaddingLeft) {
            this.curve = curve;
            this.gap = gap;
            this.labelFormatter = labelFormatter;
            this.colorizer = colorizer;
            this.chartPaddingLeft = chartPaddingLeft;
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
        Block.prototype._getYSpace = function () {
            if (this.curve && !this.gap) {
                return (this.layoutHeight - this.curve.height) / this.blocks.length;
            }
            if (this.gap) {
                return (this.layoutHeight - this.gap.height * (this.blocks.length - 1)) / this.blocks.length;
            }
            return this.layoutHeight / this.blocks.length;
        };
        Block.prototype._getXSpace = function () {
            //if (this.gap && this.curve) {
            //    return this.bottomLeftX / this.blocks.length + (this.gap.height + this.curve.height) * (this.bottomLeftX / this.layoutHeight) / this.blocks.length;
            //}
            //if (this.gap && !this.curve) {
            //    return this.bottomLeftX / this.blocks.length + this.gap.height * (this.bottomLeftX / this.layoutHeight) / this.blocks.length;
            //}
            return this.bottomLeftX / this.blocks.length;
        };
        Block.prototype._setBlocks = function (data) {
            //const totalCount = this._getTotalCount(data);
            var totalCount = this._getRawBlockCount(data[0]);
            this.blocks = this._standardizeData(data, totalCount);
        };
        Block.prototype._getTotalCount = function (data) {
            var _this = this;
            var total = 0;
            data.forEach(function (block) {
                total += _this._getRawBlockCount(block);
            });
            return total;
        };
        Block.prototype._standardizeData = function (data, totalCount) {
            var _this = this;
            var standardized = [];
            var count;
            var ratio;
            var label;
            var lastStepCount = 0;
            data.forEach(function (block, index) {
                count = _this._getRawBlockCount(block);
                ratio = totalCount ? (count / totalCount) : 0;
                label = block[0];
                standardized.push({
                    index: index,
                    value: count,
                    ratio: ratio,
                    stepRatio: lastStepCount ? (count / lastStepCount) : 0,
                    height: _this.layoutHeight * ratio,
                    fill: _this.colors[index] ? _this.colorizer.getBlockFill(block, index, _this.fillType, _this.colors[index])
                        : _this.colorizer.getBlockFill(block, index, _this.fillType),
                    label: {
                        raw: label,
                        formatted: _this.labelFormatter.format(label, count),
                        color: _this.colorizer.getLabelFill(block)
                    },
                });
                lastStepCount = count;
            });
            return standardized;
        };
        Block.prototype._getRawBlockCount = function (block) {
            var value = Array.isArray(block[1]) ? block[1][0] : block[1];
            return parseInt(value);
        };
        Block.prototype._creatPaths = function () {
            var paths = [];
            var middle = this.layoutWidth / 2;
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
            var slope = (this.layoutWidth - this.bottomWidth) / slopeHeight / 2;
            if (this.gap) {
                this.gap.setSlope(slope);
                xRevise = this.gap.xRevise;
                yRevise = this.gap.yRevise;
            }
            if (this.curve) {
                prevHeight = this.curve.height;
            }
            var totalHeight = this.layoutHeight;
            this.blocks.forEach(function (block, i) {
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
        };
        Block.prototype._getBlockPath = function (group, index) {
            var path = group.append('path');
            if (this.animationDuring !== 0) {
                this._addBeforeTransition(path, index);
            }
            return path;
        };
        Block.prototype._addBeforeTransition = function (path, index) {
            var paths = this.blockPaths[index];
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
            }
            else {
                beforeFill = this.blocks[index].fill.actual;
            }
            path.attr('d', beforePath)
                .attr('fill', beforeFill);
        };
        Block.prototype._addBlockLabel = function (group, index) {
            var path = this.blockPaths[index];
            var text = this.blocks[index].label.formatted;
            var fill = this.blocks[index].label.color;
            var x = this.layoutWidth / 2 + this.chartPaddingLeft;
            var y = this._getTextY(path);
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
                .style('font-size', '14px'); //something need remove to lable class
        };
        Block.prototype._getTextY = function (paths) {
            var y = (paths[1][1] + paths[2][1]) / 2;
            if (this.curve) {
                y = y + (this.curve.height / this.blocks.length / 2);
            }
            return y;
        };
        Block.prototype._drawBlock = function (svg, index) {
            var _this = this;
            if (index === this.blocks.length) {
                return;
            }
            if (this.curve) {
                this.curve.drawCurve(svg, this.blockPaths[index], this.blocks[index].fill.raw);
            }
            var blockGroup = svg.append('g');
            var path = this._getBlockPath(blockGroup, index);
            path.data([this.blocks[index]]);
            if (this.animationDuring !== 0) {
                path.transition()
                    .duration(this.animationDuring)
                    .ease('linear')
                    .attr('fill', this.blocks[index].fill.actual)
                    .attr('d', Utils.getPathDefinition(index, this.blockPaths))
                    .each('end', function () {
                        _this._drawBlock(svg, index + 1);
                    });
            }
            else {
                path.attr('fill', this.blocks[index].fill.actual)
                    .attr('d', Utils.getPathDefinition(index, this.blockPaths));
                this._drawBlock(svg, index + 1);
            }
            this._addBlockLabel(blockGroup, index);
            // Add the  events
            //todo
        };
        Block.prototype.drawBlocks = function (svg) {
            this.blockPaths = this._creatPaths();
            if (this.fillType === 'gradient') {
                this._defineColorGradients(svg);
            }
            //if (this.curve) {
            //    this.curve.drawCurve(svg, this.blockPaths[0],this.blocks[0].fill.raw);
            //}
            this._drawBlock(svg, 0);
        };
        Block.prototype._defineColorGradients = function (svg) {
            var defs = svg.append('defs');
            // Create a gradient for each block
            this.blocks.forEach(function (block, index) {
                var color = block.fill.raw;
                var shade = Colorizer.shade(color, -0.2);
                // Create linear gradient
                var gradient = defs.append('linearGradient')
                    .attr({
                        id: 'gradient-' + index,
                    });
                // Define the gradient stops
                var stops = [
                    [0, shade],
                    [40, color],
                    [60, color],
                    [100, shade],
                ];
                // Add the gradient stops
                stops.forEach(function (stop) {
                    gradient.append('stop').attr({
                        offset: stop[0] + '%',
                        style: 'stop-color:' + stop[1],
                    });
                });
            });
        };
        return Block;
    })();
    nuoke.Block = Block;
    var Curve = (function () {
        function Curve(curveSettings) {
            this.height = curveSettings.height;
        }
        Curve.prototype.drawCurve = function (svg, blockPath, fill) {
            var leftX = blockPath[0][0];
            var rightX = blockPath[1][0];
            var centerX = (rightX + leftX) / 2;
            var path = blockPath;
            var topCurve = path[1][1] - this.height;
            var downCurve = path[1][1] + this.height;
            var pathD = Utils.convertPathArrayToSvgD([
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
        };
        return Curve;
    })();
    nuoke.Curve = Curve;
    var Gap = (function () {
        function Gap(gapSetting) {
            this.height = gapSetting.height;
        }
        Gap.prototype.setSlope = function (slope) {
            this.slope = slope;
            this.yRevise = this.height / 2;
            this.xRevise = this.height * slope / 2;
        };
        return Gap;
    })();
    nuoke.Gap = Gap;
    var Specification = (function () {
        function Specification(specificationSetting, topContainSpaceWidth, ySpace, block) {
            this.block = block;
            this.marginLeft = 10;
            this.topContainSpaceWidth = topContainSpaceWidth;
            if (this.topContainSpaceWidth < specificationSetting.spaceWidth + this.marginLeft) {
                this.xSpace = topContainSpaceWidth;
            }
            else {
                this.xSpace = specificationSetting.spaceWidth;
            }
            this.ySpace = ySpace;
        }
        Specification.prototype._creatPaths = function (blockPaths) {
            var that = this;
            var paths = [];
            blockPaths.forEach(function (path) {
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
            });
            return paths;
        };
        Specification.prototype._drawSpecificationPath = function (svg, index) {
            if (index === this.specificationPaths.length) {
                return;
            }
            var specificationBlockGroup = svg.append('g');
            var path = specificationBlockGroup.append('path');
            path.attr('fill', '#EFF8FF')
                .attr('d', Utils.getPathDefinition(index, this.specificationPaths));
            this._drawSpecificationPath(svg, index + 1);
        };
        Specification.prototype.draw = function (svg) {
            this.specificationPaths = this._creatPaths(this.block.blockPaths);
            this._drawSpecificationPath(svg, 0);
        };
        return Specification;
    })();
    nuoke.Specification = Specification;
    var RatioBar = (function () {
        function RatioBar(ratioBarSetting) {
            this.positonInBlock = ratioBarSetting.positonInBlock;
            this.leftColor = ratioBarSetting.leftColor;
            this.rightColor = ratioBarSetting.rightColor;
            this.height = ratioBarSetting.height;
            this.animationDuring = ratioBarSetting.animationDuring;
            this.minWidth = 30;
        }
        RatioBar.prototype.draw = function (svg, blockPaths, blocks) {
            this.ratioPaths = this._createPaths(blockPaths, blocks);
            this._drawRatioBar(svg, 0, blocks, blockPaths);
        };
        RatioBar.prototype._createPaths = function (blockPaths, blocks) {
            var that = this;
            var paths = [];
            blockPaths.forEach(function (path, index) {
                if (index == 0) {
                    return;
                }
                var stepRatio = blocks[index].ratio;
                var topXLeft = (blockPaths[index - 1][2][0] - blockPaths[index - 1][3][0]) * (1 - stepRatio) / 2;
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
            });
            return paths;
        };
        RatioBar.prototype._drawRatioBar = function (svg, index, blocks, blockPaths) {
            var _this = this;
            if (index === this.ratioPaths.length) {
                return;
            }
            var ratioBarGroup = svg.append('g');
            var path = ratioBarGroup.append('path');
            if (this.animationDuring !== 0) {
                path.transition()
                    .duration(this.animationDuring)
                    .ease('linear')
                    .attr('fill', '#19C5F9')
                    .attr('fill-opacity', '0.5')
                    .attr('d', Utils.getPathDefinition(index, this.ratioPaths))
                    .each('end', function () {
                        _this._addRatioBarLabel(ratioBarGroup, index, blocks, blockPaths);
                        _this._drawRatioBar(svg, index + 1, blocks, blockPaths);
                    });
            }
            else {
                path.attr('fill', '#19C5F9')
                    .attr('fill-opacity', '0.5')
                    .attr('d', Utils.getPathDefinition(index, this.ratioPaths));
                this._addRatioBarLabel(ratioBarGroup, index, blocks, blockPaths);
                this._drawRatioBar(svg, index + 1, blocks, blockPaths);
            }
        };
        RatioBar.prototype._addRatioBarLabel = function (group, index, blocks, blockPaths) {
            var path = this.ratioPaths[index];
            var savedRatio = blocks[index + 1].stepRatio * 100;
            var costRatio = (1 - blocks[index + 1].stepRatio) * 100;
            var costRatioText = costRatio.toFixed(2) + '%';
            var savedRatioText = savedRatio.toFixed(2) + '%';
            var x1 = (blockPaths[index][2][0] - blockPaths[index][3][0]) / 2 + blockPaths[index][3][0];
            var x2 = blockPaths[index][2][0];
            var y = path[3][1] - (path[3][1] - path[1][1]) / 2;
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
        };
        return RatioBar;
    })();
    nuoke.RatioBar = RatioBar;
    var Utils = (function () {
        function Utils() {
        }
        Utils.extend = function (a, b) {
            var prop;
            for (prop in b) {
                if (b.hasOwnProperty(prop)) {
                    if (typeof b[prop] === 'object' && !Array.isArray(b[prop]) && b[prop] !== null) {
                        if (typeof a[prop] === 'object' && !Array.isArray(a[prop]) && b[prop] !== null) {
                            a[prop] = Utils.extend(a[prop], b[prop]);
                        }
                        else {
                            a[prop] = Utils.extend({}, b[prop]);
                        }
                    }
                    else {
                        a[prop] = b[prop];
                    }
                }
            }
            return a;
        };
        Utils.getRangeColors = function (value) {
            //todo
        };
        Utils.convertPathArrayToSvgD = function (pathArray) {
            var path = '';
            pathArray.forEach(function (command) {
                path += command[0] + command[1] + ',' + command[2] + ' ';
            });
            return path.replace(/ +/g, ' ').trim();
        };
        Utils.getPathDefinition = function (index, pathsWithMLLL) {
            var commands = [];
            pathsWithMLLL[index].forEach(function (command) {
                commands.push([command[2], command[0], command[1]]);
            });
            return Utils.convertPathArrayToSvgD(commands);
        };
        return Utils;
    })();
    var LabelFormatter = (function () {
        function LabelFormatter() {
            this.expression = null;
        }
        /**
         * Register the format function.
         *
         * @param {string|function} format
         *
         * @return {void}
         */
        LabelFormatter.prototype.setFormat = function (format) {
            if (typeof format === 'function') {
                this.formatter = format;
            }
            else {
                this.expression = format;
                this.formatter = this.stringFormatter;
            }
        };
        /**
         * Format the given value according to the data point or the format.
         *
         * @param {string} label
         * @param {number} value
         *
         * @return string
         */
        LabelFormatter.prototype.format = function (label, value) {
            // Try to use any formatted value specified through the data
            // Otherwise, attempt to use the format function
            if (Array.isArray(value)) {
                return this.formatter(label, value[0], value[1]);
            }
            return this.formatter(label, value, null);
        };
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
        LabelFormatter.prototype.stringFormatter = function (label, value, fValue) {
            if (fValue === void 0) { fValue = null; }
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
        };
        /**
         * @param {number} value
         *
         * @return {string}
         */
        LabelFormatter.prototype.getDefaultFormattedValue = function (value) {
            return value.toLocaleString();
        };
        return LabelFormatter;
    })();
    nuoke.LabelFormatter = LabelFormatter;
    var Colorizer = (function () {
        function Colorizer(labelFill, scale) {
            this.hexExpression = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
            this.labelFill = labelFill;
            this.scale = scale;
        }
        /**
         * @param {string} fill
         *
         * @return {void}
         */
        Colorizer.prototype.setLabelFill = function (fill) {
            this.labelFill = fill;
        };
        /**
         * @param {function|Array} scale
         *
         * @return {void}
         */
        Colorizer.prototype.setScale = function (scale) {
            this.scale = scale;
        };
        /**
         * Given a raw data block, return an appropriate color for the block.
         *
         * @param {Array}  block
         * @param {Number} index
         * @param {string} type
         *
         * @return {Object}
         */
        Colorizer.prototype.getBlockFill = function (block, index, type, color) {
            var raw;
            if (color) {
                raw = color;
            }
            else {
                raw = this.getBlockRawFill(block, index);
            }
            return {
                raw: raw,
                actual: this.getBlockActualFill(raw, index, type),
            };
        };
        /**
         * Return the raw hex color for the block.
         *
         * @param {Array}  block
         * @param {Number} index
         *
         * @return {string}
         */
        Colorizer.prototype.getBlockRawFill = function (block, index) {
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
        };
        /**
         * Return the actual background for the block.
         *
         * @param {string} raw
         * @param {Number} index
         * @param {string} type
         *
         * @return {string}
         */
        Colorizer.prototype.getBlockActualFill = function (raw, index, type) {
            if (type === 'solid') {
                return raw;
            }
            return 'url(#gradient-' + index + ')';
        };
        /**
         * Given a raw data block, return an appropriate label color.
         *
         * @param {Array} block
         *
         * @return {string}
         */
        Colorizer.prototype.getLabelFill = function (block) {
            // Use the label's color, if set and valid
            if (block.length > 3 && this.hexExpression.test(block[3])) {
                return block[3];
            }
            return this.labelFill;
        };
        /**
         * Shade a color to the given percentage.
         *
         * @param {string} color A hex color.
         * @param {number} shade The shade adjustment. Can be positive or negative.
         *
         * @return {string}
         */
        Colorizer.shade = function (color, shade) {
            var hex = color.slice(1);
            if (hex.length === 3) {
                hex = Colorizer.expandHex(hex);
            }
            var f = parseInt(hex, 16);
            var t = shade < 0 ? 0 : 255;
            var p = shade < 0 ? shade * -1 : shade;
            var R = f >> 16;
            var G = f >> 8 & 0x00FF;
            var B = f & 0x0000FF;
            var converted = 0x1000000 +
                (Math.round((t - R) * p) + R) * 0x10000 +
                (Math.round((t - G) * p) + G) * 0x100 +
                (Math.round((t - B) * p) + B);
            return '#' + converted.toString(16).slice(1);
        };
        /**
         * Expands a three character hex code to six characters.
         *
         * @param {string} hex
         *
         * @return {string}
         */
        Colorizer.expandHex = function (hex) {
            return hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        };
        return Colorizer;
    })();
})(nuoke || (nuoke = {}));
