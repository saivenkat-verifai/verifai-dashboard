import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "src/environments/environment";
import * as moment from "moment";
import { DatePipe } from "@angular/common";

@Injectable({
  providedIn: "root",
})
export class EventsService {
  constructor(
    private datePipe: DatePipe,
    private http: HttpClient,
  ) {}

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
    falsecheck?: boolean,

    filter?: any,
  ): Observable<any> {
    const url =
      `${this.eventReportCountsForActionTag}?fromDate=${startDate}` +
      `&toDate=${endDate}&falseActionTag=${falsecheck}&suspiciousActionTag=${suspiciouscheck}`;

    let params = new HttpParams();

    // if (actionTag) {
    //   params = params.set("actionTag", actionTag);
    // }
    if (
      filter.timeZone !== null &&
      filter.timeZone !== "All" &&
      filter.timeZone !== ""
    ) {
      params = params.set("timezone", filter.timeZone.timezoneCode);
    }

    if (filter.site !== null) {
      params = params.set("siteId", filter.site.siteId);
    }

    if (
      filter.camera !== null &&
      filter.camera !== "" &&
      filter.camera !== "All"
    ) {
      params = params.set("cameraId", filter.camera);
    }

    if (
      filter.consoleType !== null &&
      filter.consoleType !== "" &&
      filter.consoleType !== "All"
    ) {
      params = params.set("EventType", filter.consoleType);
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

  weekdays = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  getHour(timezone: string) {
    return moment().tz(timezone).hours();
  }
  getDay(timezone: string) {
    return moment().tz(timezone).day();
  }

  getEmailDataForVMSEvents(payload: any) {
    let url = `${environment.guard_monitoring_url}/getEmailDataForClosedEvent_1_0`;

    let params = new HttpParams();
    params = params.set("siteId", payload?.siteId);
    params = params.set("siteName", payload?.siteName);
    params = params.set("cameraId", payload?.cameraId);
    params = params.set("alertTypeId", payload?.alertTypeId);
    params = params.set("subTypeId", payload?.subTypeId);
    params = params.set("day", payload?.day);
    params = params.set("hour", payload?.hour);
    params = params.set(
      "currentTime",
      this.datePipe.transform(payload?.currentTime, "yyyy-MM-dd HH:mm:ss")!,
    );

    return this.http.get(url, { params: params });
  }

  sendResolution(payload: any) {
    let url = `${environment.guard_monitoring_url}/sendResolutionEmail_1_0`;

    // let url = `http://192.168.0.125:3009/sendResolutionEmail_1_0`;

    const userString = sessionStorage.getItem("verifai_user");
    const user = userString ? JSON.parse(userString) : null;

    const formData = new FormData();

    formData.append("senderEmail", payload?.senderEmail);

    formData.append(
      "recipientEmails",
      JSON.stringify(payload?.recipientEmails ?? []),
    );
    formData.append("bcc", JSON.stringify(payload?.BCC ?? []));
    formData.append("cc", JSON.stringify(payload?.Cc ?? []));

    formData.append("subject", payload?.emailSubject);
    formData.append("body", payload?.emailBody);

    if (payload?.selectedFiles?.length) {
      payload.selectedFiles.forEach((file: File) => {
        formData.append("files", file);
      });
    }

    // formData.append(
    //   'files',
    //   JSON.stringify(payload?.selectedFiles)
    // );

    formData.append("fields", JSON.stringify(payload?.emailFields));

    formData.append("siteId", payload?.siteId);
    formData.append("cameraId", payload?.cameraId);
    // formData.append('cameraName', payload?.cameraName );

    formData.append("actionsTaken", payload?.action);
    formData.append("notes", payload?.resolution);

    formData.append("eventId", payload?.eventId);
    formData.append("createdBy", user?.UserId);

    formData.append("alerTagId", payload?.alertTagId1);
    formData.append("subAlertTagId", payload?.subAlertTagId);

    formData.append("timeZone", payload?.timezone);

    return this.http.post(url, formData);
  }


    getAlertCategoriesForSiteId(payload: any) {
    let url = `${environment.guard_monitoring_url}/getAlertCategoriesForSiteId_1_0`;
    let params = new HttpParams();

    if (payload?.siteId) {
      params = params.set('siteId', payload?.siteId);
    }

    return this.http.get(url, { params });
  }
}
