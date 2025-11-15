import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class EventsService {
  private eventReportFullData =
    "https://usstaging.ivisecurity.com/events_data/getEventReportFullData_1_0";
  private actionTagCategoriesUrl =
    "https://usstaging.ivisecurity.com/events_data/getActionTagCategories_1_0";

  private pendingMessagesUrl =
    "https://stagingmq.ivisecurity.com/queueManagement/getEventsPendingMessages_1_0";

  private consolePendingMessagesUrl =
    "https://stagingmq.ivisecurity.com/queueManagement/getConsolePendingMessages_1_0";

  private eventReportCountsForActionTag =
    "https://usstaging.ivisecurity.com/events_data/getEventReportCountsForActionTag_1_0";
  private getEventsMoreInfo =
    "https://usstaging.ivisecurity.com/events_data/getEventsMoreInfo_1_0";
  private addCommentForEvent =
    "https://usstaging.ivisecurity.com/events_data/addCommentForEvent_1_0";
  private updateEventsMoreInfo =
    "https://usstaging.ivisecurity.com/events_data/updateEventsMoreInfo_1_0";

      private consoleEventsCountsUrl =
    'https://usstaging.ivisecurity.com/events_data/getConsoleEventsCounts_1_0';

  private pendingEventsCountsUrl =
    'https://stagingmq.ivisecurity.com/queueManagement/getPendingEventsCounts_1_0';


  constructor(private http: HttpClient) {}

  getSuspiciousEvents(
    actionTag: number,
    startDate?: string,
    endDate?: string
  ): Observable<any> {
    console.log(startDate, "dates");
    console.log(endDate, "date");
    // let startDates = "2025-09-01 00:00:00";
    // let endDates = "2025-10-01 03:00:00";
    // Send suspiciousChecked as a query parameter https://usstaging.ivisecurity.com/events_data/getEventReportCountsForActionTag_1_0?date=2025-09-25&actionTag=2
    return this.http.get<any>(
      `${this.eventReportFullData}?fromDate=${startDate}&toDate=${endDate}&actionTag=${actionTag}`
    );
  }

  // getEventsPendingEventa(actionTag: number): Observable<any> {
  //   // Replace with the correct API endpoint if needed
  //   return this.http.get<any>(`${this.pendingMessagesUrl}`);
  // }

  // getConsolePendingMessagesUrl(actionTag: number): Observable<any> {
  //   // Replace with the correct API endpoint if needed
  //   return this.http.get<any>(`${this.consolePendingMessagesUrl}`);
  // }

    getConsoleEventsCounts_1_0(): Observable<any> {
    return this.http.get<any>(this.consoleEventsCountsUrl);
  }

  getPendingEventsCounts_1_0(): Observable<any> {
    return this.http.get<any>(this.pendingEventsCountsUrl);
  }

  getConsolePendingMessages_1_0() {
    // GET https://usstaging.ivisecurity.com/events_data/getConsolePendingMessages_1_0
    return this.http.get<any>(
      "https://usstaging.ivisecurity.com/events_data/getConsolePendingMessages_1_0"
    );
  }

  getEventsPendingMessages_1_0() {
    // GET https://stagingmq.ivisecurity.com/queueManagement/getEventsPendingMessages_1_0
    return this.http.get<any>(
      "https://stagingmq.ivisecurity.com/queueManagement/getEventsPendingMessages_1_0"
    );
  }

  getActionTagCategories(): Observable<any> {
    return this.http.get<any>(this.actionTagCategoriesUrl);
  }

  getEventReportCountsForActionTag(
    startDate?: string,
    endDate?: string,
    actionTag?: number
  ): Observable<any> {
    const url = `${this.eventReportCountsForActionTag}?fromDate=${startDate}&toDate=${endDate}&actionTag=${actionTag}`;
    return this.http.get<any>(url);
  }

  getEventMoreInfo(eventId: number): Observable<any> {
    const url = `${this.getEventsMoreInfo}?eventId=${eventId}`;
    return this.http.get<any>(url);
  }

  addComment(event: {
    eventsId: string;
    commentsInfo: string;
    createdBy: number;
    remarks: string;
  }): Observable<any> {
    return this.http.post<any>(this.addCommentForEvent, event, {
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
    return this.http.put<any>(this.updateEventsMoreInfo, event, {
      headers: { "Content-Type": "application/json" },
    });
  }
}
