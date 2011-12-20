var Canvas;
(function()
{
    var uId = 0;

    Canvas = function(canvasEl, fps)
    {
        if(typeof canvasEl == 'string')
        {
            canvasEl = document.getElementById(canvasEl);
        }
        else if(!canvasEl.nodeName || canvasEl.nodeName.toLowerCase() != 'canvas')
        {
            throw new Error('Canvas constructor should be passed a canvas element or canvas element id');
            return null;
        }

        this.canvasEl = canvasEl;
        this.context = canvasEl.getContext('2d');
        this.fps = fps || 100;
        this.lastAnimationFrameCount = 0;
    };

    Canvas.prototype.setSize = function(w, h)
    {
        this.canvasEl.width = w;
        this.canvasEl.height = h;
    }

    Canvas.prototype.loadImage = function(imgSrc, fnLoad)
    {
        var imgEl = new Image();
        var that = this;
        imgEl.onload = function()
        {
            that.context.drawImage(imgEl, 0, 0);
            if(typeof fnLoad == 'function')
            {
                fnLoad.call(that);
            }
        };
        imgEl.src = imgSrc;
    };

    var piSqr = Math.PI * 2;
    Canvas.prototype.circularEraser = function(x, y, r, onFinish)
    {
        var erasedFrames = 0;
        var ctx = this.context;
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0, 0, 0, 1)';
        ctx.lineWidth = 2 * r;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, piSqr);
        ctx.fill();

        ctx.beginPath();

        var cEl = this.canvasEl;
        var lastX = x;
        var lastY = y;
        var trackMovement = function(e)
        {
            e.preventDefault();
            var tt = e.targetTouches[0];
            x = tt.pageX;
            y = tt.pageY;
        };

        var docEl = document.documentElement;
        docEl.addEventListener(
            'touchmove',
            trackMovement,
            false
        );


        var erase = function()
        {
            ctx.beginPath();

            // Draws a parallelogram to fill the area between the last circle
            // and the new circle we'll draw on the destination point
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(x, y);
            ctx.stroke();

            // Draws the destination circle
            ctx.arc(x, y, r, 0, piSqr);
            ctx.fill();

            lastX = x;
            lastY = y;

            ++erasedFrames;
        };

        var inter = window.setInterval(
            erase,
            1000 / this.fps
        );

        var that = this;
        var stopErasing = function()
        {
            docEl.removeEventListener('touchmove', erase, false);
            docEl.removeEventListener('touchend', stopErasing, false);
            ctx.fill();
            ctx.restore();
            window.clearInterval(inter);
            that.lastAnimationFrameCount = erasedFrames;

            if(typeof onFinish == 'function')
            {
                onFinish.call(that);
            }
        };

        docEl.addEventListener('touchend', stopErasing, false);
    };

    Canvas.prototype.calibrateChromaKey = function(imgSrc)
    {
        var innerFn = function()
        {
            var colorData = this.context.getImageData(0,0,this.canvasEl.width,this.canvasEl.height).data;
            console.log(colorData.length);
            var highest = [0, 0, 0];
            var lowest = [255, 255, 255];
            for(var i = colorData.length - 4, j; (i -= 4) >= 0;)
            {
                for(j = 3; --j >= 0;)
                {
                    if(colorData[i + j] > highest[j])
                    {
                        highest[j] = colorData[i + j];
                    }

                    if(colorData[i + j] < lowest[j])
                    {
                        lowest[j] = colorData[i + j];
                    }
                }
            }

            this.chromaRange = [lowest, highest];
            this.canvasEl.width = this.canvasEl.width;
        };
        this.loadImage(imgSrc, innerFn);
    };

    var getGreatestContigousIndex = function(arr, start)
    {
        if(typeof start == 'undefined')
        {
            start = 0;
        }

        while(arr[start])
        {
            ++start;
        }

        return start;
    };

    Canvas.prototype.applyChromaKey = function()
    {
        if(!this.chromaRange)
        {
            throw new Error('You must call calibrateChromaKey before applying it.');
        }

        var lowest = this.chromaRange[0];
        var highest = this.chromaRange[1];
        var ctx = this.context;
        var width = this.canvasEl.width;
        var height = this.canvasEl.height;
        var colorData = ctx.getImageData(0, 0, width, height).data;
        var toClear = new Array(height);
        for(var k = width; --k >= 0;)
        {
            toClear[k] = new Array(width);
        }

        var cd;
        for(var l = colorData.length, i = l - 4; (i -= 4) >= 0;)
        {
            cd = [colorData[i], colorData[i + 1], colorData[i + 2]];
            //console.log(cd);return;
            //console.log(Array.prototype.slice.call(colorData), lowest, highest);return;
            if(
                (cd[0] >= lowest[0] && cd[0] <= highest[0]) &&
                (cd[1] >= lowest[1] && cd[1] <= highest[1]) &&
                (cd[2] >= lowest[2] && cd[2] <= highest[2])
            )
            {
                //toClear.push([i%width, Math.floor(i/width/4)]);
                ctx.clearRect((i/4) % width, Math.floor((i/4) / width), 1, 1);
                //toClear[Math.floor((i/4) / width)][(i/4) % width] = true;
            }
        }
        return;

        // TODO: Clear rectangles with the biggest area possible
        var clrW, clrH, oX, oY, maxX, maxY;
        for(i = 0, l = toClear.length; i < l; ++i)
        {
            clrH = 1;
            clrW = 1;
            oY = i;

            maxY = getGreatestContigousIndex(toClear, i);
            maxX = getGreatestContigousIndex(toClear[i])
            calcRectangle: while(toClear[i][0])
            {
                for(j = 0; j < width; ++j)
                {
                    if(!toClear[i][j])
                    {
                        break calcRectangle;
                    }
                    ++clrW;
                }
                ++clrH;
                ++i
            }

            ctx.clearRect((i/4) % width, Math.floor((i/4) / width), 1, 1);

        }
        //console.log(toClear[toClear.length - 1], toClear[0]);
        //console.log(toClear);
    };

})();
