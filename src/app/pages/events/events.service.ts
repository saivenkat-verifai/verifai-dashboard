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
     "https://usstaging.ivisecurity.com/events_data/getEventsMoreInfo_1_0"

  constructor(private http: HttpClient) {}

  getSuspiciousEvents(
    actionTag: number,
    startDate?: string,
    endDate?: string
  ): Observable<any> {
    // let startDate = '2025-09-01'
    // let endDate = '2025-09-30'
    // Send suspiciousChecked as a query parameter https://usstaging.ivisecurity.com/events_data/getEventReportCountsForActionTag_1_0?date=2025-09-25&actionTag=2
    return this.http.get<any>(
      `${this.eventReportFullData}?fromDate=${startDate}&toDate=${endDate}&actionTag=${actionTag}`
    );
  }

  getEventsPendingEventa(actionTag:number): Observable<any> {
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
}
