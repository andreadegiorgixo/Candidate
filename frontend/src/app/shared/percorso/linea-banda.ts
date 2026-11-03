import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FERMATE } from '../../core/stati';

export interface RiepilogoUscite {
  rifiutate: number;
  ritirate: number;
  propostaRifiutata: number;
  senzaRisposta: number;
}

/** La linea in grande: una fermata per ogni fase, con le candidature in corso su ciascuna. */
@Component({
  selector: 'app-linea-banda',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <section class="linea" [attr.aria-labelledby]="idTitolo">
      <h2 [id]="idTitolo">{{ titolo() }}</h2>
      <ol class="fermate">
        @for (f of fermate; track f.etichetta; let i = $index) {
          <li [class.vuota]="conteggi()[i] === 0">
            <a
              [routerLink]="['/candidature']"
              [queryParams]="{ fermata: i }"
              [attr.aria-label]="descrizione(i)"
            >
              <b>{{ conteggi()[i] }}</b>
              <i class="pt"></i>
              <span>{{ f.etichetta }}</span>
            </a>
          </li>
        }
      </ol>
      @if (testoUscite(); as t) {
        <p class="fuori">
          Uscite dalla linea:
          @for (v of vociUscite(); track v.testo; let ultimo = $last) {
            <a [routerLink]="['/candidature']" [queryParams]="v.params">{{ v.testo }}</a
            >{{ ultimo ? '' : ', ' }}
          }
        </p>
      }
    </section>
  `,
  styleUrl: './linea-banda.scss',
})
export class LineaBanda {
  readonly titolo = input.required<string>();
  readonly conteggi = input.required<readonly number[]>();
  readonly uscite = input<RiepilogoUscite | null>(null);

  protected readonly idTitolo = `linea-${Math.random().toString(36).slice(2, 7)}`;
  protected readonly fermate = FERMATE;

  protected descrizione(i: number): string {
    const n = this.conteggi()[i];
    return `${FERMATE[i].etichetta}: ${n === 1 ? '1 candidatura' : `${n} candidature`}. Apri l’elenco filtrato.`;
  }

  protected readonly vociUscite = computed(() => {
    const u = this.uscite();
    if (!u) return [];
    const v: { testo: string; params: Record<string, string> }[] = [];
    if (u.rifiutate) v.push({ testo: `${u.rifiutate} ${u.rifiutate === 1 ? 'rifiutata' : 'rifiutate'} dall’azienda`, params: { stato: 'RIFIUTATO_DA_RECRUITER' } });
    if (u.ritirate) v.push({ testo: `${u.ritirate} ${u.ritirate === 1 ? 'ritirata' : 'ritirate'} da te`, params: { stato: 'RIFIUTATO_DAL_CANDIDATO' } });
    if (u.propostaRifiutata) v.push({ testo: `${u.propostaRifiutata} ${u.propostaRifiutata === 1 ? 'proposta rifiutata' : 'proposte rifiutate'}`, params: { stato: 'PROPOSTA_LAVORATIVA_RIFIUTATA' } });
    if (u.senzaRisposta) v.push({ testo: `${u.senzaRisposta} senza risposta`, params: { stato: 'GHOSTING_O_SENZA_RISPOSTA' } });
    return v;
  });

  protected readonly testoUscite = computed(() => this.vociUscite().length > 0);
}
