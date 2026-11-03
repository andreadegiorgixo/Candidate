import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { StatoCandidatura } from '../../core/api/models';
import { INFO_STATO } from '../../core/stati';

/** Etichetta di stato: testo sempre scritto, il colore è un aiuto in più. */
@Component({
  selector: 'app-stato-tag',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="tag" [style.background]="fondo()" [style.color]="testo()">{{ etichetta() }}</span>`,
  styles: `
    :host {
      display: inline-block;
    }
  `,
})
export class StatoTag {
  readonly stato = input.required<StatoCandidatura>();
  protected readonly info = computed(() => INFO_STATO[this.stato()]);
  protected readonly etichetta = computed(() => this.info().etichetta);
  protected readonly fondo = computed(() => `var(--${this.info().gruppo}-f)`);
  protected readonly testo = computed(() => `var(--${this.info().gruppo}-t)`);
}
