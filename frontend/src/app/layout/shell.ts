import { ChangeDetectionStrategy, Component, computed, HostListener, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Auth } from '../core/auth/auth.service';
import { costruisciDaFare } from '../core/da-fare';
import { CandidatureStore, ColloquiStore, OfferteStore } from '../core/data/archivi';
import { eInCorso } from '../core/stati';
import { minutiTra } from '../core/date';
import { Orologio } from '../core/orologio';
import { NuovaCandidatura } from '../shared/aggiungi-candidatura/pannello-candidatura';
import { RicercaService } from './ricerca/ricerca-globale';
import { Icona, NomeIcona } from '../shared/icona/icona';

interface Voce {
  percorso: string;
  etichetta: string;
  icona: NomeIcona;
  contatore?: 'oggi' | 'colloqui' | 'offerte';
  descrizioneContatore?: (n: number) => string;
}

/** Barra laterale sempre visibile su desktop; sotto i 1050px diventa una barra orizzontale scorrevole. */
@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icona],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private readonly auth = inject(Auth);
  private readonly candidature = inject(CandidatureStore);
  private readonly colloqui = inject(ColloquiStore);
  private readonly offerte = inject(OfferteStore);
  private readonly orologio = inject(Orologio);
  private readonly nuova = inject(NuovaCandidatura);
  private readonly ricerca = inject(RicercaService);
  private readonly dialog = inject(MatDialog);

  protected readonly voci: Voce[] = [
    { percorso: '/oggi', etichetta: 'Oggi', icona: 'oggi', contatore: 'oggi', descrizioneContatore: (n) => `${n} ${n === 1 ? 'cosa' : 'cose'} da fare` },
    { percorso: '/candidature', etichetta: 'Candidature', icona: 'candidature' },
    { percorso: '/andamento', etichetta: 'Andamento', icona: 'andamento' },
    { percorso: '/colloqui', etichetta: 'Colloqui', icona: 'colloqui', contatore: 'colloqui', descrizioneContatore: (n) => `${n} in programma` },
    { percorso: '/aziende', etichetta: 'Aziende', icona: 'aziende' },
    { percorso: '/materiali', etichetta: 'Materiali', icona: 'materiali' },
    { percorso: '/offerte', etichetta: 'Offerte', icona: 'offerte', contatore: 'offerte', descrizioneContatore: (n) => `${n} ${n === 1 ? 'aperta' : 'aperte'}` },
  ];

  protected readonly contatori = computed<Record<string, number>>(() => {
    const cand = this.candidature.elementi();
    const colloqui = this.colloqui.elementi();
    const adesso = this.orologio.adesso();
    const pronti = this.candidature.stato() === 'pronto';
    const daFare = pronti
      ? costruisciDaFare({
          candidature: cand,
          colloqui,
          offerte: this.offerte.elementi(),
          oggi: this.orologio.oggi(),
          adesso,
          sogliaAttesa: this.auth.sogliaAttesa(),
        }).length
      : 0;
    const aperte = this.offerte
      .elementi()
      .filter((o) => {
        const c = cand.find((x) => x.id === o.idCandidatura);
        return !!c && eInCorso(c.statoCandidatura);
      }).length;
    return {
      oggi: daFare,
      colloqui: colloqui.filter((c) => minutiTra(adesso, c.dataOra) >= 0).length,
      offerte: aperte,
    };
  });

  constructor() {
    this.auth.caricaAccount();
    this.candidature.carica();
    this.colloqui.carica();
    this.offerte.carica();
  }

  /** `N` apre l'aggiunta rapida, tranne quando si sta scrivendo in un campo o c'è già un pannello aperto. */
  @HostListener('document:keydown', ['$event'])
  protected scorciatoie(e: KeyboardEvent): void {
    // Cmd+K o Ctrl+K: ricerca globale, da qualsiasi punto, anche mentre si scrive.
    if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey) {
      e.preventDefault();
      this.ricerca.apri();
      return;
    }
    if (e.key.toLowerCase() !== 'n' || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.closest('input, textarea, select, [contenteditable="true"]') || t.isContentEditable)) return;
    if (this.dialog.openDialogs.length > 0) return;
    e.preventDefault();
    this.nuova.apri().subscribe();
  }

  protected cerca(): void {
    this.ricerca.apri();
  }

  protected readonly scorciatoiaCerca = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : 'Ctrl K';

  protected salta(e: Event): void {
    e.preventDefault();
    document.getElementById('contenuto')?.focus();
  }
}
