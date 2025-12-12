import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import * as CryptoJS from 'crypto-js';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';

export interface LoginResponse {
  token?: string;
  message?: string;
  status?: string;
  // add more fields based on API response (e.g. userId, roles, etc.)
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // 🔹 Base URL from environment (changes per build)
  private readonly baseUrl = `${environment.authBaseUrl}/userDetails`;

  private readonly encryptionKey = 'verifai'; // AES KEY (must match backend)
  private readonly USER_KEY = 'verifai_user';
  private readonly TOKEN_KEY = 'verifai_token';

  constructor(private http: HttpClient, private router: Router) { }

  /** =========================
   *  AES Encrypt Password to Base64
   *  ========================= */
  private encryptPassword(plainPassword: string): string {
    const encrypted = CryptoJS.AES.encrypt(
      plainPassword,
      this.encryptionKey
    ).toString(); // returns BASE64 automatically

    return encrypted;
  }

  /** =========================
   *  LOGIN API CALL
   *  ========================= */
  login(userName: string, password: string): Observable<LoginResponse> {
    const encryptedPassword = this.encryptPassword(password);
    const body = {
      userName: userName,
      password: encryptedPassword,
      callingSystemDetail: 'events-dashboard'
    };
    return this.http.post<LoginResponse>(`${this.baseUrl}/user_login_1_0`, body);
  }

  getUserInfoForId() {
    const data = JSON.parse(sessionStorage.getItem('verifai_user')!);
    let url = `${this.baseUrl}/getUserInfoForUserId_1_0/${data?.UserId}`;
    const headers = new HttpHeaders({
      'authorization': `Bearer ${data?.AccessToken}`
    })
    return this.http.get(url, {headers});
  }

  /** =========================
   *  SAVE LOGIN (localStorage / sessionStorage)
   *  ========================= */
  saveLogin(res: LoginResponse, rememberMe: boolean): void {
    const storage = rememberMe ? localStorage : sessionStorage;

    storage.setItem(this.USER_KEY, JSON.stringify(res));

    if (res.token) {
      storage.setItem(this.TOKEN_KEY, res.token);
    }
  }

  /** =========================
   *  CHECK LOGIN STATUS
   *  ========================= */
  isLoggedIn(): boolean {
    const user =
      localStorage.getItem(this.USER_KEY) ||
      sessionStorage.getItem(this.USER_KEY);

    return !!user; // true if exists, false otherwise
  }

  /** =========================
   *  GET TOKEN (for interceptors, API calls, etc.)
   *  ========================= */
  getToken(): string | null {
    return (
      localStorage.getItem(this.TOKEN_KEY) ||
      sessionStorage.getItem(this.TOKEN_KEY)
    );
  }

  /** =========================
   *  LOGOUT (clear storage + redirect)
   *  ========================= */
  logout(): void {
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.USER_KEY);
    sessionStorage.removeItem(this.TOKEN_KEY);

    // ✅ replaceUrl so Back button can't go back to previous protected page
    this.router.navigate(['/login'], { replaceUrl: true });
  }
}
