import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { LivroBiblioteca } from './biblioteca.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BibliotecaService {
  private apiUrl = `${environment.apiUrl}/Livro`;
  private apiAvaliacaoUrl = `${environment.apiUrl}/AvaliacaoLivro`;

  constructor(private http: HttpClient) {}

  getMeusLivros(): Observable<LivroBiblioteca[]> {
    return this.http.get<LivroBiblioteca[]>(this.apiUrl);
  }

  deletarLivro(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  atualizarLivro(id: string, livro: Partial<LivroBiblioteca>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, livro);
  }

  criarAvaliacao(idLivro: string, nota: number): Observable<any> {
    return this.http.post(this.apiAvaliacaoUrl, { idLivro, nota });
  }

  atualizarLivroComAvaliacao(id: string, livro: Partial<LivroBiblioteca>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, livro).pipe(
      switchMap(() => {
        if (livro.status === 3 && livro.estrelas) {
          return this.criarAvaliacao(id, Number(livro.estrelas));
        }
        return [null];
      })
    );
  }

  getMeusLivrosComAvaliacoes(): Observable<LivroBiblioteca[]> {
    return forkJoin([
      this.http.get<LivroBiblioteca[]>(this.apiUrl),
      this.http.get<any[]>(`${this.apiAvaliacaoUrl}/usuario`)
    ]).pipe(
      map(([livros, avaliacoes]) => {
        return livros.map(livro => {
          const avaliacao = avaliacoes.find(a => a.idLivro === livro.id);
          return { ...livro, estrelas: avaliacao ? avaliacao.nota : undefined };
        });
      })
    );
  }
}
