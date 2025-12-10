import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, of, concat } from "rxjs";
import { catchError } from "rxjs/operators";
import { environment } from "src/environments/environment";  // 👈 IMPORTANT

@Injectable({
  providedIn: "root",
})
export class DashboardService {
  // 👇 Build the full endpoint from the env MQ base URL
  private readonly baseUrl = `${environment.mqApiBaseUrl}/queueManagement/getEventDashboardHourlyCounts_1_0`;

  constructor(private http: HttpClient) {}

  getEventCountsByRange(
    startDate: Date,
    startTime: string,
    endDate: Date,
    endTime: string
  ): Observable<any> {
    const fromDateTime = this.formatDateTime(startDate, startTime);
    const toDateTime = this.formatDateTime(endDate, endTime);

    const apiUrl = `${this.baseUrl}?fromDate=${encodeURIComponent(
      fromDateTime
    )}&toDate=${encodeURIComponent(toDateTime)}`;

    const defaultData = {
      total: {
        total: 0,
        totalPercentage: 0,
        eventWall: 0,
        manualWall: 0,
        sitesCount: 0,
        cameraCount: 0,
      },
      false: {
        total: 0,
        falsePercentage: 0,
        eventWall: 0,
        manualWall: 0,
        sitesCount: 0,
        cameraCount: 0,
      },
      "timed-out": {
        total: 0,
        missedWallPercentage: 0,
        eventWall: 0,
        manualWall: 0,
        sitesCount: 0,
        cameraCount: 0,
      },
      escalated: {
        total: 0,
        suspiciousPercentage: 0,
        eventWall: 0,
        manualWall: 0,
        sitesCount: 0,
        cameraCount: 0,
        details: {
          suspicious: {
            total: 0,
            eventWall: 0,
            manualWall: 0,
            sitesCount: 0,
            cameraCount: 0,
            hourlyBreakdown: {
              HourlyEventWall: new Array(24).fill(0),
              HourlyManualWall: new Array(24).fill(0),
            },
          },
          arrest: {
            total: 0,
            eventWall: 0,
            manualWall: 0,
            sitesCount: 0,
            cameraCount: 0,
            hourlyBreakdown: {
              HourlyEventWall: new Array(24).fill(0),
              HourlyManualWall: new Array(24).fill(0),
            },
          },
          deterred: {
            total: 0,
            eventWall: 0,
            manualWall: 0,
            sitesCount: 0,
            cameraCount: 0,
            hourlyBreakdown: {
              HourlyEventWall: new Array(24).fill(0),
              HourlyManualWall: new Array(24).fill(0),
            },
          },
          information: {
            total: 0,
            eventWall: 0,
            manualWall: 0,
            sitesCount: 0,
            cameraCount: 0,
            hourlyBreakdown: {
              HourlyEventWall: new Array(24).fill(0),
              HourlyManualWall: new Array(24).fill(0),
            },
          },
          "police call": {
            total: 0,
            eventWall: 0,
            manualWall: 0,
            sitesCount: 0,
            cameraCount: 0,
            hourlyBreakdown: {
              HourlyEventWall: new Array(24).fill(0),
              HourlyManualWall: new Array(24).fill(0),
            },
          },
          oversight: {
            total: 0,
            eventWall: 0,
            manualWall: 0,
            sitesCount: 0,
            cameraCount: 0,
            hourlyBreakdown: {
              HourlyEventWall: new Array(24).fill(0),
              HourlyManualWall: new Array(24).fill(0),
            },
          },
        },
      },
      pending: {
        total: 0,
        pendingPercentage: 0,
        eventWall: 0,
        manualWall: 0,
        sitesCount: 0,
        cameraCount: 0,
      },
    };

    const apiRequest$ = this.http.get<any>(apiUrl).pipe(
      catchError((error) => {
        console.error("API error, returning default data:", error);
        return of(defaultData);
      })
    );

    return concat(of(defaultData), apiRequest$);
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = ("0" + (date.getMonth() + 1)).slice(-2);
    const d = ("0" + date.getDate()).slice(-2);
    return `${y}-${m}-${d}`;
  }

  private formatDateTime(date: Date, time: string): string {
    const dateObj = new Date(`${this.formatDate(date)} ${time}`);
    const y = dateObj.getFullYear();
    const m = ("0" + (dateObj.getMonth() + 1)).slice(-2);
    const d = ("0" + dateObj.getDate()).slice(-2);
    const hh = ("0" + dateObj.getHours()).slice(-2);
    const mm = ("0" + dateObj.getMinutes()).slice(-2);
    const ss = ("0" + dateObj.getSeconds()).slice(-2);

    return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
  }
}
