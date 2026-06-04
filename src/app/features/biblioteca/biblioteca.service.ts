import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { switchMap, map, shareReplay, tap } from 'rxjs/operators';
import { LivroBiblioteca } from './biblioteca.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BibliotecaService {
  private apiUrl = `${environment.apiUrl}/Livro`;
  private apiAvaliacaoUrl = `${environment.apiUrl}/AvaliacaoLivro`;

  // Cache
  private bibliotecaCache$: Observable<LivroBiblioteca[]> | null = null;

  constructor(private http: HttpClient) {}

  getMeusLivros(): Observable<LivroBiblioteca[]> {
    return this.http.get<LivroBiblioteca[]>(this.apiUrl);
  }

  getBibliotecaCompleta(): Observable<LivroBiblioteca[]> {
    if (!this.bibliotecaCache$) {
      this.bibliotecaCache$ = this.http.get<LivroBiblioteca[]>(
        `${this.apiUrl}/biblioteca`
      ).pipe(
        shareReplay(1)
      );
    }
    return this.bibliotecaCache$;
  }

  limparCache(): void {
    this.bibliotecaCache$ = null;
  }

  // 🆕 Invalida cache após mutações
  deletarLivro(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.limparCache())
    );
  }

  atualizarLivro(id: string, livro: Partial<LivroBiblioteca>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, livro).pipe(
      tap(() => this.limparCache())
    );
  }

  criarAvaliacao(idLivro: string, nota: number): Observable<any> {
    return this.http.post(this.apiAvaliacaoUrl, { idLivro, nota }).pipe(
      tap(() => this.limparCache())
    );
  }

  atualizarLivroComAvaliacao(id: string, livro: Partial<LivroBiblioteca>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, livro).pipe(
      switchMap(() => {
        if (livro.status === 3 && livro.estrelas) {
          return this.criarAvaliacao(id, Number(livro.estrelas));
        }
        return of(null);
      }),
      tap(() => this.limparCache())
    );
  }

  getMeusLivrosComAvaliacoes(): Observable<LivroBiblioteca[]> {
    return this.http.get<LivroBiblioteca[]>(this.apiUrl).pipe(
      switchMap(livros =>
        this.http.get<any[]>(`${this.apiAvaliacaoUrl}/usuario`).pipe(
          map(avaliacoes =>
            livros.map(livro => {
              const avaliacao = avaliacoes.find(a => a.idLivro === livro.id);
              return { ...livro, estrelas: avaliacao ? avaliacao.nota : undefined };
            })
          )
        )
      )
    );
  }
}
