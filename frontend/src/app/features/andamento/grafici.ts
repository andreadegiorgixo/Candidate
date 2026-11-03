import type { EChartsCoreOption } from 'echarts/core';
import { aggiungiGiorni, DataISO, formatoBreve, formatoCompleto, meseAnno, meseBreve, nomeGiorno } from '../../core/date';
import { TabellaModello } from '../../shared/tabella-dati/tabella-dati';
import {
  CATEGORIE,
  COLORE_ALTRE,
  FONT,
  GRIGLIA,
  SCALA_FERMATE,
  TESTO,
  TESTO_2,
  USCITE,
} from '../../shared/grafico/palette';
import {
  Barra,
  formatoNumero,
  Giorno,
  NODI_TERMINALI,
  NOME_FERMATA,
  percentuale,
  PercorsoAggregato,
  PuntoMensile,
  Settimana,
  TempoFase,
} from './andamento.logic';

/** Un grafico completo: opzioni, tabella alternativa e descrizione per chi non lo vede. */
export interface ModelloGrafico {
  opzioni: EChartsCoreOption;
  tabella: TabellaModello;
  descrizione: string;
}

const BASE = {
  animation: false,
  textStyle: { fontFamily: FONT, color: TESTO, fontSize: 13 },
  tooltip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DEDFCF',
    borderWidth: 1,
    padding: [8, 12],
    textStyle: { fontFamily: FONT, color: TESTO, fontSize: 13 },
    extraCssText: 'box-shadow: 0 8px 28px rgb(9 45 11 / 0.16); border-radius: 12px;',
  },
};

const ASSE_TESTO = { color: TESTO_2, fontFamily: FONT, fontSize: 12 };
const LINEA_GRIGLIA = { lineStyle: { color: GRIGLIA } };

/** Barre sottili con estremità arrotondate di 4px e 2px di spazio tra i riempimenti. */
function stileBarra(colore: string, raggio: number[] = [4, 4, 4, 4]) {
  return { color: colore, borderRadius: raggio, borderColor: '#FFFFFF', borderWidth: 1 };
}

function pct(x: number): string {
  return `${percentuale(x)}%`;
}

// ----------------------------------------------------------------- ritmo

export function graficoRitmo(settimane: Settimana[], obiettivo: number): ModelloGrafico {
  const etichette = settimane.map((s) => formatoBreve(s.inizio));
  const totale = settimane.reduce((s, x) => s + x.n, 0);
  return {
    descrizione: `Candidature inviate per settimana, ${totale} in tutto in ${settimane.length} settimane. La linea tratteggiata indica l’obiettivo di ${obiettivo} a settimana.`,
    tabella: {
      colonne: [{ titolo: 'Settimana dal' }, { titolo: 'Invii', numerica: true }, { titolo: 'Obiettivo', numerica: true }],
      righe: settimane.map((s) => [formatoBreve(s.inizio), s.n, obiettivo]),
    },
    opzioni: {
      ...BASE,
      grid: { left: 34, right: 16, top: 24, bottom: 28 },
      tooltip: {
        ...BASE.tooltip,
        trigger: 'axis',
        axisPointer: { type: 'shadow', shadowStyle: { color: 'rgb(9 45 11 / 0.05)' } },
        formatter: (p: unknown) => {
          const dati = (p as { dataIndex: number }[])[0];
          const s = settimane[dati.dataIndex];
          return `Settimana dal ${formatoBreve(s.inizio)}<br/><b>${s.n} ${s.n === 1 ? 'invio' : 'invii'}</b>, obiettivo ${obiettivo}`;
        },
      },
      xAxis: {
        type: 'category',
        data: etichette,
        axisLine: { lineStyle: { color: '#8b917f' } },
        axisTick: { show: false },
        axisLabel: { ...ASSE_TESTO, hideOverlap: true },
      },
      yAxis: { type: 'value', minInterval: 1, splitLine: LINEA_GRIGLIA, axisLabel: ASSE_TESTO, max: (v: { max: number }) => Math.max(v.max, obiettivo + 1) },
      series: [
        {
          type: 'bar',
          name: 'Invii',
          data: settimane.map((s) => s.n),
          barMaxWidth: 14,
          itemStyle: stileBarra(CATEGORIE[0], [4, 4, 0, 0]),
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: TESTO_2, type: 'dashed', width: 2 },
            label: { formatter: `Obiettivo: ${obiettivo}`, color: TESTO_2, fontFamily: FONT, position: 'insideStartTop' },
            data: [{ yAxis: obiettivo }],
          },
        },
      ],
    },
  };
}

// -------------------------------------------------------------- percorso

