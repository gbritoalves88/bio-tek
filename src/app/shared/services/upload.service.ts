import { Injectable } from '@angular/core';
import { HttpClient, HttpBackend } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UploadService {
  private httpSemAuth: HttpClient;

  constructor(private httpBackend: HttpBackend) {
    this.httpSemAuth = new HttpClient(httpBackend);
  }

  uploadImagem(base64: string): Observable<string> {
    const imagemLimpa = base64.split(',')[1];
    const body = new URLSearchParams();
    body.set('image', imagemLimpa);

    const url = `${environment.imgbbUrl}?key=${environment.imgbbApiKey}`;

    return this.httpSemAuth.post<any>(url, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }).pipe(
      map(response => response.data.url)
    );
  }
}
