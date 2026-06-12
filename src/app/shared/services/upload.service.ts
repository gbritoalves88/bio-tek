import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UploadService {
  private apiUrl = `${environment.apiUrl}/Upload`;

  constructor(private http: HttpClient) {}

  uploadImagem(base64: string): Observable<string> {
      return this.http.post<{ url: string }>(`${this.apiUrl}`, { base64 }).pipe(
        map(response => response.url)
      );
  }
}