const COLORE_NODO: Record<string, { fondo: string; bordo?: string }> = {
  Inviate: { fondo: SCALA_FERMATE[0] },
  Conoscitivo: { fondo: SCALA_FERMATE[0] },
  'Tecnico 1': { fondo: SCALA_FERMATE[1] },
  'Tecnico 2': { fondo: SCALA_FERMATE[1] },
  Proposta: { fondo: SCALA_FERMATE[2] },
  Assunzione: { fondo: SCALA_FERMATE[3] },
  [NODI_TERMINALI['in-corso']]: { fondo: '#E3EBD2', bordo: '#5E9A2E' },
  [NODI_TERMINALI.rifiutata]: { fondo: USCITE.rifiutata.fondo, bordo: USCITE.rifiutata.bordo },
  [NODI_TERMINALI.ritirata]: { fondo: USCITE.rifiutata.fondo, bordo: USCITE.rifiutata.bordo },
  [NODI_TERMINALI['proposta-rifiutata']]: { fondo: USCITE.rifiutata.fondo, bordo: USCITE.rifiutata.bordo },
  [NODI_TERMINALI['senza-risposta']]: { fondo: USCITE.senzaRisposta.fondo, bordo: USCITE.senzaRisposta.bordo },
};

const ORDINE_NODI = [...NOME_FERMATA, ...Object.values(NODI_TERMINALI)];

export function graficoPercorso(p: PercorsoAggregato): ModelloGrafico {
  const usati = new Set(p.collegamenti.flatMap((l) => [l.da, l.a]));
  const nodi = ORDINE_NODI.filter((n) => usati.has(n));
  return {
    descrizione: `Dalle ${p.totale} candidature inviate, ${p.raggiunte[1]} sono arrivate al colloquio conoscitivo e ${p.raggiunte[4]} alla proposta. Le uscite sono separate per tipo.`,
    tabella: {
      colonne: [{ titolo: 'Da' }, { titolo: 'A' }, { titolo: 'Candidature', numerica: true }],
      righe: p.collegamenti.map((l) => [l.da, l.a, l.valore]),
    },
    opzioni: {
      ...BASE,
      tooltip: {
        ...BASE.tooltip,
        trigger: 'item',
        formatter: (x: unknown) => {
          const d = x as { dataType: string; name: string; value: number; data: { source?: string; target?: string } };
          return d.dataType === 'edge'
            ? `${d.data.source} verso ${d.data.target}<br/><b>${d.value}</b> ${d.value === 1 ? 'candidatura' : 'candidature'}`
            : `${d.name}<br/><b>${d.value}</b> ${d.value === 1 ? 'candidatura' : 'candidature'}`;
        },
      },
      series: [
        {
          type: 'sankey',
          left: 4,
          right: 170,
          top: 8,
          bottom: 8,
          nodeWidth: 14,
          nodeGap: 14,
          nodeAlign: 'justify',
          layoutIterations: 0,
          draggable: false,
          emphasis: { focus: 'adjacency' },
          lineStyle: { color: 'gradient', opacity: 0.4, curveness: 0.5 },
          label: { color: TESTO, fontFamily: FONT, fontSize: 13, formatter: '{b}: {c}' },
          data: nodi.map((name) => ({
            name,
            itemStyle: { color: COLORE_NODO[name].fondo, borderColor: COLORE_NODO[name].bordo ?? COLORE_NODO[name].fondo, borderWidth: 1.5, borderRadius: 3 },
          })),
          links: p.collegamenti.map((l) => ({ source: l.da, target: l.a, value: l.valore })),
        },
      ],
    },
  };
}

// ---------------------------------------------------------- tasso mensile

