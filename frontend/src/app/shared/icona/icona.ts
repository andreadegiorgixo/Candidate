import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type NomeIcona =
  | 'oggi' | 'candidature' | 'andamento' | 'colloqui' | 'aziende' | 'materiali' | 'offerte' | 'profilo'
  | 'piu' | 'cerca' | 'chiudi' | 'modifica' | 'elimina' | 'altro' | 'link' | 'copia' | 'spunta' | 'calendario'
  | 'esporta' | 'elenco' | 'bacheca' | 'luogo' | 'persona' | 'orologio' | 'esci' | 'avviso' | 'trascina' | 'ordina-su' | 'ordina-giu';

const PERCORSI: Record<NomeIcona, string> = {
  oggi: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4',
  candidature: 'M4 6h16M4 12h16M4 18h10',
  andamento: 'M4 19V5M4 19h16M8 15l4-5 3 3 5-7',
  colloqui: 'M7 5h10a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3zM4 10h16M9 3v4M15 3v4',
  aziende: 'M5 20V6l7-3v17M12 9l7 2v9M3 20h18',
  materiali: 'M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5',
  offerte: 'M4 8h16v11H4zM9 8V5h6v3M4 13h16',
  profilo: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21c1-4 4-6 8-6s7 2 8 6',
  piu: 'M12 5v14M5 12h14',
  cerca: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  chiudi: 'M6 6l12 12M18 6 6 18',
  modifica: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',
  elimina: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13M10 11v6M14 11v6',
  altro: 'M12 6.5v.01M12 12v.01M12 17.5v.01',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  copia: 'M9 9h10v11H9zM5 15V4h10',
  spunta: 'M5 12.5l4.5 4.5L19 7.5',
  calendario: 'M7 5h10a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3zM4 10h16M9 3v4M15 3v4',
  esporta: 'M12 4v11M8 11l4 4 4-4M5 20h14',
  elenco: 'M4 6h16M4 12h16M4 18h16',
  bacheca: 'M4 5h4v14H4zM10 5h4v9h-4zM16 5h4v12h-4z',
  luogo: 'M12 21s-6-5.6-6-10a6 6 0 0 1 12 0c0 4.4-6 10-6 10zM12 8.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
  persona: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21c1-4 4-6 8-6s7 2 8 6',
  orologio: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 8v4l3 2',
  esci: 'M10 4H5v16h5M15 8l4 4-4 4M19 12H9',
  avviso: 'M12 4 3 20h18zM12 10v4M12 17v.01',
  trascina: 'M9 6v.01M15 6v.01M9 12v.01M15 12v.01M9 18v.01M15 18v.01',
  'ordina-su': 'M7 14l5-5 5 5',
  'ordina-giu': 'M7 10l5 5 5-5',
};

/** Icone a tratto, tutte disegnate sulla stessa griglia 24×24. Decorative: il testo accanto le descrive. */
@Component({
  selector: 'app-icona',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path [attr.d]="percorso()" /></svg>`,
  styles: `
    :host {
      display: inline-flex;
      width: 18px;
      height: 18px;
      flex: none;
    }
    svg {
      width: 100%;
      height: 100%;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  `,
})
export class Icona {
  readonly nome = input.required<NomeIcona>();
  protected readonly percorso = computed(() => PERCORSI[this.nome()]);
}
