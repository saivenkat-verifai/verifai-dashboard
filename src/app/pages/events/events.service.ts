import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "src/environments/environment";

@Injectable({
  providedIn: "root",
})
export class EventsService {
  // 🔹 Base URLs from environment
  private readonly apiBaseUrl = environment.apiBaseUrl;
  private readonly mqBaseUrl =
    environment.mqApiBaseUrl ?? environment.apiBaseUrl;

  // 🔹 events_data endpoints
  private readonly eventReportFullData = `${this.apiBaseUrl}/events_data/getEventReportFullData_1_0`;

  private readonly actionTagCategoriesUrl = `${this.apiBaseUrl}/events_data/getActionTagCategories_1_0`;

  private readonly eventReportCountsForActionTag = `${this.apiBaseUrl}/events_data/getEventReportCountsForActionTag_1_0`;

  private readonly getEventsMoreInfoUrl = `${this.apiBaseUrl}/events_data/getEventsMoreInfo_1_0`;

  private readonly addCommentForEventUrl = `${this.apiBaseUrl}/events_data/addCommentForEvent_1_0`;

  private readonly updateEventsMoreInfoUrl = `${this.apiBaseUrl}/events_data/updateEventsMoreInfo_1_0`;

  private readonly consoleEventsCountsUrl = `${this.apiBaseUrl}/events_data/getConsoleEventsCounts_1_0`;

  private readonly consolePendingMessagesDataUrl = `${this.apiBaseUrl}/events_data/getConsolePendingMessages_1_0`;

  // 🔹 MQ / queueManagement endpoints
  private readonly pendingMessagesUrl = `${this.mqBaseUrl}/queueManagement/getEventsPendingMessages_1_0`;

  private readonly consolePendingMessagesUrl = `${this.mqBaseUrl}/queueManagement/getConsolePendingMessages_1_0`;

  private readonly pendingEventsCountsUrl = `${this.mqBaseUrl}/queueManagement/getPendingEventsCounts_1_0`;

  constructor(private http: HttpClient) {}

  getSuspiciousEvents(
    actionTag: number,
    startDate?: string,
    endDate?: string
  ): Observable<any> {
    return this.http.get<any>(
      `${this.eventReportFullData}?fromDate=${startDate}&toDate=${endDate}&actionTag=${actionTag}`
    );
  }

  getConsoleEventsCounts_1_0(): Observable<any> {
    return this.http.get<any>(this.consoleEventsCountsUrl);
  }

  getPendingEventsCounts_1_0(): Observable<any> {
    return this.http.get<any>(this.pendingEventsCountsUrl);
  }

  // ✅ From events_data
  getConsolePendingMessages_1_0(): Observable<any> {
    return this.http.get<any>(this.consolePendingMessagesDataUrl);
  }

  // ✅ From MQ queueManagement
  getEventsPendingMessages_1_0(): Observable<any> {
    return this.http.get<any>(this.pendingMessagesUrl);
  }

  getActionTagCategories(): Observable<any> {
    return this.http.get<any>(this.actionTagCategoriesUrl);
  }

  getEventReportCountsForActionTag(
    startDate?: string,
    endDate?: string,
    actionTag?: number
  ): Observable<any> {
    const url =
      `${this.eventReportCountsForActionTag}?fromDate=${startDate}` +
      `&toDate=${endDate}&actionTag=${actionTag}`;
    return this.http.get<any>(url);
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
}
