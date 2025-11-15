import { Component, OnInit } from '@angular/core';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { CardModule } from 'primeng/card';
import { DashboardService } from './dashboard.service';
import { CalendarComponent } from 'src/app/shared/calendar/calendar.component';
import { ColumnChartComponent } from "src/app/shared/column-chart/column-chart.component";
import { LineChartComponent } from "src/app/shared/line-chart/line-chart.component";
import { ESCALATED_COLORS } from "src/app/shared/constants/chart-colors";

interface CardDot {
  iconcolor: string;
  count: number;
}
interface DashboardCard {
  title: string;
  value: number;
  percentage?: number;
  color: string;
  icons: { iconPath: string; count: number }[];
  colordot: CardDot[];
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    UpperCasePipe,
    HttpClientModule,
    CardModule,
    ColumnChartComponent,
    CalendarComponent,
    LineChartComponent
  ],
})
export class DashboardComponent implements OnInit {
  currentDate = new Date();
  isLoading = false;

  dashboardCards: DashboardCard[] = [];
  escalatedDetails: any[] = [];
  escalatedGraph: any[] = [];
  compareGraph: any[] = [];
  hourlyBreakdownData: any[] = [];

  constructor(private dashboardService: DashboardService) {}

  ngOnInit() {
    const now = new Date();
  }

  // getCircleGradient(percent: number): string {
  //   const deg = percent * 3.6;
  //   return `conic-gradient(#e53935 ${deg}deg, #fce4ec 0deg)`;
  // }

  getCircleGradient(percent: number): string {
  const deg = percent * 3.6;
  return `conic-gradient(#e53935 ${deg}deg, #fce4ec 0deg)`;
}

getSafePercent(percent: number): number {
  // keep a minimal gap for near-complete rings
  if (percent > 97) return 97; // cap visible fill at 97%
  return percent;
}

onDateRangeSelected(event: {
  startDate: Date;
  startTime: string;
  endDate: Date;
  endTime: string;
}) {
  this.isLoading = true;
  this.dashboardService
    .getEventCountsByRange(event.startDate, event.startTime, event.endDate, event.endTime)
    .subscribe({
      next: (data) => {
        if (!data) return;
        this.dashboardCards = this.mapCards(data);
        this.escalatedDetails = this.mapDetails(data.escalated.details);
        this.escalatedGraph = this.mapGraph(data.escalated.details);
        this.compareGraph = this.mapCompareGraph(data.escalated.details);
        this.hourlyBreakdownData = this.mapHourly(data.escalated.details);
      },
      error: (err) => console.error(err),
      complete: () => (this.isLoading = false),
    });
}

private mapCards(data: any): DashboardCard[] {
  const formatTitle = (k: string) =>
    k.replace(/[_\-]/g, ' ')
     .replace(/([A-Z])/g, ' $1')
     .replace(/\s+/g, ' ')
     .trim()
     .replace(/^./, s => s.toUpperCase());

  const items = Object.keys(data).map((rawKey) => {
    const value = data[rawKey] ?? {};
    const keyLc = rawKey.toLowerCase();

    // consider various "total" shapes but exclude percentage fields
    const isTotal =
      keyLc.includes('total') && !keyLc.includes('percentage');

    const percKey = Object.keys(value).find(k => k.toLowerCase().includes('percentage'));

    const card: DashboardCard & { _isTotal: boolean } = {
      title: formatTitle(rawKey),                // becomes "Total Events" → template uppercases to "TOTAL EVENTS"
      value: value.total ?? 0,
      percentage: !isTotal && percKey ? value[percKey] : undefined,
      color: isTotal ? 'red' : 'white',
      colordot: [
        { iconcolor: '#53BF8B', count: value.eventWall ?? 0 },
        { iconcolor: '#FFC400', count: value.manualWall ?? 0 },
      ],
      icons: [
        { iconPath: 'assets/home.svg', count: value.sitesCount ?? 0 },
        { iconPath: 'assets/cam.svg',  count: value.cameraCount ?? 0 },
      ],
      _isTotal: isTotal,
    };
    return card;
  });

  // ensure the total card shows first
  items.sort((a, b) => (a._isTotal === b._isTotal ? 0 : a._isTotal ? -1 : 1));

  // strip helper prop
  return items.map(({ _isTotal, ...rest }) => rest);
}


  private mapDetails(details: any) {
    return Object.keys(details).map((k, i) => ({
      label: k.charAt(0).toUpperCase() + k.slice(1),
      value: details[k].total,
      color: ESCALATED_COLORS[i] || '#000',
      colordot: [
        { iconcolor: '#53BF8B', count: details[k].eventWall },
        { iconcolor: '#FFC400', count: details[k].manualWall },
      ],
      icons: [
        { iconPath: 'assets/home.svg', count: details[k].sitesCount },
        { iconPath: 'assets/cam.svg', count: details[k].cameraCount },
      ],
    }));
  }

  private mapGraph(details: any) {
    return Object.keys(details).map((k) => ({
      label: k,
      value: details[k].total,
      height: details[k].total,
    }));
  }

  private mapCompareGraph(details: any) {
    return Object.keys(details).map((k) => ({
      label: k,
      current: details[k].total,
      previous: Math.floor(details[k].total * 0.8),
    }));
  }

  private mapHourly(details: any) {
    const series: any[] = [];
    Object.keys(details).forEach((k) => {
      const d = details[k];
      series.push({
        name: `${k} - Event Wall`,
        type: 'line',
        data: d.hourlyBreakdown.HourlyEventWall,
      });
      series.push({
        name: `${k} - Manual Wall`,
        type: 'line',
        data: d.hourlyBreakdown.HourlyManualWall,
      });
    });
    return series;
  }
}