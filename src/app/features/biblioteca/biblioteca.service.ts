import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { LivroBiblioteca } from './biblioteca.model';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class BibliotecaService {
  private apiUrl = 'http://localhost:5081/api/Livro';
  private apiAvaliacaoUrl = 'http://localhost:5081/api/AvaliacaoLivro';

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
    return this.http.post(this.apiAvaliacaoUrl, {
      idLivro: idLivro,
      nota: nota
    });
  }

  // Atualiza livro E cria avaliação (se status = Lido)
  atualizarLivroComAvaliacao(id: string, livro: Partial<LivroBiblioteca>): Observable<any> {
    // Primeiro atualiza o livro
    return this.http.put(`${this.apiUrl}/${id}`, livro).pipe(
      switchMap(() => {
        // Se tem estrelas e status = Lido, cria avaliação
        if (livro.status === 3 && livro.estrelas) {
          return this.criarAvaliacao(id, Number(livro.estrelas));
        }
        return [null]; // Retorna vazio se não precisa avaliar
      })
    );
  }

  getMeusLivrosComAvaliacoes(): Observable<LivroBiblioteca[]> {
  return forkJoin([
    this.http.get<LivroBiblioteca[]>(this.apiUrl),
    this.http.get<any[]>('http://localhost:5081/api/AvaliacaoLivro/usuario')
  ]).pipe(
    map(([livros, avaliacoes]) => {
      return livros.map(livro => {
        const avaliacao = avaliacoes.find(a => a.idLivro === livro.id);
        return {
          ...livro,
          estrelas: avaliacao ? avaliacao.nota : undefined
        };
      });
    })
  );
}
}
