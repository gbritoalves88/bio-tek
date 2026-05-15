import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Livro } from './home.model';

@Injectable({
  providedIn: 'root'
})
export class HomeService {
  private apiUrl = 'http://localhost:5081/api/Livro';

  constructor(private http: HttpClient) {}

  getMeusLivros(): Observable<Livro[]> {
    return this.http.get<Livro[]>(this.apiUrl);
  }
}
