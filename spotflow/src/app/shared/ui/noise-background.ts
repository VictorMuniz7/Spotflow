import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  afterNextRender,
} from '@angular/core';

/**
 * Fixed grain overlay behind all pages (analog-film look from the visual
 * reference), plus the constant background "heartbeat" glitch pulse from
 * PRD 11: an OffscreenCanvas transferred to a Web Worker so the animation
 * never touches the main thread. Falls back to a static overlay (no canvas
 * pulse) when OffscreenCanvas/worker transfer isn't supported.
 */
@Component({
  selector: 'app-noise-background',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #grain class="grain-overlay" aria-hidden="true"></div>
    <canvas #pulseCanvas class="pulse-canvas" aria-hidden="true"></canvas>
  `,
  styles: `
    .pulse-canvas {
      position: fixed;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      width: 100%;
      height: 100%;
    }

    .grain-overlay.grain-overlay--fallback-pulse {
      animation: grain-breathe 3.2s ease-in-out infinite;
    }

    @keyframes grain-breathe {
      0%,
      100% {
        opacity: 0.06;
      }
      50% {
        opacity: 0.1;
      }
    }
  `,
})
export class NoiseBackground implements OnDestroy {
  @ViewChild('pulseCanvas') private readonly canvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('grain') private readonly grainRef?: ElementRef<HTMLDivElement>;

  private worker: Worker | null = null;
  private resizeListener: (() => void) | null = null;

  constructor() {
    afterNextRender(() => this.startPulse());
  }

  ngOnDestroy(): void {
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }
    this.worker?.postMessage({ type: 'stop' });
    this.worker?.terminate();
  }

  private startPulse(): void {
    const canvas = this.canvasRef?.nativeElement;
    const supportsOffscreenPulse =
      !!canvas && 'transferControlToOffscreen' in canvas && typeof Worker !== 'undefined';

    if (!supportsOffscreenPulse) {
      // Cheap, main-thread-safe fallback: a slow CSS opacity breathing effect
      // on the grain layer instead of the (unsupported) canvas pulse.
      this.grainRef?.nativeElement.classList.add('grain-overlay--fallback-pulse');
      return;
    }

    // Use the viewport size, not canvas.getBoundingClientRect(): the canvas
    // is `position: fixed; inset: 0`, so it always fills the viewport, and
    // the bounding rect can still read 0x0 at this point if layout hasn't
    // settled yet — which previously set canvas.width/height to 0, made the
    // browser fall back to its default 300x150 drawing buffer, and CSS then
    // stretched that tiny buffer across the whole screen as gigantic bars.
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const offscreen = canvas.transferControlToOffscreen();
    this.worker = new Worker(new URL('./background-pulse.worker', import.meta.url), { type: 'module' });
    this.worker.postMessage({ type: 'init', canvas: offscreen, width, height }, [offscreen]);

    this.resizeListener = () => {
      this.worker?.postMessage({ type: 'resize', width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', this.resizeListener);
  }
}
