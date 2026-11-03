import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface ColonnaTabella {
  titolo: string;
  /** Colonna di numeri: allineata a destra e con cifre tabellari. */
  numerica?: boolean;
}

export type CellaTabella = string | number | null;

export interface TabellaModello {
  colonne: ColonnaTabella[];
  righe: CellaTabella[][];
}

/** Tabella semplice e accessibile: alternativa testuale ai grafici. */
@Component({
  selector: 'app-tabella-dati',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="scorri" tabindex="0" role="region" [attr.aria-label]="didascalia() || 'Dati in tabella'">
      <table>
        @if (didascalia()) {
          <caption class="solo-lettori">{{ didascalia() }}</caption>
        }
        <thead>
          <tr>
            @for (c of modello().colonne; track $index) {
              <th scope="col" [class.num]="c.numerica">{{ c.titolo }}</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (r of modello().righe; track $index) {
            <tr>
              @for (cella of r; track $index; let i = $index) {
                @if (i === 0) {
                  <th scope="row">{{ cella }}</th>
                } @else {
                  <td [class.num]="modello().colonne[i].numerica">{{ cella ?? 'Nessun dato' }}</td>
                }
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    .scorri {
      position: relative;
      overflow-x: auto;
      max-width: 100%;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    th,
    td {
      padding: 8px 12px;
      text-align: left;
      border-bottom: 1px solid var(--sabbia);
      white-space: nowrap;
    }
    thead th {
      font-weight: 650;
      color: var(--testo-2);
      font-size: 13px;
    }
    tbody th {
      font-weight: 500;
    }
    .num {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    tbody tr:last-child > * {
      border-bottom: 0;
    }
  `,
})
export class TabellaDati {
  readonly modello = input.required<TabellaModello>();
  readonly didascalia = input<string>('');
}
