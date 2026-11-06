import { BarChart, HeatmapChart } from 'echarts/charts';
import {
  CalendarComponent,
  GridComponent,
  MarkLineComponent,
  TooltipComponent,
  VisualMapComponent,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { provideEchartsCore } from 'ngx-echarts';

echarts.use([
  BarChart,
  HeatmapChart,
  GridComponent,
  TooltipComponent,
  MarkLineComponent,
  CalendarComponent,
  VisualMapComponent,
  CanvasRenderer,
]);

/** Solo i moduli usati: va registrato nelle rotte che mostrano grafici. */
export function provideGrafici() {
  return provideEchartsCore({ echarts });
}
