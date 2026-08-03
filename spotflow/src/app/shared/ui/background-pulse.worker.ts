/// <reference lib="webworker" />

// anime.js cannot be imported here at all: its module-level init runs
// `isBrowser ? requestAnimationFrame : setImmediate` immediately, and a
// dedicated Worker has no `window` (only `self`), so `isBrowser` is false
// and it references Node's setImmediate, which throws and crashes the
// worker before any of our code even runs. Easing is reimplemented inline
// instead of importing anime.js's (otherwise identical) inOutSine.
const easeInOutSine = (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2;

type InitMessage = {
  type: 'init';
  canvas: OffscreenCanvas;
  width: number;
  height: number;
};

type ResizeMessage = { type: 'resize'; width: number; height: number };
type StopMessage = { type: 'stop' };

type WorkerMessage = InitMessage | ResizeMessage | StopMessage;

const CYCLE_MS = 1600;

let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;
let width = 0;
let height = 0;
let running = false;
let rafHandle: number | ReturnType<typeof setTimeout> | null = null;

const pulse = { offset: 0, intensity: 0 };

const draw = (): void => {
  if (!ctx) {
    return;
  }

  ctx.clearRect(0, 0, width, height);

  const barCount = 5;
  const barHeight = Math.max(height / (barCount * 12), 1.5);
  const baseOpacity = 0.015 + pulse.intensity * 0.03;

  for (let i = 0; i < barCount; i++) {
    const y = (height / barCount) * i + pulse.offset;

    ctx.fillStyle = `rgba(224, 64, 64, ${baseOpacity})`;
    ctx.fillRect(-2, y, width, barHeight);

    ctx.fillStyle = `rgba(64, 200, 224, ${baseOpacity})`;
    ctx.fillRect(2, y + 1, width, barHeight);
  }
};

const requestNextFrame = (callback: () => void): (typeof rafHandle) =>
  typeof self.requestAnimationFrame === 'function'
    ? self.requestAnimationFrame(callback)
    : setTimeout(callback, 16);

const tick = (now: number): void => {
  if (!running) {
    return;
  }

  // Two half-cycles (0→1→0) per CYCLE_MS, eased in-out-sine.
  const halfCycle = CYCLE_MS / 2;
  const progress = (now % CYCLE_MS) / halfCycle;
  const t = progress <= 1 ? progress : 2 - progress;
  const eased = easeInOutSine(t);

  pulse.intensity = eased;
  pulse.offset = eased * 6;

  draw();
  rafHandle = requestNextFrame(tick);
};

const startPulseLoop = (): void => {
  running = true;
  rafHandle = requestNextFrame(tick);
};

const stopPulseLoop = (): void => {
  running = false;
  if (rafHandle !== null) {
    if (typeof self.cancelAnimationFrame === 'function') {
      self.cancelAnimationFrame(rafHandle as number);
    } else {
      clearTimeout(rafHandle as ReturnType<typeof setTimeout>);
    }
    rafHandle = null;
  }
};

self.onmessage = ({ data }: MessageEvent<WorkerMessage>) => {
  if (data.type === 'init') {
    canvas = data.canvas;
    width = data.width;
    height = data.height;
    canvas.width = width;
    canvas.height = height;
    ctx = canvas.getContext('2d');
    startPulseLoop();
    return;
  }

  if (data.type === 'resize') {
    width = data.width;
    height = data.height;
    if (canvas) {
      canvas.width = width;
      canvas.height = height;
    }
    return;
  }

  if (data.type === 'stop') {
    stopPulseLoop();
    self.close();
  }
};
