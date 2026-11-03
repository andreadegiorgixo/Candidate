import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import type { ECharts, EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { TabellaDati, TabellaModello } from '../tabella-dati/tabella-dati';

let contatore = 0;

/**
 * Contenitore comune dei grafici: titolo in italiano semplice, «Vedi come tabella»,
 * spiegazione quando i dati sono pochi e tooltip anche da tastiera (frecce sinistra e destra).
 */
@Component({
  selector: 'app-grafico',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgxEchartsDirective, TabellaDati],
  templateUrl: './grafico.html',
  styleUrl: './grafico.scss',
})
export class Grafico {
  readonly titolo = input.required<string>();
  /** Frase che descrive cosa si vede, per chi non vede il grafico. */
  readonly descrizione = input.required<string>();
  readonly opzioni = input.required<EChartsCoreOption>();
  readonly tabella = input.required<TabellaModello>();
  readonly altezza = input(280);
  /** Larghezza sotto la quale il grafico non si stringe: su schermi piccoli scorre dentro il suo riquadro. */
  readonly larghezzaMinima = input(0);
  /** Se presente, al posto del grafico compare questo testo. */
  readonly vuoto = input<string | null>(null);
  readonly nota = input<string>('');

  protected readonly idTitolo = `grafico-${++contatore}`;
  protected readonly comeTabella = signal(false);
  private grafico: ECharts | null = null;
  private indice = -1;

  protected readonly etichettaPulsante = computed(() => (this.comeTabella() ? 'Vedi come grafico' : 'Vedi come tabella'));

  protected alAvvio(c: ECharts): void {
    this.grafico = c;
  }

  protected scambia(): void {
    this.comeTabella.update((v) => !v);
    this.grafico = null;
  }

  /** Frecce: scorrono i dati mostrando il tooltip. Esc lo chiude. */
  protected tasto(e: KeyboardEvent): void {
    const c = this.grafico;
    if (!c) return;
    const serie = (c.getOption() as { series?: { data?: unknown[] }[] }).series?.[0];
    const n = serie?.data?.length ?? 0;
    if (!n) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') this.indice = (this.indice + 1) % n;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') this.indice = (this.indice - 1 + n) % n;
    else if (e.key === 'Escape') {
      c.dispatchAction({ type: 'hideTip' });
      this.indice = -1;
      return;
    } else return;
    e.preventDefault();
    c.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex: this.indice });
  }

  protected alFocus(): void {
    this.indice = -1;
  }
}
