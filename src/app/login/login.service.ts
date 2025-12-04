import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import * as CryptoJS from 'crypto-js';



export interface LoginResponse {
  token?: string;
  message?: string;
  status?: string;
  // add more fields based on API response
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  // 🔹 Put your correct API URL from Swagger
  private readonly loginUrl =
    'https://usstaging.ivisecurity.com/userDetails/user_login_1_0'; 

  private readonly encryptionKey = 'verifai'; // AES KEY

  constructor(private http: HttpClient) {}

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

    return this.http.post<LoginResponse>(this.loginUrl, body);
  }
}
