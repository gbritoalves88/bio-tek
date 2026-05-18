// src/app/features/perfil/perfil.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { Usuario } from './perfil.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PerfilService {
  private apiUrl = `${environment.apiUrl}/Usuario`;
  private apiLivro = `${environment.apiUrl}/Livro`;
  private apiAvaliacao = `${environment.apiUrl}/AvaliacaoLivro`;

  constructor(private http: HttpClient) {}

  getPerfil(id: string): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.apiUrl}/${id}`);
  }

  getPerfilCompleto(id: string): Observable<Usuario> {
    return forkJoin([
      this.http.get<Usuario>(`${this.apiUrl}/${id}`),
      this.http.get<any[]>(this.apiLivro),
      this.http.get<any[]>(`${this.apiAvaliacao}/usuario`)
    ]).pipe(
      map(([perfil, livros, avaliacoes]) => {
        const meusLivros = livros.filter(l => l.idUsuario === id);
        const media = avaliacoes.length > 0
          ? Math.round((avaliacoes.reduce((s, a) => s + a.nota, 0) / avaliacoes.length) * 10) / 10
          : 0;
        return {
          ...perfil,
          quantidadeLivros: meusLivros.length,
          quantidadeLivrosLidos: meusLivros.filter(l => l.status === 3).length,
          mediaAvaliacoes: media
        };
      })
    );
  }

  atualizarPerfil(id: string, dados: Partial<Usuario>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, dados);
  }
}
