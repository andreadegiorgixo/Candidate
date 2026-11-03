import { Injectable } from '@angular/core';
import { NativeDateAdapter } from '@angular/material/core';

/**
 * Adattatore delle date del datepicker che capisce il formato italiano digitato a mano
 * (`31/12/2026`, `31-12-2026`, `31.12.26`). Quello nativo usa `Date.parse`, che non lo riconosce.
 */
@Injectable()
export class DateAdapterItaliano extends NativeDateAdapter {
  override parse(valore: unknown, formato?: unknown): Date | null {
    if (typeof valore !== 'string') return super.parse(valore, formato);
    const s = valore.trim();
    if (!s) return null;
    const it = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2}|\d{4})$/.exec(s);
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    let g: number, m: number, a: number;
    if (it) {
      [g, m, a] = [Number(it[1]), Number(it[2]), it[3].length === 2 ? 2000 + Number(it[3]) : Number(it[3])];
    } else if (iso) {
      [a, m, g] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
    } else {
      return this.invalid();
    }
    const d = new Date(a, m - 1, g);
    return d.getFullYear() === a && d.getMonth() === m - 1 && d.getDate() === g ? d : this.invalid();
  }
}
