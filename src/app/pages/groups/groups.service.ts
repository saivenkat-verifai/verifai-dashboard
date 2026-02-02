import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "src/environments/environment";

@Injectable({
  providedIn: "root",
})
export class GroupsService {
  // 🔹 Base URL from environment

  private readonly getQueuesUrl =
    `${environment.eventDataUrl}/getQueuesDetails_1_0`;

  private readonly getQueueSitesAndUsersUrl =
    `${environment.eventDataUrl}/getQueueSitesAndUsers_1_0`;

  private readonly createQueueUrl =
    `${environment.eventDataUrl}/createQueue_1_0`;

  private readonly getLevelsInfoUrl =
    `${environment.eventDataUrl}/getLevelsInfo_1_0`;

  private readonly getCamerasForQueuesUrl =
    `${environment.eventDataUrl}/getCamerasForQueues_1_0`;

  private readonly getSitesForQueuesUrl =
    `${environment.eventDataUrl}/getSitesForQueues_1_0`;

  private readonly addSiteCameraForQueueUrl =
    `${environment.eventDataUrl}/addSiteCameraForQueue_1_0`;

  // New APIs
  private readonly listUsersByDepartmentUrl =
    `${environment.eventDataUrl}/listUsersByDepartment_1_0`;

  private readonly addQueueUsersUrl =
    `${environment.eventDataUrl}/addQueueUsers_1_0`;

  private readonly inActiveQueueUserMappingUrl =
    `${environment.eventDataUrl}/inActiveQueueUserMapping_1_0`;

  private readonly inActiveQueueSiteMappingUrl =
    `${environment.eventDataUrl}/inActiveQueueSiteMapping_1_0`;

  private readonly inActiveQueueUrl =
    `${environment.eventDataUrl}/inActiveQueue_1_0`;

  private readonly inActiveQueueCameraMappingUrl =
    `${environment.eventDataUrl}/inActiveQueueCameraMapping_1_0`;

  constructor(private http: HttpClient) { }

  // First API: Get all queues
  getGroups(): Observable<any> {
    return this.http.get<any>(this.getQueuesUrl);
  }

  // Second API: Get sites and users for a queue
  getGroupSitesAndUsers(queueId: number): Observable<any> {
    // console.log(queueId, "groupservice");
    const url = `${this.getQueueSitesAndUsersUrl}?queueId=${queueId}`;
    return this.http.get<any>(url);
  }

  postQueues(data: any): Observable<any> {
    console.log("Payload before hitting API:", data);
    const headers = new HttpHeaders({
      "Content-Type": "application/json",
    });
    return this.http.post(this.createQueueUrl, data, { headers });
  }

  getLevels(): Observable<any> {
    return this.http.get<any>(this.getLevelsInfoUrl);
  }

  getSites(): Observable<any> {
    return this.http.get<any>(this.getSitesForQueuesUrl);
  }

  getCameras(siteId: number): Observable<any> {
    const url = `${this.getCamerasForQueuesUrl}?siteId=${siteId}`;
    return this.http.get<any>(url);
  }

  postSiteCamera(data: any): Observable<any> {
    const headers = { "Content-Type": "application/json" };
    return this.http.post(this.addSiteCameraForQueueUrl, data, { headers });
  }

  getUsersByDepartment(): Observable<any> {
    return this.http.get<any>(this.listUsersByDepartmentUrl);
  }

  // POST selected users to queue
  addUsersToQueue(payload: any): Observable<any> {
    const headers = { "Content-Type": "application/json" };
    return this.http.post(this.addQueueUsersUrl, payload, { headers });
  }

  inactivateQueuesUser(
    userId: number,
    queueId: number,
    modifiedBy: number
  ): Observable<any> {
    const url =
      `${this.inActiveQueueUserMappingUrl}?userId=${userId}` +
      `&queueId=${queueId}&modifiedBy=${modifiedBy}`;
    console.log("Calling API URL:", url);
    return this.http.put(url, null);
  }

  inactivateQueuesSite(
    siteId: number,
    queueId: number,
    modifiedBy: number
  ): Observable<any> {
    const url =
      `${this.inActiveQueueSiteMappingUrl}?siteId=${siteId}` +
      `&queueId=${queueId}&modifiedBy=${modifiedBy}`;
    console.log("Calling API URL:", url);
    return this.http.put(url, null);
  }

  toggleQueueStatus(
    queueId: number,
    status: string,
    modifiedBy: number
  ): Observable<any> {
    const url =
      `${this.inActiveQueueUrl}?queueId=${queueId}` +
      `&status=${status}&modifiedBy=${modifiedBy}`;
    console.log("Calling API URL:", url);
    return this.http.put(url, null);
  }

  inactivateQueuesCamera(
    cameraId: string,
    queueSitesId: number,
    modifiedBy: number
  ): Observable<any> {
    const url =
      `${this.inActiveQueueCameraMappingUrl}?cameraId=${cameraId}` +
      `&queueSitesId=${queueSitesId}&modifiedBy=${modifiedBy}`;
    return this.http.put(url, {}); // body is empty per API spec
  }
}
