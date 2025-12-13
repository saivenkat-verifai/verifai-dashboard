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

    const data = JSON.parse(sessionStorage.getItem('verifai_user')!);


    // 🔹 2. Build headers
    const headers = new HttpHeaders({ Authorization: `Bearer ${data?.AccessToken}` })
  

    try {
      // 🔹 3. Fetch as Blob
      const imageBlob = (await this.http
        .get(url, {
          headers,
          responseType: 'blob',
        })
        .toPromise()) as Blob;

      // 🔹 4. Convert Blob → base64 data URL
      const reader = new FileReader();
      return new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        if (imageBlob instanceof Blob) {
          reader.readAsDataURL(imageBlob);
        } else {
          reject(new Error('Failed to fetch image as Blob'));
        }
      });
    } catch (err) {
      console.error('ImagePipe: failed to load image', url, err);
      return null;
    }
  }
}
