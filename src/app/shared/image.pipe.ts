import { Pipe, PipeTransform, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Pipe({
  name: 'image',
  standalone: true,
})
export class ImagePipe implements PipeTransform {
  private http = inject(HttpClient);

  async transform(url: string): Promise<string | null> {
    if (!url) return null;

    // 🔹 1. Get token from storage (supports both verifai_token + acTok)
    const rawToken =
      localStorage.getItem('verifai_token') ??
      sessionStorage.getItem('verifai_token') ??
      localStorage.getItem('acTok') ??
      sessionStorage.getItem('acTok');

    const token = rawToken || null;

    // 🔹 2. Build headers
    const headers = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : new HttpHeaders();

    try {
      // 🔹 3. Fetch as Blob
      const imageBlob = (await this.http
        .get(url, {
          headers,
          responseType: 'blob',
        })
        .toPromise()) as Blob;

      // 🔹 4. Convert Blob → base64 data URL
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(imageBlob);
      });
    } catch (err) {
      console.error('ImagePipe: failed to load image', url, err);
      return null;
    }
  }
}
