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
  private eventReportCountsForActionTag =
    "https://usstaging.ivisecurity.com/events_data/getEventReportCountsForActionTag_1_0";
  private getEventsMoreInfo =
    "https://usstaging.ivisecurity.com/events_data/getEventsMoreInfo_1_0";
  private addCommentForEvent =
    "https://usstaging.ivisecurity.com/events_data/addCommentForEvent_1_0";

  constructor(private http: HttpClient) {}

  getSuspiciousEvents(
    actionTag: number,
    startDate?: string,
    endDate?: string
  ): Observable<any> {
    console.log(startDate, "dates");
    console.log(endDate, "date");
    let startDates = "2025-09-01 00:00:00";
    let endDates = "2025-10-01 03:00:00";
    // Send suspiciousChecked as a query parameter https://usstaging.ivisecurity.com/events_data/getEventReportCountsForActionTag_1_0?date=2025-09-25&actionTag=2
    return this.http.get<any>(
      `${this.eventReportFullData}?fromDate=${startDates}&toDate=${endDates}&actionTag=${actionTag}`
    );
  }

  getEventsPendingEventa(actionTag: number): Observable<any> {
    // Replace with the correct API endpoint if needed
    return this.http.get<any>(`${this.pendingMessagesUrl}?level=${actionTag}`);
  }
  getActionTagCategories(): Observable<any> {
    return this.http.get<any>(this.actionTagCategoriesUrl);
  }

  getEventReportCountsForActionTag(
    date: string,
    actionTag: number
  ): Observable<any> {
    const url = `${this.eventReportCountsForActionTag}?date=${date}&actionTag=${actionTag}`;
    return this.http.get<any>(url);
  }

  getEventMoreInfo(eventId: number): Observable<any> {
    const url = `${this.getEventsMoreInfo}?eventId=${eventId}`;
    return this.http.get<any>(url);
  }

  addComment(event: {
    eventsId: number;
    commentsInfo: string;
    createdBy: number;
    remarks: string;
  }): Observable<any> {
    return this.http.post<any>(this.addCommentForEvent, event, {
      headers: { "Content-Type": "application/json" },
    });
  }
}
