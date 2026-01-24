import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "src/environments/environment";

@Injectable({
  providedIn: "root",
})
export class EventsService {

  // 🔹 events data endpoints
  private readonly eventReportFullData = `${environment.eventDataUrl}/getEventReportFullData_1_0`;

  private readonly actionTagCategoriesUrl = `${environment.eventDataUrl}/getActionTagCategories_1_0`;

  private readonly eventReportCountsForActionTag = `${environment.eventDataUrl}/getEventReportCountsForActionTag_1_0`;

  private readonly getEventsMoreInfoUrl = `${environment.eventDataUrl}/getEventsMoreInfo_1_0`;

  private readonly addCommentForEventUrl = `${environment.eventDataUrl}/addCommentForEvent_1_0`;

  private readonly updateEventsMoreInfoUrl = `${environment.eventDataUrl}/updateEventsMoreInfo_1_0`;

  private readonly consoleEventsCountsUrl = `${environment.eventDataUrl}/getConsoleEventsCounts_1_0`;

  private readonly consolePendingMessagesDataUrl = `${environment.eventDataUrl}/getConsolePendingMessages_1_0`;

  // 🔹 MQ / queueManagement endpoints
  private readonly pendingMessagesUrl = `${environment.mqApiBaseUrl}/getEventsPendingMessages_1_0`;

  private readonly consolePendingMessagesUrl = `${environment.mqApiBaseUrl}/getConsolePendingMessages_1_0`;

  private readonly pendingEventsCountsUrl = `${environment.mqApiBaseUrl}/getPendingEventsCounts_1_0`;

  constructor(private http: HttpClient) { }

  getSuspiciousEvents(
    actionTag: number,
    startDate?: string,
    endDate?: string,
  ): Observable<any> {
    return this.http.get<any>(
      `${this.eventReportFullData}?fromDate=${startDate}&toDate=${endDate}&actionTag=${actionTag}`,
    );
  }

  getConsoleEventsCounts_1_0(): Observable<any> {
    return this.http.get<any>(this.consoleEventsCountsUrl);
  }

  getPendingEventsCounts_1_0(): Observable<any> {
    return this.http.get<any>(this.pendingEventsCountsUrl);
  }

  // ✅ From events data
  getConsolePendingMessages_1_0(): Observable<any> {
    return this.http.get<any>(`${this.consolePendingMessagesDataUrl}`);
  }

  // ✅ From MQ queueManagement
  getEventsPendingMessages_1_0(): Observable<any> {
    return this.http.get<any>(`${this.pendingMessagesUrl}`);
  }

  getActionTagCategories(): Observable<any> {
    return this.http.get<any>(this.actionTagCategoriesUrl);
  }

  getEventReportCountsForActionTag(
    startDate?: string,
    endDate?: string,
    suspiciouscheck?: boolean,
    falsecheck?:boolean,
    timezone?: string,
  ): Observable<any> {

    const url =
      `${this.eventReportCountsForActionTag}?fromDate=${startDate}` +
      `&toDate=${endDate}&falseActionTag=${falsecheck}&suspiciousActionTag=${suspiciouscheck}`;


    let params = new HttpParams();

    // if (actionTag) {
    //   params = params.set("actionTag", actionTag);
    // }
    if (timezone !== null && timezone !== undefined && timezone !== "") {
      params = params.set("timezone", timezone);
    }

    return this.http.get<any>(url, { params });
  }

  getEventMoreInfo(eventId: number): Observable<any> {
    const url = `${this.getEventsMoreInfoUrl}?eventId=${eventId}`;
    return this.http.get<any>(url);
  }

  addComment(event: {
    eventsId: string;
    commentsInfo: string;
    createdBy: number;
    remarks: string;
  }): Observable<any> {
    return this.http.post<any>(this.addCommentForEventUrl, event, {
      headers: { "Content-Type": "application/json" },
    });
  }

  putEventsMoreInfo(event: {
    eventsId: string;
    userlevel: number;
    user: number;
    alarm: string;
    landingTime: string;
    receivedTime: string;
    reviewStartTime: string;
    reviewEndTime: string;
    actionTag: number;
    subActionTag: number;
    notes: string;
  }): Observable<any> {
    console.log(event, "kk");
    return this.http.put<any>(this.updateEventsMoreInfoUrl, event, {
      headers: { "Content-Type": "application/json" },
    });
  }

  timezoneDropdown() {
    let url = `${environment.eventDataUrl}/getTimezones_1_0`;

    return this.http.get(url);
  }

  downloadExcelreport(payload: any) {
    let url = `${environment.eventDataUrl}/downloadEventsReport_1_0`;
    let params = new HttpParams();

    params = params.set("fromDate", payload?.fromDate);
    params = params.set("toDate", payload?.toDate);
    params = params.set("actionTag", payload?.actionTag);

    return this.http.get<ArrayBuffer>(url, {
      params,
      responseType: "arraybuffer" as "json",
    });
  }
}