export function graficoTassoMensile(punti: PuntoMensile[]): ModelloGrafico {
  const ultimo = punti.reduce((u, p, i) => (p.tasso !== null ? i : u), -1);
  return {
    descrizione: `Percentuale di candidature con risposta, mese per mese, da ${meseAnno(`${punti[0].mese}-01`)} a ${meseAnno(`${punti[punti.length - 1].mese}-01`)}.`,
    tabella: {
      colonne: [{ titolo: 'Mese di invio' }, { titolo: 'Candidature', numerica: true }, { titolo: 'Con risposta', numerica: true }, { titolo: 'Tasso', numerica: true }],
      righe: punti.map((p) => [meseAnno(`${p.mese}-01`), p.n, p.risposte, p.tasso === null ? null : pct(p.tasso)]),
    },
    opzioni: {
      ...BASE,
      grid: { left: 42, right: 52, top: 22, bottom: 28 },
      tooltip: {
        ...BASE.tooltip,
        trigger: 'axis',
        formatter: (x: unknown) => {
          const p = punti[(x as { dataIndex: number }[])[0].dataIndex];
          return p.tasso === null
            ? `${meseAnno(`${p.mese}-01`)}<br/>Nessun invio`
            : `${meseAnno(`${p.mese}-01`)}<br/><b>${pct(p.tasso)}</b>, ${p.risposte} risposte su ${p.n}`;
        },
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: punti.map((p) => meseBreve(`${p.mese}-01`)),
        axisLine: { lineStyle: { color: '#8b917f' } },
        axisTick: { show: false },
        axisLabel: ASSE_TESTO,
      },
      yAxis: { type: 'value', min: 0, max: 1, interval: 0.25, splitLine: LINEA_GRIGLIA, axisLabel: { ...ASSE_TESTO, formatter: (v: number) => pct(v) } },
      series: [
        {
          type: 'line',
          name: 'Tasso di risposta',
          connectNulls: false,
          showSymbol: true,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: { width: 2, color: CATEGORIE[0] },
          itemStyle: { color: CATEGORIE[0], borderColor: '#FFFFFF', borderWidth: 2 },
          data: punti.map((p, i) => ({
            value: p.tasso,
            label: { show: i === ultimo, position: 'right', formatter: p.tasso === null ? '' : pct(p.tasso), color: TESTO, fontFamily: FONT, fontWeight: 600 },
          })),
        },
      ],
    },
  };
}

// ------------------------------------------------------------------ tempi

export function graficoTempi(fasi: TempoFase[]): ModelloGrafico {
  const conDati = fasi.filter((f) => f.mediana !== null);
  return {
    descrizione: `Mediana dei giorni per ogni fase: ${conDati.map((f) => `${f.fase.toLowerCase()} ${formatoNumero(f.mediana!)} giorni`).join(', ')}.`,
    tabella: {
      colonne: [{ titolo: 'Fase' }, { titolo: 'Giorni (mediana)', numerica: true }, { titolo: 'Casi', numerica: true }],
      righe: fasi.map((f) => [f.fase, f.mediana === null ? null : formatoNumero(f.mediana), f.casi]),
    },
    opzioni: {
      ...BASE,
      grid: { left: 190, right: 150, top: 6, bottom: 6 },
      tooltip: {
        ...BASE.tooltip,
        trigger: 'axis',
        axisPointer: { type: 'shadow', shadowStyle: { color: 'rgb(9 45 11 / 0.05)' } },
        formatter: (x: unknown) => {
          const f = conDati[(x as { dataIndex: number }[])[0].dataIndex];
          return `${f.fase}<br/><b>${formatoNumero(f.mediana!)} giorni</b>, su ${f.casi} ${f.casi === 1 ? 'caso' : 'casi'}`;
        },
      },
      xAxis: { type: 'value', min: 0, splitLine: LINEA_GRIGLIA, axisLabel: ASSE_TESTO },
      yAxis: { type: 'category', inverse: true, data: conDati.map((f) => f.fase), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: TESTO, fontFamily: FONT, fontSize: 13 } },
      series: [
        {
          type: 'bar',
          name: 'Giorni',
          barWidth: 14,
          data: conDati.map((f, i) => ({ value: f.mediana, itemStyle: stileBarra(SCALA_FERMATE[Math.min(i, 3)]) })),
          label: {
            show: true,
            position: 'right',
            color: TESTO,
            fontFamily: FONT,
            formatter: (x: unknown) => {
              const f = conDati[(x as { dataIndex: number }).dataIndex];
              return `${formatoNumero(f.mediana!)} giorni, ${f.casi} ${f.casi === 1 ? 'caso' : 'casi'}`;
            },
          },
        },
      ],
    },
  };
}

// -------------------------------------------------------- cosa funziona

