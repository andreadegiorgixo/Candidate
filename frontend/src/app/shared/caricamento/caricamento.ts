import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { messaggioErrore } from '../../core/errori';

/** Segnaposto mentre i dati arrivano. Le barre non si muovono: niente animazioni di ingresso. */
@Component({
  selector: 'app-scheletro',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="scheletro" role="status" aria-live="polite">
      <span class="solo-lettori">{{ etichetta() }}</span>
      @for (r of righe(); track r) {
        <div class="r" aria-hidden="true"><i></i><i class="b"></i></div>
      }
    </div>
  `,
  styles: `
    .scheletro {
      background: var(--bianco);
      border: 1px solid var(--bordo);
      border-radius: var(--r-pannello);
      overflow: hidden;
    }
    .r {
      display: grid;
      gap: 8px;
      padding: 17px 20px;
      border-bottom: 1px solid var(--sabbia);
    }
    .r:last-child {
      border-bottom: 0;
    }
    i {
      display: block;
      height: 12px;
      border-radius: 6px;
      background: var(--sabbia);
      width: 46%;
    }
    i.b {
      width: 28%;
      height: 10px;
      background: var(--sabbia);
    }
  `,
})
export class Scheletro {
  readonly etichetta = input('Sto caricando i dati');
  readonly righe = input<number[]>([1, 2, 3, 4]);
}

/** Errore di caricamento con il modo per riprovare. */
@Component({
  selector: 'app-errore-caricamento',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="err" role="alert">
      <h3>{{ titolo() }}</h3>
      <p>{{ messaggio() }}</p>
      <button type="button" class="btn primario" (click)="riprova.emit()">Riprova</button>
    </div>
  `,
  styles: `
    .err {
      display: grid;
      justify-items: start;
      gap: 6px;
      padding: 24px 26px;
      background: var(--bianco);
      border: 1px solid var(--errore-bordo);
      border-radius: var(--r-pannello);
    }
    h3 {
      font-size: 18px;
      font-weight: 700;
      color: var(--errore);
    }
    p {
      color: var(--testo-2);
      margin-bottom: 8px;
      max-width: 56ch;
    }
  `,
})
export class ErroreCaricamento {
  readonly errore = input<unknown>(null);
  readonly titolo = input('Non riesco a mostrarti questi dati');
  readonly riprova = output<void>();

  protected messaggio(): string {
    return messaggioErrore(this.errore());
  }
}
