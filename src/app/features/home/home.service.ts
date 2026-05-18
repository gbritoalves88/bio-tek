import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Livro } from './home.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class HomeService {
  private apiUrl = `${environment.apiUrl}/Livro`;

  constructor(private http: HttpClient) {}

  getMeusLivros(): Observable<Livro[]> {
    return this.http.get<Livro[]>(this.apiUrl);
  }
}
