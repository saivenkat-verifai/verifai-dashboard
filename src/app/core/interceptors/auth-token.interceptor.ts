import { Injectable } from "@angular/core";
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from "@angular/common/http";

import { Observable, BehaviorSubject, throwError } from "rxjs";
import { catchError, filter, switchMap, take } from "rxjs/operators";
import { AuthService } from "src/app/login/login.service";

@Injectable()
export class AuthTokenInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshSubject = new BehaviorSubject<string | null>(null);

  constructor(private auth: AuthService) {}

  private addAuthHeaders(
    req: HttpRequest<any>,
    accessToken: string,
    refreshToken?: string
  ) {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
    };

    // Only add if it exists (avoid "undefined")
    if (refreshToken) {
      headers["RefreshToken"] = refreshToken; // ✅ or 'X-Refresh-Token'
      // headers['X-Refresh-Token'] = refreshToken;   // if backend uses this name
    }

    return req.clone({ setHeaders: headers });
  }



  intercept(req: HttpRequest<any>, next: HttpHandler) {
     console.log("INTERCEPT:", req.url, "token?", !!this.auth.getAccessToken());
  if (this.isPublicUrl(req.url)) return next.handle(req);


  const access = this.auth.getAccessToken();
  const refresh = this.auth.getRefreshToken();

  const authReq = access ? this.addAuthHeaders(req, access, refresh ?? undefined) : req;

  return next.handle(authReq).pipe(
    catchError((err) => {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        return this.handle401(authReq, next);
      }
      return throwError(() => err);
    })
  );
}


  private addToken(req: HttpRequest<any>, token: string) {
    return req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  private handle401(req: HttpRequest<any>, next: HttpHandler) {
    console.warn("⚠️ 401 detected for:", req.url);
    console.warn("🔁 Attempting refresh token flow...");

    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshSubject.next(null);

      console.log("🔐 Refresh token exists?", !!this.auth.getRefreshToken());

      return this.auth.refreshAccessToken().pipe(
        switchMap((refreshRes: any) => {
          console.log("✅ Refresh API SUCCESS:", refreshRes);

          const newAccess = refreshRes?.access_token || refreshRes?.access_token;
          const newRefresh = refreshRes?.refresh_token || refreshRes?.refresh_token;

          if (!newAccess) {
            console.error("❌ Refresh failed: No AccessToken returned");
            this.auth.logout();
            throw new Error("No AccessToken from refresh");
          }

          console.log("🆕 New AccessToken received");

          this.auth.updateTokens(newAccess, newRefresh);
          this.isRefreshing = false;
          this.refreshSubject.next(newAccess);

          console.log("🔁 Retrying original request:", req.url);
          return next.handle(this.addToken(req, newAccess));
        }),
        catchError((err) => {
          console.error("❌ Refresh API FAILED:", err);
          this.isRefreshing = false;
          this.auth.logout();
          throw err;
        })
      );
    }

    console.log("⏳ Waiting for refresh to complete...");
    return this.refreshSubject.pipe(
      filter((token) => token != null),
      take(1),
      switchMap((token) => next.handle(this.addToken(req, token!)))
    );
  }

  private isPublicUrl(url: string): boolean {
    return (
      url.includes("/user_login_1_0") || url.includes("/refresh_token_1_0")
    );
  }
}
