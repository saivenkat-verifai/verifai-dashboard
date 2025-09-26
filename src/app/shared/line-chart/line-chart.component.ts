import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import * as Highcharts from 'highcharts';
import { HighchartsChartModule } from 'highcharts-angular';




@Component({
  selector: 'app-line-chart',
  templateUrl: './line-chart.component.html',
  styleUrls: ['./line-chart.component.css'],
  standalone: true,
  imports: [HighchartsChartModule],
})
export class LineChartComponent implements OnChanges {
  @Input() chartMode: 'suspiciousHourlyData' | 'otherMode' = 'suspiciousHourlyData';
  @Input() hourlyData: Highcharts.SeriesOptionsType[] = [];

  Highcharts: typeof Highcharts = Highcharts;
  chartOptions: Highcharts.Options = {};

  // 24-hour categories for the X-axis
  private categories = Array.from({ length: 24 }, (_, i) => `${i + 1}:00`);

  ngOnChanges(changes: SimpleChanges): void {
    if (this.hourlyData && this.hourlyData.length > 0) {
      this.updateChartWithHourlyData();
    } else {
      this.setDefaultChart();
    }
  }

  private updateChartWithHourlyData() {
    this.chartOptions = {
      chart: {
        type: 'line',
        panning: { enabled: false }, // disable panning
        events: {
          load() {
            // Prevent scroll-blocking touch events
            if (this.container) {
              this.container.style.touchAction = 'none';
            }
          },
        },
      },
    
    accessibility: { enabled: true },

      title: { text: 'Suspicious Events Hourly Breakdown', align: 'center' },
      xAxis: { categories: this.categories },
      yAxis: { title: { text: 'Count' } },
      legend: { layout: 'vertical', align: 'right', verticalAlign: 'middle' },
      plotOptions: {
        series: {
          label: { connectorAllowed: false },
          pointStart: 0,
          enableMouseTracking: false, // disables internal Highcharts mouse/touch events
        },
      },
      series: this.hourlyData,
      tooltip: { enabled: false }, // optional: disables tooltips to reduce passive listener warnings
      responsive: {
        rules: [
          {
            condition: { maxWidth: 500 },
            chartOptions: {
              legend: { layout: 'horizontal', align: 'center', verticalAlign: 'bottom' },
            },
          },
        ],
      },
    };
  }

  private setDefaultChart() {
    this.chartOptions = {
      chart: {
        type: 'line',
        panning: { enabled: false },
        events: {
          load() {
            if (this.container) {
              this.container.style.touchAction = 'none';
            }
          },
        },
      },
    accessibility: { enabled: true },
      title: { text: 'No Data', align: 'left' },
      xAxis: { categories: this.categories },
      yAxis: { title: { text: 'Count' } },
      series: [],
      plotOptions: {
        series: { enableMouseTracking: false },
      },
      tooltip: { enabled: false },
    };
  }
}
