import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable, throwError, forkJoin } from "rxjs";
import { catchError, retry, tap } from "rxjs/operators";
import { environment } from "../../../environments/environment";

/**
 * Metadata type keys used by Items module (string-based typeName param)
 */
const ITEMS_METADATA_TYPES: Record<string, string> = {
  units: "Inv_Units",
  nature: "Inv_CodeNature",
  domain: "Inv_CodeDomain",
  partcodes: "Inv_PartCodes",
  made: "Inv_Made",
  usedFor: "Inv_UsedFor",
  category: "Inv_Category",
  shippingPlatform: "Inv_ShippingFlatform",
  billingStatus: "Inv_BillingStatus",
  productStatus: "Inv_productStatus",
};


@Injectable({ providedIn: "root" })
export class MetadataService {
  private baseUrl = environment.meteDataUrl;

  constructor(private http: HttpClient) { }

  /**
   * Fetch a single metadata list by string typeName (used by Items)
   */
  getDropdownByTypeName(typeName: string): Observable<any> {
    return this.http
      .get<any>(`${this.baseUrl}/getValuesListByType_1_0`, {
        params: new HttpParams().set("typeName", typeName),
      })
      .pipe(
        retry(1),
        catchError((error) => {
          console.error(`Error fetching metadata for typeName "${typeName}":`, error);
          return throwError(() => error);
        }),
      );
  }

  /**
   * Fetch all dropdowns needed for the Items module simultaneously
   */
  getAllItemDropdowns(): Observable<any> {
    const requests: Record<string, Observable<any>> = {};
    Object.entries(ITEMS_METADATA_TYPES).forEach(([key, typeName]) => {
      requests[key] = this.getDropdownByTypeName(typeName);
    });
    return forkJoin(requests).pipe(
      catchError((error) => throwError(() => error)),
    );
  }


  /**
   * Fetch a single metadata list by numeric type ID (used by Products)
   */
  getDropdownByTypeId(typeId: number): Observable<any> {
    return this.http
      .get<any>(`${this.baseUrl}/getValuesListByType_1_0`, {
        params: new HttpParams().set("type", typeId),
      })
      .pipe(
        retry(1),
        // tap((response) => console.log(`Metadata response for type ${typeId}:`, response)),
        catchError((error) => {
          console.error(`Error fetching metadata for typeId ${typeId}:`, error);
          return throwError(() => error);
        }),
      );
  }

}
