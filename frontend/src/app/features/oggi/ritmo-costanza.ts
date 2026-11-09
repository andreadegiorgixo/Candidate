import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { Auth } from '../../core/auth/auth.service';
import { CandidatureStore } from '../../core/data/archivi';
import { Orologio } from '../../core/orologio';
import { provideGrafici } from '../../shared/grafico/echarts-setup';
import { Grafico } from '../../shared/grafico/grafico';
import { graficoCalendario, graficoRitmo } from './grafici';
import { GIORNI_RITMO, inizioCalendario, inviateNegliUltimi, invioPerGiorno, invioPerSettimana, messaggioPochiDati, MINIMO_RITMO } from './ritmo.logic';

/**
 * Ritmo e Costanza in fondo a Oggi. Oggi lo carica con `@defer`: ECharts, registrato qui
 * nei provider, si scarica solo quando la sezione sta per entrare nello schermo.
 */
@Component({
  selector: 'app-ritmo-costanza',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Grafico],
  providers: [provideGrafici()],
  template: `
    <section class="blocco" aria-labelledby="t-ritmo">
      <h2 class="t" id="t-ritmo">Ritmo</h2>
      <app-grafico
        titolo="Quante candidature invii ogni settimana"
        [descrizione]="ritmo().modello?.descrizione ?? ''"
        [opzioni]="ritmo().modello?.opzioni ?? {}"
        [tabella]="ritmo().modello?.tabella ?? { colonne: [], righe: [] }"
        [altezza]="170"
        [vuoto]="ritmo().vuoto"
        nota="Ultimi 90 giorni."
      />
    </section>

    <section class="blocco" aria-labelledby="t-costanza">
      <h2 class="t" id="t-costanza">Costanza</h2>
      <app-grafico
        titolo="In quali giorni hai inviato candidature"
        [descrizione]="costanza().descrizione"
        [opzioni]="costanza().opzioni"
        [tabella]="costanza().tabella"
        [altezza]="228"
        nota="Ogni quadratino è un giorno, dall’anno scorso a oggi."
      />
    </section>
  `,
  styles: `
    :host {
      display: block;
      margin-top: 26px;
    }

    .blocco + .blocco {
      margin-top: 14px;
    }
  `,
})
export class RitmoCostanza {
  private readonly candidature = inject(CandidatureStore);
  private readonly auth = inject(Auth);
  private readonly oggi = inject(Orologio).oggi;
  private readonly stretto = signal(typeof matchMedia === 'function' && matchMedia('(max-width: 700px)').matches);

  protected readonly ritmo = computed(() => {
    const recenti = inviateNegliUltimi(this.candidature.elementi(), this.oggi(), GIORNI_RITMO);
    const vuoto = messaggioPochiDati(MINIMO_RITMO, recenti.length, 'il ritmo degli invii');
    return {
      vuoto,
      modello: vuoto ? null : graficoRitmo(invioPerSettimana(recenti, this.oggi(), GIORNI_RITMO), this.auth.obiettivoSettimanale()),
    };
  });

  protected readonly costanza = computed(() => {
    const da = inizioCalendario(this.oggi(), this.stretto() ? 26 : 53);
    return graficoCalendario(invioPerGiorno(this.candidature.elementi(), da, this.oggi()), da, this.oggi());
  });

  constructor() {
    if (typeof matchMedia === 'function') {
      const mq = matchMedia('(max-width: 700px)');
      const cambia = (e: MediaQueryListEvent) => this.stretto.set(e.matches);
      mq.addEventListener('change', cambia);
      inject(DestroyRef).onDestroy(() => mq.removeEventListener('change', cambia));
    }
  }
}
