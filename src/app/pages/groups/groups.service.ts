import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Observable } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class GroupsService {
  private getQueues =
    "https://usstaging.ivisecurity.com/events_data/getQueuesDetails_1_0";
  private getQueueSitesAndUsers =
    "https://usstaging.ivisecurity.com/events_data/getQueueSitesAndUsers_1_0";

  // Api for creating a queue
  private createQueue =
    "https://usstaging.ivisecurity.com/events_data/createQueue_1_0";
  // Api for getting the Levels dropdown
  private getLevelsInfo =
    "https://usstaging.ivisecurity.com/events_data/getLevelsInfo_1_0";

  // add site id ?siteId=36301
  private getCamerasForQueues =
    "https://usstaging.ivisecurity.com/events_data/getCamerasForQueues_1_0";

  private getSitesForQueues =
    "https://usstaging.ivisecurity.com/events_data/getSitesForQueues_1_0";

private addSiteCameraForQueue =
    "https://usstaging.ivisecurity.com/events_data/addSiteCameraForQueue_1_0";

      // New APIs
  private listUsersByDepartment = "https://usstaging.ivisecurity.com/events_data/listUsersByDepartment_1_0";
  private addQueueUsers = "https://usstaging.ivisecurity.com/events_data/addQueueUsers_1_0";

  private inActiveQueueUserMapping = 'https://usstaging.ivisecurity.com/events_data/inActiveQueueUserMapping_1_0';
  private inActiveQueueSiteMapping = 'https://usstaging.ivisecurity.com/events_data/inActiveQueueSiteMapping_1_0';
  private inActiveQueue = 'https://usstaging.ivisecurity.com/events_data/inActiveQueue_1_0';


  constructor(private http: HttpClient) {}

  // First API: Get all queue's
  getGroups(): Observable<any> {
    return this.http.get<any>(this.getQueues);
  }

  

  // Second API: Get sites and users for a queue
  getGroupSitesAndUsers(queueId: number): Observable<any> {
    console.log(queueId,"groupservice")
    return this.http.get<any>(
      `${this.getQueueSitesAndUsers}?queueId=${queueId}`
    );
    console.log("queue ID:", queueId); // Debugging line to check queueId value
  }

  postQueues(data: any): Observable<any> {
    console.log("Payload before hitting API:", data); // <--- log the data
    const headers = new HttpHeaders({
      "content-Type": "application/json",
    });
    return this.http.post(this.createQueue, data, { headers });
  }

  getLevels(): Observable<any> {
    return this.http.get<any>(this.getLevelsInfo);
  }

   getSites(): Observable<any> {
    return this.http.get<any>(this.getSitesForQueues);
  }

  getCameras(siteId: number): Observable<any> {
  return this.http.get<any>(`${this.getCamerasForQueues}?siteId=${siteId}`);
}

  postSiteCamera(data: any): Observable<any> {
  const headers = { "Content-Type": "application/json" };
  return this.http.post(this.addSiteCameraForQueue, data, { headers });
}

 getUsersByDepartment(): Observable<any> {
    return this.http.get<any>(this.listUsersByDepartment);
  }

  // POST selected users to queue
addUsersToQueue(payload: any): Observable<any> {
  const headers = { "Content-Type": "application/json" };
  return this.http.post(this.addQueueUsers, payload, { headers });
}

  inactivateQueuesUser(userId: number, modifiedBy: number): Observable<any> {
    const url = `${this.inActiveQueueUserMapping}?userId=${userId}&modifiedBy=${modifiedBy}`;
    console.log('Calling API URL:', url);
    return this.http.put(url, null); // body is null
  }

inactivateQueuesSite(siteId: number, modifiedBy: number): Observable<any> {
    const url = `${this.inActiveQueueSiteMapping}?siteId=${siteId}&modifiedBy=${modifiedBy}`;
    console.log('Calling API URL:', url);
    return this.http.put(url, null); // body is null
  }



  toggleQueueStatus(queueId: number, status: string, modifiedBy: number): Observable<any> {
  const url = `${this.inActiveQueue}?queueId=${queueId}&status=${status}&modifiedBy=${modifiedBy}`;
  console.log("Calling API URL:", url);
  return this.http.put(url, null);
}

}
