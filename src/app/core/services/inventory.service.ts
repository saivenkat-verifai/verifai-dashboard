import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  IssuedListParams, IssuedListResponse, IssuedDetailResponse, ItemsForIssueResponse, ProductsForIssueResponse, ReturnableStockResponse, AddReturnPayload,
  ReturnListParams,
  ReturnListResponse,
  ReturnDetailsResponse,
  UpdateReturnPayload,
  SiteInventoryResponse
} from '../models/inventory.models';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private baseUrl = environment.apiBaseUrl + '/inventory';

  constructor(private http: HttpClient) { }

  getSiteInventory(siteId: number, viewType: 'NORMAL' | 'DETAILED'): Observable<SiteInventoryResponse> {
    const params = new HttpParams()
      .set('siteId', siteId.toString())
      .set('viewType', viewType);
    return this.http.get<SiteInventoryResponse>(`${this.baseUrl}/getSiteInventory_1_0`, { params });
  }

  getPurchaseSources(country?: string, entityType?: string): Observable<any> {
    let params = new HttpParams();
    if (country) {
      params = params.set('country', country.toLowerCase());
    }
    if (entityType) {
      params = params.set('entityType', entityType);
    }
    return this.http.get<any>(`${this.baseUrl}/getPurchaseSources_1_0`, { params }).pipe(
      catchError((error) => throwError(() => error))
    );
  }
  getPurchaseDetails(purchaseId: number): Observable<any> {
    let params = new HttpParams().set('purchaseId', purchaseId.toString());
    return this.http.get<any>(`${this.baseUrl}/getPurchaseDetails_1_0`, { params }).pipe(
      catchError((error) => throwError(() => error))
    );
  }

  getPurchaseList(paramsObj: { startDate?: string, endDate?: string, pageNo: number, pageSize: number }): Observable<any> {
    let params = new HttpParams()
      .set('pageNo', paramsObj.pageNo.toString())
      .set('pageSize', paramsObj.pageSize.toString());

    if (paramsObj.startDate) {
      params = params.set('startDate', paramsObj.startDate);
    }
    if (paramsObj.endDate) {
      params = params.set('endDate', paramsObj.endDate);
    }

    return this.http.get<any>(`${this.baseUrl}/getPurchaseList_1_0`, { params }).pipe(
      catchError((error) => throwError(() => error))
    );
  }

  createPurchaseInvoice(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/createPurchaseInvoice_1_0`, formData).pipe(
      catchError((error) => throwError(() => error))
    );
  }

  updatePurchase_1_0(payload: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/updatePurchase_1_0`, payload).pipe(
      catchError((error) => throwError(() => error))
    );
  }

  createIssue_1_0(payload: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/createIssue_1_0`, payload).pipe(
      catchError((error) => throwError(() => error))
    );
  }

  updateIssueStatus_1_0(issueId: number, payload: any): Observable<any> {
    const params = new HttpParams().set('issueId', issueId.toString());
    return this.http.put<any>(`${this.baseUrl}/updateIssueStatus_1_0`, payload, { params }).pipe(
      catchError((error) => throwError(() => error))
    );
  }

  getStockSummary(
    page: number = 1,
    pageSize: number = 15,
    search: string = '',
    startDate?: string,
    endDate?: string,
    storeId?: string | number
  ): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (search) params = params.set('search', search);
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    if (storeId && storeId !== 'all') params = params.set('storeId', storeId.toString());

    return this.http.get<any>(`${this.baseUrl}/getStockSummary_1_0`, { params }).pipe(
      catchError((error) => throwError(() => error))
    );
  }

  getIssuedList(paramsObj: IssuedListParams): Observable<IssuedListResponse> {
    let params = new HttpParams()
      .set('pageNo', paramsObj.pageNo.toString())
      .set('pageSize', paramsObj.pageSize.toString());

    if (paramsObj.search) params = params.set('search', paramsObj.search);
    if (paramsObj.fromDate) params = params.set('fromDate', paramsObj.fromDate);
    if (paramsObj.toDate) params = params.set('toDate', paramsObj.toDate);
    if (paramsObj.status) params = params.set('status', paramsObj.status);
    if (paramsObj.storeId != null) params = params.set('storeId', paramsObj.storeId.toString());

    return this.http.get<IssuedListResponse>(`${this.baseUrl}/getIssuedList_1_0`, { params }).pipe(
      catchError((error) => throwError(() => error))
    );
  }

  getIssueDetails(issueId: number): Observable<IssuedDetailResponse> {
    const params = new HttpParams().set('issueId', issueId.toString());
    return this.http.get<IssuedDetailResponse>(`${this.baseUrl}/getIssueDetails_1_0`, { params }).pipe(
      catchError((error) => throwError(() => error))
    );
  }

  getReturnableStock(returnFromId: number): Observable<ReturnableStockResponse> {
    const params = new HttpParams().set('returnFromId', returnFromId.toString());
    return this.http.get<ReturnableStockResponse>(`${this.baseUrl}/getReturnableStock_1_0`, { params }).pipe(
      catchError((error) => throwError(() => error))
    );
  }

  getItemsForIssue(): Observable<ItemsForIssueResponse> {
    return this.http.get<ItemsForIssueResponse>(`${this.baseUrl}/itemsForIssue_1_0`).pipe(
      catchError((error) => throwError(() => error))
    );
  }

  getProductsForIssue(): Observable<ProductsForIssueResponse> {
    return this.http.get<ProductsForIssueResponse>(`${this.baseUrl}/getProductsForIssue_1_0`).pipe(
      catchError((error) => throwError(() => error))
    );
  }

  createReturn(payload: AddReturnPayload): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/addReturn_1_0`, payload).pipe(
      catchError((error) => throwError(() => error))
    );
  }

  getReturnList(params: ReturnListParams): Observable<ReturnListResponse> {
    let httpParams = new HttpParams()
      .set('pageNo', params.pageNo.toString())
      .set('pageSize', params.pageSize.toString());

    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.startDate) httpParams = httpParams.set('startDate', params.startDate);
    if (params.endDate) httpParams = httpParams.set('endDate', params.endDate);
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.storeId) httpParams = httpParams.set('storeId', params.storeId.toString());

    return this.http.get<ReturnListResponse>(`${this.baseUrl}/getReturnList_1_0`, { params: httpParams });
  }

  getReturnDetails(returnId: number): Observable<ReturnDetailsResponse> {
    const params = new HttpParams().set('returnId', returnId.toString());
    return this.http.get<ReturnDetailsResponse>(`${this.baseUrl}/getReturnDetails_1_0`, { params });
  }

  updateReturn(returnId: number, payload: UpdateReturnPayload): Observable<any> {
    const params = new HttpParams().set('returnId', returnId.toString());
    return this.http.put<any>(`${this.baseUrl}/updateReturn_1_0`, payload, { params });
  }
}
