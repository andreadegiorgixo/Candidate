import type { EChartsCoreOption } from 'echarts/core';
import { aggiungiGiorni, DataISO, formatoBreve, formatoCompleto, nomeGiorno } from '../../core/date';
import { TabellaModello } from '../../shared/tabella-dati/tabella-dati';
import { CATEGORIE, FONT, GRIGLIA, TESTO, TESTO_2 } from '../../shared/grafico/palette';
import { Giorno, Settimana } from './andamento.logic';

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
