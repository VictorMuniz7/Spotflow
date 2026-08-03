import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, inject, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { svg, createTimeline } from 'animejs';

let instanceCount = 0;

/**
 * Original, hand-drawn-style boombox + music-notes mark inspired by
 * resources/inspiration.webp (not a trace of that artwork): a feTurbulence
 * displacement filter gives the strokes an imperfect, sketched wobble, and
 * three layered copies (cyan/red/black) offset a few pixels reproduce the
 * chromatic-aberration glitch from the reference. Runs its stroke "drawn
 * progressively then a glitch jolt" entrance once, skippable, and settles
 * into the static mark used everywhere else.
 */
@Component({
  selector: 'app-hero-mark',
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      class="hero-mark"
      [style.width.px]="sizePx()"
      [style.height.px]="sizePx()"
      viewBox="0 0 200 200"
      fill="none"
    >
      <defs>
        <filter [attr.id]="filterId" x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="1" seed="4" result="wobble" />
          <feDisplacementMap in="SourceGraphic" in2="wobble" scale="1.8" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>

      <!-- Must stay nested inside <svg> so Angular compiles its children in
           the SVG namespace (path/circle/rect), even though ngTemplateOutlet
           only projects its content, not its lexical position. -->
      <ng-template #markShapes>
        <!-- Body -->
        <rect class="hero-mark__stroke" x="25" y="105" width="150" height="65" rx="12" />
        <!-- Carry handle -->
        <path class="hero-mark__stroke" d="M52 105 Q46 68 72 64 Q94 68 88 105" />
        <!-- Speakers (outer ring + inner cone) -->
        <circle class="hero-mark__stroke" cx="60" cy="139" r="17" />
        <circle class="hero-mark__stroke" cx="60" cy="139" r="7" />
        <circle class="hero-mark__stroke" cx="140" cy="139" r="17" />
        <circle class="hero-mark__stroke" cx="140" cy="139" r="7" />
        <!-- Cassette window with reels -->
        <rect class="hero-mark__stroke" x="88" y="126" width="24" height="16" rx="3" />
        <circle class="hero-mark__stroke" cx="94" cy="134" r="3" />
        <circle class="hero-mark__stroke" cx="106" cy="134" r="3" />
        <!-- Control marks -->
        <path class="hero-mark__stroke" d="M92 152 L92 158" />
        <path class="hero-mark__stroke" d="M100 152 L100 158" />
        <path class="hero-mark__stroke" d="M108 152 L108 158" />
        <!-- Three joined notes (floating, not connected to the boombox) -->
        <circle class="hero-mark__stroke" cx="150" cy="58" r="7" />
        <path class="hero-mark__stroke" d="M157 58 L157 25" />
        <circle class="hero-mark__stroke" cx="168" cy="48" r="6" />
        <path class="hero-mark__stroke" d="M174 48 L174 18" />
        <circle class="hero-mark__stroke" cx="180" cy="38" r="5" />
        <path class="hero-mark__stroke" d="M185 38 L185 15" />
        <path class="hero-mark__stroke" d="M157 25 L174 18 L185 15" />
      </ng-template>

      <g class="hero-mark__layer hero-mark__layer--cyan" [attr.filter]="'url(#' + filterId + ')'">
        <ng-container [ngTemplateOutlet]="markShapes" />
      </g>
      <g class="hero-mark__layer hero-mark__layer--red" [attr.filter]="'url(#' + filterId + ')'">
        <ng-container [ngTemplateOutlet]="markShapes" />
      </g>
      <g class="hero-mark__layer hero-mark__layer--base" [attr.filter]="'url(#' + filterId + ')'">
        <ng-container [ngTemplateOutlet]="markShapes" />
      </g>
    </svg>
  `,
  styles: `
    .hero-mark {
      overflow: visible;
    }

    .hero-mark__stroke {
      stroke: currentColor;
      stroke-width: 5;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .hero-mark__layer--base {
      color: var(--color-ink);
    }

    .hero-mark__layer--red {
      color: var(--color-glitch-red);
      mix-blend-mode: multiply;
      transform: translate(3.5px, 2px);
    }

    .hero-mark__layer--cyan {
      color: var(--color-glitch-cyan);
      mix-blend-mode: multiply;
      transform: translate(-3.5px, -2px);
    }
  `,
})
export class HeroMark {
  readonly sizePx = input(160);
  /** Skips the draw-in/jolt sequence and shows the settled mark immediately. */
  readonly animate = input(true);

  protected readonly filterId = `hero-mark-sketch-${instanceCount++}`;

  private readonly host = inject(ElementRef<HTMLElement>);

  constructor() {
    afterNextRender(() => this.playEntrance());
  }

  private playEntrance(): void {
    const root = this.host.nativeElement;
    const baseStrokes = Array.from(
      root.querySelectorAll('.hero-mark__layer--base .hero-mark__stroke'),
    ) as SVGGeometryElement[];
    const redLayer = root.querySelector('.hero-mark__layer--red') as SVGGElement | null;
    const cyanLayer = root.querySelector('.hero-mark__layer--cyan') as SVGGElement | null;

    if (!this.animate() || !redLayer || !cyanLayer || baseStrokes.length === 0) {
      return;
    }

    const drawables = svg.createDrawable(baseStrokes);

    // Resting offsets match the static CSS transform, so the last keyframe
    // below is where the jolt settles.
    createTimeline({ defaults: { ease: 'inOutQuad' } })
      .add([redLayer, cyanLayer], { opacity: 0 }, 0)
      .add(drawables, { draw: ['0 0', '0 1'], duration: 900, delay: (_el, i) => (i ?? 0) * 80 }, 0)
      .add([redLayer, cyanLayer], { opacity: 1, duration: 150 }, '-=200')
      .add(
        redLayer,
        {
          translateX: [0, 9, -4, 3.5],
          translateY: [0, -4, 3, 2],
          duration: 320,
          ease: 'outElastic(1, .6)',
        },
        '-=100',
      )
      .add(
        cyanLayer,
        {
          translateX: [0, -9, 4, -3.5],
          translateY: [0, 4, -3, -2],
          duration: 320,
          ease: 'outElastic(1, .6)',
        },
        '<',
      );
  }
}
