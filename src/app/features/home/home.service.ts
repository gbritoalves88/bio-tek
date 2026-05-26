import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { Livro } from './home.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class HomeService {
  private apiUrl = `${environment.apiUrl}/Livro`;

  // Cache
  private homeCache$: Observable<Livro[]> | null = null;

  constructor(private http: HttpClient) {}

  getMeusLivros(): Observable<Livro[]> {
    if (!this.homeCache$) {
      this.homeCache$ = this.http.get<Livro[]>(this.apiUrl).pipe(
        shareReplay(1)
      );
    }
    return this.homeCache$;
  }

  limparCache(): void {
    this.homeCache$ = null;
  }
}
