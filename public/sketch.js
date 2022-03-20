(() => {
  class Eraser {
    constructor(context, options) {
      this.context = context;
      this.pointerPaths = [];
      this.pointerStatus = false;
      this.minRadius = 16;
      this.maxRadius = 100;
      this.radiusFactor = 0.5;
      this.radius = options.radius || 16;
      this.init();
    }

    init() {
      console.log("[Eraser::init]");
      const { upperCanvasEl } = this.context;

      this.onMouseDown = this.onMouseDown.bind(this);
      this.onMouseMove = this.onMouseMove.bind(this);
      this.onMouseUp = this.onMouseUp.bind(this);
      this.onMouseLeave = this.onMouseLeave.bind(this);
      this.onTouchStart = this.onTouchStart.bind(this);
      this.onTouchMove = this.onTouchMove.bind(this);
      this.onTouchEnd = this.onTouchEnd.bind(this);

      upperCanvasEl.addEventListener("mousedown", this.onMouseDown);
      upperCanvasEl.addEventListener("mousemove", this.onMouseMove);
      upperCanvasEl.addEventListener("mouseup", this.onMouseUp);
      upperCanvasEl.addEventListener("mouseleave", this.onMouseLeave);
      upperCanvasEl.addEventListener("touchstart", this.onTouchStart);
      upperCanvasEl.addEventListener("touchmove", this.onTouchMove);
      upperCanvasEl.addEventListener("touchend", this.onTouchEnd);
    }

    destroy() {
      console.log("[Eraser::destroy]");
      const { upperCanvasEl } = this.context;
      upperCanvasEl.removeEventListener("mousedown", this.onMouseDown);
      upperCanvasEl.removeEventListener("mousemove", this.onMouseMove);
      upperCanvasEl.removeEventListener("mouseup", this.onMouseUp);
      upperCanvasEl.removeEventListener("mouseleave", this.onMouseLeave);
      upperCanvasEl.removeEventListener("touchstart", this.onTouchStart);
      upperCanvasEl.removeEventListener("touchmove", this.onTouchMove);
      upperCanvasEl.removeEventListener("touchend", this.onTouchEnd);
    }

    onMouseDown(event) {
      event.preventDefault();
      if (this.pointerStatus) {
        return;
      }
      this.pointerStatus = true;
      const pointer = this.getPointer(event);
      this.onPointerDown(pointer);
    }

    onMouseMove(event) {
      event.preventDefault();
      if (!this.pointerStatus) {
        return;
      }
      const pointer = this.getPointer(event);
      this.onPointerMove(pointer);
    }

    onMouseUp(event) {
      event.preventDefault();
      if (!this.pointerStatus) {
        return;
      }
      this.pointerStatus = false;
      this.onPointerUp();
    }

    onMouseLeave(event) {
      event.preventDefault();
      if (!this.pointerStatus) {
        return;
      }
      this.pointerStatus = false;
      this.onPointerUp();
    }

    onTouchStart(event) {
      event.preventDefault();
      if (this.pointerStatus) {
        return;
      }
      this.pointerStatus = true;
      const pointer = this.getPointer(event);
      this.onPointerDown(pointer);
    }

    onTouchMove(event) {
      event.preventDefault();
      if (!this.pointerStatus) {
        return;
      }
      const pointer = this.getPointer(event);
      this.onPointerMove(pointer);
    }

    onTouchEnd(event) {
      event.preventDefault();
      if (!this.pointerStatus) {
        return;
      }
      const pointer = this.getPointer(event);
      if (pointer) {
        return;
      }
      this.pointerStatus = false;
      this.onPointerUp();
    }

    onPointerDown(pointer) {
      console.log("[Eraser::Down]");
      this.addCursor();
      this.moveCursor(pointer.x, pointer.y);
      this.pointerPaths = [];
      this.pointerPaths.push(pointer);
    }

    onPointerMove(pointer) {
      const radius = this.calcEraserRadius();
      if (radius) {
        this.radius = radius;
      }
      this.moveCursor(pointer.x, pointer.y);
      this.context.clearLowerCanvasCircle(pointer, this.radius);
      this.pointerPaths.push(pointer);
    }

    onPointerUp() {
      console.log("[Eraser::Up]");
      const { lowerCanvasEl, socketIo } = this.context;
      this.removeCursor();
      this.pointerPaths = [];
      const dataURL = lowerCanvasEl.toDataURL("image/png");
      socketIo.emit("canvas:erased", dataURL);
    }

    addCursor() {
      const { containerEl } = this.context;

      this.cursorEl = document.createElement("div");
      this.cursorEl.style.position = "absolute";
      this.cursorEl.style.backgroundColor = "rgba(255,255,255,0.5)";
      this.cursorEl.style.pointerEvents = "none";
      containerEl.appendChild(this.cursorEl);
    }

    moveCursor(posX, posY) {
      this.cursorEl.style.width = `${this.radius * 2}px`;
      this.cursorEl.style.height = `${this.radius * 2}px`;
      this.cursorEl.style.left = `${posX - this.radius}px`;
      this.cursorEl.style.top = `${posY - this.radius}px`;
      this.cursorEl.style.borderRadius = `${this.radius}px`;
    }

    removeCursor() {
      const { containerEl } = this.context;
      containerEl.removeChild(this.cursorEl);
    }

    getPointer(event) {
      const { upperCanvasEl, contextRect, isReversed } = this.context;

      if (event.touches) {
        for (const touchPoint of event.touches) {
          if (touchPoint.target == upperCanvasEl) {
            const pointer = {
              x: touchPoint.clientX - contextRect.left,
              y: touchPoint.clientY - contextRect.top,
            };

            if (isReversed) {
              pointer.x = contextRect.width - pointer.x;
              pointer.y = contextRect.height - pointer.y;
            }

            return pointer;
          }
        }
      } else {
        const pointer = {
          x: event.clientX - contextRect.left,
          y: event.clientY - contextRect.top,
        };

        if (isReversed) {
          pointer.x = contextRect.width - pointer.x;
          pointer.y = contextRect.height - pointer.y;
        }

        return pointer;
      }
    }

    calcEraserRadius() {
      if (this.pointerPaths && this.pointerPaths.length > 1) {
        const [penultimatePoint, lastPoint] = this.pointerPaths.slice(-2);

        const distance = Math.sqrt(
          Math.pow(lastPoint.x - penultimatePoint.x, 2),
          Math.pow(lastPoint.y - penultimatePoint.y, 2)
        );

        const radius = this.minRadius + distance * this.radiusFactor;
        if (radius > this.maxRadius) {
          return this.maxRadius;
        }
        return radius;
      }
    }
  }

  class Brush {
    constructor(context, options) {
      this.context = context;
      this.strokeColor = options.strokeColor || "red";
      this.lineWidth = options.lineWidth || 2;
      this.lineJoin = options.lineJoin || "round";
      this.lineCap = options.lineCap || "round";
      this.pointerPaths = [];
      this.pointerStatus = false;
      this.beginPoint = null;
      this.init();
    }

    init() {
      console.log("[Brush::init]");
      const { upperCanvasEl } = this.context;
      this.setStrokeColor(this.strokeColor);
      this.setLineWidth(this.lineWidth);
      this.setLineJoin(this.lineJoin);
      this.setLineCap(this.lineCap);

      this.onMouseDown = this.onMouseDown.bind(this);
      this.onMouseMove = this.onMouseMove.bind(this);
      this.onMouseUp = this.onMouseUp.bind(this);
      this.onMouseLeave = this.onMouseLeave.bind(this);
      this.onTouchStart = this.onTouchStart.bind(this);
      this.onTouchMove = this.onTouchMove.bind(this);
      this.onTouchEnd = this.onTouchEnd.bind(this);

      upperCanvasEl.addEventListener("mousedown", this.onMouseDown);
      upperCanvasEl.addEventListener("mousemove", this.onMouseMove);
      upperCanvasEl.addEventListener("mouseup", this.onMouseUp);
      upperCanvasEl.addEventListener("mouseleave", this.onMouseLeave);
      upperCanvasEl.addEventListener("touchstart", this.onTouchStart);
      upperCanvasEl.addEventListener("touchmove", this.onTouchMove);
      upperCanvasEl.addEventListener("touchend", this.onTouchEnd);
    }

    destroy() {
      console.log("[Brush::destroy]");
      const { upperCanvasEl } = this.context;
      upperCanvasEl.removeEventListener("mousedown", this.onMouseDown);
      upperCanvasEl.removeEventListener("mousemove", this.onMouseMove);
      upperCanvasEl.removeEventListener("mouseup", this.onMouseUp);
      upperCanvasEl.removeEventListener("mouseleave", this.onMouseLeave);
      upperCanvasEl.removeEventListener("touchstart", this.onTouchStart);
      upperCanvasEl.removeEventListener("touchmove", this.onTouchMove);
      upperCanvasEl.removeEventListener("touchend", this.onTouchEnd);
    }

    onMouseDown(event) {
      event.preventDefault();
      if (this.pointerStatus) {
        return;
      }
      this.pointerStatus = true;
      const pointer = this.getPointer(event);
      this.onPointerDown(pointer);
    }

    onMouseMove(event) {
      event.preventDefault();
      if (!this.pointerStatus) {
        return;
      }
      const pointer = this.getPointer(event);
      this.onPointerMove(pointer);
    }

    onMouseUp(event) {
      event.preventDefault();
      if (!this.pointerStatus) {
        return;
      }
      this.pointerStatus = false;
      this.onPointerUp();
    }

    onMouseLeave(event) {
      event.preventDefault();
      if (!this.pointerStatus) {
        return;
      }
      this.pointerStatus = false;
      this.onPointerUp();
    }

    onTouchStart(event) {
      event.preventDefault();
      if (this.pointerStatus) {
        return;
      }
      this.pointerStatus = true;
      const pointer = this.getPointer(event);
      this.onPointerDown(pointer);
    }

    onTouchMove(event) {
      event.preventDefault();
      if (!this.pointerStatus) {
        return;
      }
      const pointer = this.getPointer(event);
      this.onPointerMove(pointer);
    }

    onTouchEnd(event) {
      event.preventDefault();
      if (!this.pointerStatus) {
        return;
      }
      const pointer = this.getPointer(event);
      if (pointer) {
        return;
      }
      this.pointerStatus = false;
      this.onPointerUp();
    }

    onPointerDown(pointer) {
      console.log("[Brush::Down]");
      this.pointerPaths = [];
      this.beginPoint = pointer;
      this.pointerPaths.push(pointer);
    }

    onPointerMove(pointer) {
      this.pointerPaths.push(pointer);
      if (this.pointerPaths.length < 3) {
        return;
      }

      const [controlPoint, lastPoint] = this.pointerPaths.slice(-2);
      const endPoint = {
        x: (controlPoint.x + lastPoint.x) / 2,
        y: (controlPoint.y + lastPoint.y) / 2,
      };
      this.drawLine(this.beginPoint, controlPoint, endPoint);
      this.beginPoint = endPoint;
    }

    onPointerUp() {
      console.log("[Brush::Up]");
      const {
        upperCanvasEl,
        upperCanvasCtx,
        lowerCanvasEl,
        lowerCanvasCtx,
        socketIo,
      } = this.context;

      upperCanvasCtx.closePath();

      lowerCanvasCtx.drawImage(
        upperCanvasEl,
        0,
        0,
        lowerCanvasEl.width,
        lowerCanvasEl.height
      );
      const dataURL = upperCanvasEl.toDataURL("image/png");
      socketIo.emit("canvas:update", dataURL);

      this.context.clearUpperCanvas();
    }

    drawLine(beginPoint, controlPoint, endPoint) {
      const { upperCanvasCtx } = this.context;
      upperCanvasCtx.beginPath();
      upperCanvasCtx.moveTo(beginPoint.x, beginPoint.y);
      upperCanvasCtx.quadraticCurveTo(
        controlPoint.x,
        controlPoint.y,
        endPoint.x,
        endPoint.y
      );
      upperCanvasCtx.stroke();
      upperCanvasCtx.closePath();
    }

    getPointer(event) {
      const { upperCanvasEl, contextRect, isReversed } = this.context;

      if (event.touches) {
        for (const touchPoint of event.touches) {
          if (touchPoint.target == upperCanvasEl) {
            const pointer = {
              x: touchPoint.clientX - contextRect.left,
              y: touchPoint.clientY - contextRect.top,
            };

            if (isReversed) {
              pointer.x = contextRect.width - pointer.x;
              pointer.y = contextRect.height - pointer.y;
            }

            return pointer;
          }
        }
      } else {
        const pointer = {
          x: event.clientX - contextRect.left,
          y: event.clientY - contextRect.top,
        };

        if (isReversed) {
          pointer.x = contextRect.width - pointer.x;
          pointer.y = contextRect.height - pointer.y;
        }

        return pointer;
      }
    }

    setStrokeColor(strokeColor) {
      this.strokeColor = strokeColor;
      const { upperCanvasCtx } = this.context;
      upperCanvasCtx.strokeStyle = this.strokeColor;
    }

    setLineWidth(lineWidth) {
      this.lineWidth = lineWidth;
      const { upperCanvasCtx } = this.context;
      upperCanvasCtx.lineWidth = this.lineWidth;
    }

    setLineJoin(lineJoin) {
      this.lineJoin = lineJoin;
      const { upperCanvasCtx } = this.context;
      upperCanvasCtx.lineJoin = this.lineJoin;
    }

    setLineCap(lineCap) {
      this.lineCap = lineCap;
      const { upperCanvasCtx } = this.context;
      upperCanvasCtx.lineCap = this.lineCap;
    }
  }

  class Context {
    constructor(target, options) {
      if (typeof target == "string") {
        this.targetEl = document.querySelector(target);
      } else {
        this.targetEl = target;
      }
      this.contextRect = this.targetEl.getBoundingClientRect();
      this.serverUrl = options.serverUrl || "";
      this.canvasWidth = options.width || 600;
      this.canvasHeight = options.height || 300;
      this.isReversed = options.reversed || false;
      this.init();
    }

    init() {
      console.log("[Context::init]");
      this.lowerCanvasEl = document.createElement("canvas");
      this.lowerCanvasCtx = this.lowerCanvasEl.getContext("2d");
      this.lowerCanvasEl.width = this.canvasWidth;
      this.lowerCanvasEl.height = this.canvasHeight;
      this.lowerCanvasEl.style.position = "absolute";
      this.lowerCanvasEl.style.left = "0px";
      this.lowerCanvasEl.style.top = "0px";

      this.upperCanvasEl = document.createElement("canvas");
      this.upperCanvasCtx = this.upperCanvasEl.getContext("2d");
      this.upperCanvasEl.width = this.canvasWidth;
      this.upperCanvasEl.height = this.canvasHeight;
      this.upperCanvasEl.style.position = "absolute";
      this.upperCanvasEl.style.left = "0px";
      this.upperCanvasEl.style.top = "0px";

      this.containerEl = document.createElement("div");
      this.containerEl.style.position = "relative";
      this.containerEl.style.left = "0px";
      this.containerEl.style.top = "0px";
      this.containerEl.style.touchAction = "none";
      this.containerEl.style.userSelect = "none";

      this.containerEl.appendChild(this.lowerCanvasEl);
      this.containerEl.appendChild(this.upperCanvasEl);
      this.targetEl.appendChild(this.containerEl);

      this.onSocketConnect = this.onSocketConnect.bind(this);
      this.onSocketDisConnect = this.onSocketDisConnect.bind(this);
      this.onCanvasUpdate = this.onCanvasUpdate.bind(this);
      this.onCanvasClear = this.onCanvasClear.bind(this);
      this.onCanvasErased = this.onCanvasErased.bind(this);

      this.socketIo = io.connect(this.serverUrl);
      this.socketIo.on("connect", this.onSocketConnect);
      this.socketIo.on("disconnect", this.onSocketDisConnect);
      this.socketIo.on("canvas:update", this.onCanvasUpdate);
      this.socketIo.on("canvas:clear", this.onCanvasClear);
      this.socketIo.on("canvas:erased", this.onCanvasErased);
    }

    destroy() {
      console.log("[Context::destroy]");
      this.socketIo.off("connect", this.onSocketConnect);
      this.socketIo.off("disconnect", this.onSocketDisConnect);
      this.socketIo.off("canvas:update", this.onCanvasUpdate);
      this.socketIo.off("canvas:erased", this.onCanvasErased);
      this.targetEl.removeChild(this.containerEl);
    }

    clearUpperCanvas() {
      this.upperCanvasCtx.clearRect(
        0,
        0,
        this.upperCanvasEl.width,
        this.upperCanvasEl.height
      );
    }

    clear() {
      this.clearUpperCanvas();
      this.clearLowerCanvas();
      this.socketIo.emit("canvas:clear");
    }

    clearLowerCanvasCircle(center, radius) {
      this.lowerCanvasCtx.clearRect(
        center.x - radius / 2,
        center.y - radius / 2,
        radius,
        radius
      );
    }

    clearLowerCanvas() {
      this.lowerCanvasCtx.clearRect(
        0,
        0,
        this.lowerCanvasEl.width,
        this.lowerCanvasEl.height
      );
    }

    drawDataURL(dataURL) {
      const img = document.createElement("img");
      img.onload = () => {
        this.lowerCanvasCtx.drawImage(
          img,
          0,
          0,
          this.canvasWidth,
          this.canvasHeight
        );
      };
      img.src = dataURL;
    }

    toDataURL() {
      return this.lowerCanvasEl.toDataURL("image/png");
    }

    onSocketConnect() {
      console.log("[Context::connect]");
    }

    onSocketDisConnect() {
      console.log("[Context::disconnect]");
    }

    onCanvasUpdate(dataURL) {
      console.log("[Context::update]");
      this.drawDataURL(dataURL);
    }

    onCanvasErased(dataURL) {
      console.log("[Context::erased]");
      this.clearLowerCanvas();
      this.drawDataURL(dataURL);
    }

    onCanvasClear() {
      console.log("[Context::clear]");
      this.clearUpperCanvas();
      this.clearLowerCanvas();
    }
  }

  const sketch = {};
  sketch.Context = Context;
  sketch.Brush = Brush;
  sketch.Eraser = Eraser;
  globalThis.sketch = sketch;
})();
