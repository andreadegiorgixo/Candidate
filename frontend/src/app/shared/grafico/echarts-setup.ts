import { BarChart, HeatmapChart, LineChart, SankeyChart } from 'echarts/charts';
import {
  AriaComponent,
  CalendarComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TooltipComponent,
  VisualMapComponent,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { provideEchartsCore } from 'ngx-echarts';

echarts.use([
  BarChart,
  LineChart,
  SankeyChart,
  HeatmapChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
  CalendarComponent,
  VisualMapComponent,
  AriaComponent,
  CanvasRenderer,
]);

/** Solo i moduli usati: va registrato nelle rotte che mostrano grafici. */
export function provideGrafici() {
  return provideEchartsCore({ echarts });
}
