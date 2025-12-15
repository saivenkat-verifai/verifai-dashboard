import { Pipe, PipeTransform, inject } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { firstValueFrom } from "rxjs";

@Pipe({
  name: "image",
  standalone: true,
  pure: false, // IMPORTANT: because we resolve async data
})
export class ImagePipe implements PipeTransform {
  private http = inject(HttpClient);

  // simple in-memory cache: url -> base64 string
  private cache = new Map<string, Promise<string | null>>();

  transform(url: string | null | undefined): Promise<string | null> {
    if (!url) return Promise.resolve(null);

    if (this.cache.has(url)) {
      return this.cache.get(url)!;
    }

    const p = this.load(url);
    this.cache.set(url, p);
    return p;
  }

  private async load(url: string): Promise<string | null> {
    try {
      const rawUser =
        sessionStorage.getItem("verifai_user") ||
        localStorage.getItem("verifai_user");

      const user = rawUser ? JSON.parse(rawUser) : null;
      const accessToken = user?.AccessToken;

      const headers = accessToken
        ? new HttpHeaders({ Authorization: `Bearer ${accessToken}` })
        : new HttpHeaders();

      const blob = await firstValueFrom(
        this.http.get(url, { headers, responseType: "blob" })
      );

      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(null);
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.error("ImagePipe: failed to load image", url, err);
      return null;
    }
  }
}
