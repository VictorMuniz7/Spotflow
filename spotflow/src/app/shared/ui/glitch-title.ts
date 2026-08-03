import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Chromatic-aberration title effect from the visual reference: a black base
 * layer with red/cyan copies offset a few pixels and blended over the paper
 * background, mimicking the glitch outline in resources/inspiration.webp.
 */
@Component({
  selector: 'app-glitch-title',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="glitch" [style.--glitch-font-size.rem]="fontSizeRem()">
      <span class="glitch__layer glitch__layer--cyan" aria-hidden="true">{{ text() }}</span>
      <span class="glitch__layer glitch__layer--red" aria-hidden="true">{{ text() }}</span>
      <span class="glitch__layer glitch__layer--base">{{ text() }}</span>
    </span>
  `,
  styles: `
    .glitch {
      position: relative;
      display: inline-block;
      font-family: var(--font-sketch);
      font-size: var(--glitch-font-size, 3rem);
      line-height: 1.1;
      color: var(--color-ink);
    }

    .glitch__layer {
      display: block;
    }

    .glitch__layer--red,
    .glitch__layer--cyan {
      position: absolute;
      inset: 0;
      mix-blend-mode: multiply;
    }

    .glitch__layer--red {
      color: var(--color-glitch-red);
      transform: translate(2px, 1px);
    }

    .glitch__layer--cyan {
      color: var(--color-glitch-cyan);
      transform: translate(-2px, -1px);
    }
  `,
})
export class GlitchTitle {
  readonly text = input.required<string>();
  readonly fontSizeRem = input(3);
}
