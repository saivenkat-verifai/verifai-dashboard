import { Injectable } from "@angular/core";
import {
  HttpClient,
  HttpParams,
  HttpRequest,
  HttpEvent,
  HttpHeaders,
} from "@angular/common/http";
import { Observable, throwError } from "rxjs";
import { catchError, retry } from "rxjs/operators";
import { environment } from "../../../environments/environment";
import { InventoryItemsResponse, InventoryItemDetailsResponse } from "../models/item.models";

@Injectable({ providedIn: "root" })
export class ItemsService {
  private baseUrl = environment.apiBaseUrl + '/inventory';

  constructor(private http: HttpClient) { }

  getItems(page?: number, pageSize?: number): Observable<any> {
    let params = new HttpParams();
    if (page != null) {
      params = params.set("page", page.toString());
    }
    if (pageSize != null) {
      params = params.set("pageSize", pageSize.toString());
    }

    return this.http
      .get<any>(`${this.baseUrl}/getItemsList_1_0`, { params })
      .pipe(
        retry(1),
        catchError((error) => {
          return throwError(() => error);
        }),
      );
  }

  getAllInventoryItems(pageNo: number, pageSize: number, search?: string): Observable<InventoryItemsResponse> {
    let params = new HttpParams()
      .set('pageNo', pageNo.toString())
      .set('pageSize', pageSize.toString());

    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<InventoryItemsResponse>(`${this.baseUrl}/getAllInventoryItems_1_0`, { params }).pipe(
      catchError((error) => {
        console.error("Error fetching all inventory items:", error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Fetch item details by ID
   */
  getItemDetails(itemId: number): Observable<any> {
    return this.http
      .get<any>(`${this.baseUrl}/getItemDetails_1_0/${itemId}`)
      .pipe(
        retry(1),
        catchError((error) => {
          console.error("Error fetching item details:", error);
          return throwError(() => error);
        }),
      );
  }

  /**
   * Fetch detailed view of a physical inventory item
   */
  getInventoryItemDetails(purchaseItemId: number): Observable<InventoryItemDetailsResponse> {
    const params = new HttpParams().set('purchaseItemId', purchaseItemId.toString());
    return this.http.get<InventoryItemDetailsResponse>(`${this.baseUrl}/getInventoryItemDetails_1_0`, { params }).pipe(
      catchError((error) => {
        console.error("Error fetching inventory item details:", error);
        return throwError(() => error);
      })
    );
  }

  /**
  getItemDetails(itemId: number): Observable<any> {
    return this.http
      .get<any>(`${this.baseUrl}/getItemDetails_1_0/${itemId}`)
      .pipe(
        retry(1),
        catchError((error) => {
          console.error("Error fetching item details:", error);
          return throwError(() => error);
        }),
      );
  }

  /**
   * Create a new item - Using multipart/form-data
   */
  createItem(itemData: any, imageFile?: File): Observable<any> {
    const formData = new FormData();
    formData.append("item", JSON.stringify(itemData));
    if (imageFile) {
      formData.append("file", imageFile);
    }
    return this.http
      .post<any>(`${this.baseUrl}/addNewItem_1_0`, formData)
      .pipe(
        catchError((error) => {
          return throwError(() => error);
        }),
      );
  }

  /**
   * Update an existing item
   */
  updateItem(itemId: number, itemData: any): Observable<any> {
    return this.http
      .put<any>(`${this.baseUrl}/updateItem_1_0`, itemData)
      .pipe(
        catchError((error) => {
          return throwError(() => error);
        }),
      );
  }

  getDistinctItemsList(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/getDistinctItem_1_0`).pipe(
      retry(1),
      catchError((error) => {
        return throwError(() => error);
      }),
    );
  }

  getAvailableItems(itemId: number): Observable<any> {
    const params = new HttpParams().set('itemId', itemId.toString());
    return this.http.get<any>(`${this.baseUrl}/getAvailableItems_1_0`, { params }).pipe(
      retry(1),
      catchError((error) => throwError(() => error))
    );
  }

  getItemCode(payload: any): Observable<any> {
    let params = new HttpParams().set("itemName", payload.itemName);
    if (payload.nature) params = params.set("nature", payload.nature);
    if (payload.domain) params = params.set("domain", payload.domain);
    if (payload.partCode) params = params.set("partCode", payload.partCode);
    if (payload.made) params = params.set("made", payload.made);

    return this.http.get<any>(`${this.baseUrl}/getItemcode_1_0`, { params });
  }

}
