'use strict';
/* Copper Coast Air Rally — input.js
   One place for every control: keyboard (arrows + WASD), mouse steering
   on the canvas, wheel throttle, and clickable menu buttons. The game
   reads this object, never raw events, so play-testing and the
   deterministic screenshot states can drive the same interface. */

class InputState {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = {};
    this.mouseX = 0.5;          // 0..1 across the canvas
    this.mouseY = 0.5;
    this.mouseActive = false;   // mouse steering only after the pilot moves it
    this.mouseDown = false;
    this.wheelDelta = 0;
    this.clicked = null;        // {x, y} of the latest click, consumed by menus
    this.anyKey = false;        // set on any keydown, cleared by the game loop

    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (!e.repeat) this.anyKey = true;
      this.keys[e.key.toLowerCase()] = true;
      this.keys[e.code] = true;
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
      this.keys[e.code] = false;
    });
    window.addEventListener('blur', () => { this.keys = {}; });
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouseX = (e.clientX - r.left) / Math.max(1, r.width);
      this.mouseY = (e.clientY - r.top) / Math.max(1, r.height);
      this.mouseActive = true;
    });
    canvas.addEventListener('mousedown', (e) => {
      const r = canvas.getBoundingClientRect();
      this.clicked = {
        x: (e.clientX - r.left) / Math.max(1, r.width) * CANVAS_W,
        y: (e.clientY - r.top) / Math.max(1, r.height) * CANVAS_H,
      };
      this.mouseDown = true;
    });
    window.addEventListener('mouseup', () => { this.mouseDown = false; });
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.wheelDelta += e.deltaY;
    }, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  held(...names) {
    return names.some((n) => this.keys[n]);
  }

  /* -1..1 roll command: keyboard first, mouse steering as a gentle assist. */
  rollCommand() {
    let v = 0;
    if (this.held('arrowleft', 'a')) v -= 1;
    if (this.held('arrowright', 'd')) v += 1;
    if (v !== 0) return v;
    if (this.mouseActive) {
      const off = this.mouseX - 0.5;
      if (Math.abs(off) > 0.08) return Math.max(-1, Math.min(1, off * 2.2));
    }
    return 0;
  }

  /* -1..1 pitch command: up is pull up (climb). */
  pitchCommand() {
    let v = 0;
    if (this.held('arrowup', 'w')) v += 1;
    if (this.held('arrowdown', 's')) v -= 1;
    return v;
  }

  throttleCommand(dt) {
    let v = 0;
    if (this.held('shift')) v += 1;
    if (this.held('control', 'c')) v -= 1;
    if (this.held('pageup')) v += 1;
    if (this.held('pagedown')) v -= 1;
    if (this.wheelDelta !== 0) {
      v += this.wheelDelta > 0 ? -0.35 : 0.35;
      this.wheelDelta = 0;
    }
    return v;
  }

  consumeClick() {
    const c = this.clicked;
    this.clicked = null;
    return c;
  }

  consumeAnyKey() {
    const k = this.anyKey;
    this.anyKey = false;
    return k;
  }
}
