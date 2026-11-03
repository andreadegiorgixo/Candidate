import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { StatoCandidatura, StoricoEvento } from '../../core/api/models';
import { DataISO, formatoCompleto } from '../../core/date';
import { calcolaPercorso, EsitoPercorso } from '../../core/percorso';
import { etichettaStato } from '../../core/stati';

interface Elemento {
  tipo: 'punto' | 'linea';
  classi: string;
}

const TESTO_ESITO: Record<EsitoPercorso, string> = {
  'in-corso': '',
  conclusa: 'Assunzione completata',
  rifiutata: 'Rifiutata dall’azienda',
  ritirata: 'Ritirata da te',
  'proposta-rifiutata': 'Proposta rifiutata',
  'senza-risposta': 'Senza risposta',
};

/**
 * La linea della candidatura: sei fermate lungo un percorso.
 * `mini` sta in ogni riga; `cronologia` è la versione datata del dettaglio.
 */
@Component({
  selector: 'app-percorso',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.esteso]': "variante() === 'cronologia'" },
  templateUrl: './percorso.html',
  styleUrl: './percorso.scss',
})
export class Percorso {
  readonly stato = input.required<StatoCandidatura>();
  readonly dataCandidatura = input.required<DataISO>();
  readonly storico = input<readonly StoricoEvento[] | undefined>(undefined);
  readonly variante = input<'mini' | 'cronologia'>('mini');

  protected readonly p = computed(() => calcolaPercorso(this.stato(), this.storico(), this.dataCandidatura()));

  protected readonly descrizione = computed(() => {
    const p = this.p();
    const ultima = p.passi[p.raggiunta].etichetta;
    const base = `Fermata ${p.raggiunta + 1} di 6, ${ultima}`;
    return p.esito === 'in-corso' ? base : `${base}. ${TESTO_ESITO[p.esito]}`;
  });

  protected readonly elementi = computed<Elemento[]>(() => {
    const { passi, raggiunta, esito } = this.p();
    const els: Elemento[] = [];
    const uscita = esito !== 'in-corso' && esito !== 'conclusa';
    for (const passo of passi) {
      const i = passo.indice;
      if (i > 0) {
        if (i <= raggiunta) els.push({ tipo: 'linea', classi: 'on' });
        else if (i === raggiunta + 1 && uscita) {
          els.push({ tipo: 'linea', classi: esito === 'senza-risposta' ? 'sfuma' : 'taglio' });
          break;
        } else if (!uscita) els.push({ tipo: 'linea', classi: 'off' });
        else break;
      }
      if (i <= raggiunta) els.push({ tipo: 'punto', classi: passo.stato === 'corrente' ? 'on corrente' : 'on' });
      else if (!uscita) els.push({ tipo: 'punto', classi: 'off' });
    }
    return els;
  });

  protected readonly eventi = computed(() =>
    [...(this.storico() ?? [])]
      .sort((a, b) => a.dataEvento.localeCompare(b.dataEvento))
      .map((e) => ({ ...e, etichetta: etichettaStato(e.stato), data: formatoCompleto(e.dataEvento) })),
  );

  protected readonly testoEsito = computed(() => TESTO_ESITO[this.p().esito]);

  protected data(d: DataISO | null): string {
    return d ? formatoCompleto(d) : 'Senza data';
  }
}
