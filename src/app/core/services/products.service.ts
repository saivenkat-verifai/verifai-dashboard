import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable, throwError } from "rxjs";
import { catchError, retry } from "rxjs/operators";
import { environment } from "../../../environments/environment";

@Injectable({ providedIn: "root" })
export class ProductsService {
  private baseUrl = environment.apiBaseUrl + '/inventory';

  constructor(private http: HttpClient) { }

  /**
   * Fetch all products for ALL tab (list view)
   */
  getAllProducts(page_num: number = 1, page_size: number = 10, search: string = ''): Observable<any> {
    let params = new HttpParams()
      .set('page_num', page_num.toString())
      .set('page_size', page_size.toString());

    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<any>(`${this.baseUrl}/getAllProductsList_1_0`, { params }).pipe(
      retry(1),
      catchError((error) => {
        console.error("Error fetching products:", error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Fetch masters products for MASTERS tab
   */
  getMastersProducts(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/getProductsList_1_0`).pipe(
      retry(1),
      catchError((error) => {
        console.error("Error fetching masters products:", error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Fetch product details by ID
   */
  getProductDetails(productId: number): Observable<any> {
    const params = new HttpParams().set("product_id", productId.toString());
    return this.http
      .get<any>(`${this.baseUrl}/getProductDetails_1_0`, { params })
      .pipe(
        retry(1),
        catchError((error) => {
          console.error("Error fetching product details:", error);
          return throwError(() => error);
        }),
      );
  }

  /**
   * Fetch all product details by ID (for listitem view)
   */
  getProductAllDetails(productDetailId: number): Observable<any> {
    const params = new HttpParams().set("productDetailId", productDetailId.toString());
    return this.http
      .get<any>(`${this.baseUrl}/getProductAllDetails_1_0`, { params })
      .pipe(
        retry(1),
        catchError((error) => {
          console.error("Error fetching all product details:", error);
          return throwError(() => error);
        }),
      );
  }

  /**
   * Create a new product
   */
  createProduct(productData: any, imageFile?: File): Observable<any> {
    return this.http
      .post<any>(`${this.baseUrl}/createProduct_1_0`, productData)
      .pipe(
        catchError((error) => {
          return throwError(() => error);
        }),
      );
  }

  /**
   * Update an existing product
   */
  updateProduct(productId: number, productData: any): Observable<any> {
    return this.http
      .put<any>(`${this.baseUrl}/updateProductDetails_1_0`, productData)
      .pipe(
        catchError((error) => {
          console.error("Error updating product:", error);
          return throwError(() => error);
        }),
      );
  }

  /**
   * Get list of products (for dropdown in add product modal)
   */
  getProductsList(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/getProducts_1_0`).pipe(
      retry(1),
      catchError((error) => {
        console.error("Error fetching products list:", error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Get product code based on product details
   */
  getProductCode(payload: any): Observable<any> {
    let params = new HttpParams().set("productName", payload.productName);

    if (payload.nature) params = params.set("nature", payload.nature);
    if (payload.domain) params = params.set("domain", payload.domain);
    if (payload.partCode) params = params.set("partCode", payload.partCode);
    if (payload.made) params = params.set("made", payload.made);

    return this.http.get<any>(`${this.baseUrl}/getProductcode_1_0`, { params });
  }

  /**
   * Add a new product instance (stock) - addProduct mode
   */
  addNewProduct(payload: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/addNewProduct_1_0`, payload).pipe(
      catchError((error) => {
        console.error('Error adding new product:', error);
        return throwError(() => error);
      })
    );
  }
}