export function graficoBarre(titolo: string, barre: Barra[]): ModelloGrafico {
  return {
    descrizione: `${titolo}: ${barre.map((b) => `${b.etichetta} ${pct(b.tasso)} su ${b.n} candidature${b.pochiDati ? ' (pochi dati)' : ''}`).join(', ')}.`,
    tabella: {
      colonne: [{ titolo: 'Gruppo' }, { titolo: 'Candidature', numerica: true }, { titolo: 'Con risposta', numerica: true }, { titolo: 'Tasso', numerica: true }],
      righe: barre.map((b) => [b.etichetta, b.n, b.risposte, `${pct(b.tasso)}${b.pochiDati ? ' (pochi dati)' : ''}`]),
    },
    opzioni: {
      ...BASE,
      grid: { left: 112, right: 118, top: 4, bottom: 4 },
      tooltip: {
        ...BASE.tooltip,
        trigger: 'axis',
        axisPointer: { type: 'shadow', shadowStyle: { color: 'rgb(9 45 11 / 0.05)' } },
        formatter: (x: unknown) => {
          const b = barre[(x as { dataIndex: number }[])[0].dataIndex];
          return `${b.etichetta}<br/><b>${pct(b.tasso)}</b>, ${b.risposte} risposte su ${b.n}${b.pochiDati ? '<br/>Pochi dati: il valore è poco affidabile.' : ''}`;
        },
      },
      xAxis: { type: 'value', min: 0, max: 1, show: false },
      yAxis: {
        type: 'category',
        inverse: true,
        data: barre.map((b) => b.etichetta),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: TESTO, fontFamily: FONT, fontSize: 13, width: 104, overflow: 'truncate' },
      },
      series: [
        {
          type: 'bar',
          name: 'Tasso di risposta',
          barWidth: 12,
          data: barre.map((b, i) => {
            const colore = b.etichetta === 'Altre' ? COLORE_ALTRE : CATEGORIE[i % CATEGORIE.length];
            return {
              value: b.tasso,
              // Sotto le cinque candidature la barra è tratteggiata.
              itemStyle: b.pochiDati ? { color: 'rgba(255,255,255,0)', borderColor: colore, borderWidth: 1.5, borderType: 'dashed', borderRadius: 4 } : stileBarra(colore),
            };
          }),
          label: {
            show: true,
            position: 'right',
            color: TESTO,
            fontFamily: FONT,
            fontSize: 12.5,
            formatter: (x: unknown) => {
              const b = barre[(x as { dataIndex: number }).dataIndex];
              return `${pct(b.tasso)}${b.pochiDati ? ' pochi dati' : ''}`;
            },
          },
        },
      ],
    },
  };
}

// --------------------------------------------------------------- costanza

const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

export function graficoCalendario(giorni: Giorno[], da: DataISO, a: DataISO): ModelloGrafico {
  const totale = giorni.reduce((s, g) => s + g.n, 0);
  const attivi = giorni.filter((g) => g.n > 0);
  return {
    descrizione: `Candidature inviate giorno per giorno dal ${formatoCompleto(da)} al ${formatoCompleto(a)}: ${totale} invii in ${attivi.length} giorni.`,
    tabella: {
      colonne: [{ titolo: 'Giorno' }, { titolo: 'Invii', numerica: true }],
      righe: attivi.map((g) => [`${nomeGiorno(g.data)} ${formatoCompleto(g.data)}`, g.n]),
    },
    opzioni: {
      ...BASE,
      tooltip: {
        ...BASE.tooltip,
        formatter: (x: unknown) => {
          const [d, n] = (x as { value: [string, number] }).value;
          return `${nomeGiorno(d)} ${formatoCompleto(d)}<br/><b>${n === 0 ? 'Nessun invio' : n === 1 ? '1 invio' : `${n} invii`}</b>`;
        },
      },
      visualMap: {
        type: 'piecewise',
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        itemWidth: 14,
        itemHeight: 14,
        itemGap: 14,
        textStyle: { color: TESTO_2, fontFamily: FONT, fontSize: 12 },
        pieces: [
          { value: 0, label: 'Nessun invio', color: '#EBEBDD' },
          { value: 1, label: '1', color: '#8CBF45' },
          { value: 2, label: '2', color: '#5E9A2E' },
          { value: 3, label: '3', color: '#3F7D20' },
          { min: 4, label: '4 o più', color: '#173814' },
        ],
      },
      calendar: {
        range: [da, a],
        left: 34,
        right: 8,
        top: 26,
        bottom: 44,
        cellSize: ['auto', 15],
        orient: 'horizontal',
        itemStyle: { borderWidth: 2.5, borderColor: '#FFFFFF', borderRadius: 4 },
        splitLine: { show: false },
        yearLabel: { show: false },
        monthLabel: { nameMap: MESI, color: TESTO_2, fontFamily: FONT, fontSize: 12 },
        dayLabel: { firstDay: 1, nameMap: ['D', 'L', 'M', 'M', 'G', 'V', 'S'], color: TESTO_2, fontFamily: FONT, fontSize: 11 },
      },
      series: [{ type: 'heatmap', coordinateSystem: 'calendar', name: 'Invii', data: giorni.map((g) => [g.data, g.n]) }],
    },
  };
}

/** Primo giorno del calendario: ultime `settimane` settimane. */
export function inizioCalendario(oggi: DataISO, settimane: number): DataISO {
  return aggiungiGiorni(oggi, -(settimane * 7 - 1));
}
