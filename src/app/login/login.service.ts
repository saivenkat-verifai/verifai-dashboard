import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import * as CryptoJS from 'crypto-js';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';

export interface LoginResponse {
  Status?: string;
  message?: string;

  UserName?: string;
  UserId?: number;

  AccessToken?: string;
  RefreshToken?: string;

  roleList?: Array<{
    roleId: number;
    roleName: string;
    department: string;
    category: string;
  }>;

  FirstName?: string;
  LastName?: string;
  email?: string;

  // Keep it flexible for extra backend fields
  [key: string]: any;
}

@Injectable({ providedIn: "root" })
export class AuthService {
  /** 🔹 Base URL from environment */
  private readonly baseUrl = `${environment.authBaseUrl}/userDetails`;

  /** 🔹 Storage keys */
  private readonly USER_KEY = 'verifai_user';
  private readonly TOKEN_KEY = 'verifai_token'; // optional, for backward compatibility

  /** 🔹 Encryption key (must match backend) */
  private readonly encryptionKey = 'verifai';

  constructor(private http: HttpClient, private router: Router) { }

  /** =========================
   * AES Encrypt Password -> Base64
   * ========================= */
  private encryptPassword(plainPassword: string): string {
    return CryptoJS.AES.encrypt(plainPassword, this.encryptionKey).toString();
  }

  /** =========================
   * LOGIN API CALL
   * ========================= */
  login(userName: string, password: string): Observable<LoginResponse> {
    const encryptedPassword = this.encryptPassword(password);

    const body = {
      userName,
      password: encryptedPassword,
      callingSystemDetail: 'events-dashboard',
    };

    return this.http.post<LoginResponse>(`${this.baseUrl}/user_login_1_0`, body);
  }

  /** =========================
   * STORAGE HELPERS
   * ========================= */
  getStoredUser(): LoginResponse | null {
    const raw =
      localStorage.getItem(this.USER_KEY) ||
      sessionStorage.getItem(this.USER_KEY);
    return raw ? (JSON.parse(raw) as LoginResponse) : null;
  }

  /** ✅ Needed by your auth.guard.ts */
  isLoggedIn(): boolean {
    const user =
      localStorage.getItem(this.USER_KEY) ||
      sessionStorage.getItem(this.USER_KEY);
    return !!user;
  }

  /** =========================
   * TOKEN GETTERS (Interceptor uses these)
   * ========================= */
  getAccessToken(): string | null {
    // Primary: read from stored user object
    const user = this.getStoredUser();
    if (user?.AccessToken) return user.AccessToken;

    // Fallback: old key if you still store verifai_token
    return (
      localStorage.getItem(this.TOKEN_KEY) ||
      sessionStorage.getItem(this.TOKEN_KEY)
    );
  }

  getRefreshToken(): string | null {
    return this.getStoredUser()?.RefreshToken || null;
  }

  /** Update tokens in same storage where user is stored */
  updateTokens(newAccessToken: string, newRefreshToken?: string) {
    const inLocal = !!localStorage.getItem(this.USER_KEY);
    const inSession = !!sessionStorage.getItem(this.USER_KEY);
    const storage = inLocal ? localStorage : inSession ? sessionStorage : null;
    if (!storage) return;

    const user = JSON.parse(storage.getItem(this.USER_KEY) || '{}');
    user.AccessToken = newAccessToken;
    if (newRefreshToken) user.RefreshToken = newRefreshToken;

    storage.setItem(this.USER_KEY, JSON.stringify(user));

    // Keep TOKEN_KEY updated too (optional/backward compatible)
    storage.setItem(this.TOKEN_KEY, newAccessToken);
  }

  /** =========================
   * REFRESH TOKEN API
   * =========================
   * IMPORTANT: confirm your backend refresh endpoint name.
   * I used refresh_token_1_0 as example.
   */
  refreshAccessToken(): Observable<any> {
    const user: any = this.getStoredUser();
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      return throwError(() => new Error('No RefreshToken found'));
    }

    // const body = {
    //   userName: user?.UserName,
    //   refreshToken,
    //   callingSystemDetail: 'events-dashboard',
    // };

    let params = new HttpParams().set('refresh_token', refreshToken).set('modifiedBy', user?.UserId);
    return this.http.post(`${this.baseUrl}/getAccessforRefreshToken`, null, { params });
  }

  /** =========================
   * ✅ Needed by your HeaderComponent
   * ========================= */
  getUserInfoForId(): Observable<any> {
    const user = this.getStoredUser();
    const userId = user?.UserId;
    const accessToken = user?.AccessToken;

    if (!userId || !accessToken) {
      return throwError(() => new Error('Missing UserId or AccessToken'));
    }

    const url = `${this.baseUrl}/getUserInfoForUserId_1_0/${userId}`;

    const headers = new HttpHeaders({
      authorization: `Bearer ${accessToken}`,
    });

    return this.http.get(url, { headers });
  }

  /** =========================
   * LOGOUT
   * ========================= */
  logout(): void {
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.USER_KEY);
    sessionStorage.removeItem(this.TOKEN_KEY);

    this.router.navigate(['/login'], { replaceUrl: true });
  }
}
