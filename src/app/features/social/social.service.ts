// src/app/features/social/social.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { Seguidor, UsuarioSocial, LivroSocial } from './social.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SocialService {
  private apiSeguidor = `${environment.apiUrl}/Seguidor`;
  private apiUsuario = `${environment.apiUrl}/Usuario`;
  private apiLivro = `${environment.apiUrl}/Livro`;
  private apiAvaliacao = `${environment.apiUrl}/AvaliacaoLivro`;

  constructor(private http: HttpClient) {}

  getSeguindo(): Observable<Seguidor[]> {
    return this.http.get<Seguidor[]>(`${this.apiSeguidor}/seguindo`);
  }

  getUsuario(id: string): Observable<UsuarioSocial> {
    return this.http.get<UsuarioSocial>(`${this.apiUsuario}/${id}`);
  }

  getLivrosDoUsuario(idUsuario: string): Observable<LivroSocial[]> {
    return this.http.get<LivroSocial[]>(`${this.apiLivro}/usuario/${idUsuario}`);
  }

  deixarDeSeguir(idUsuario: string): Observable<any> {
    return this.http.delete(`${this.apiSeguidor}/deixar-de-seguir/${idUsuario}`);
  }

  getSeguindoComDados(): Observable<UsuarioSocial[]> {
    return this.http.get<Seguidor[]>(`${this.apiSeguidor}/seguindo`).pipe(
      switchMap(seguidores => {
        if (!seguidores?.length) return of([]);
        return forkJoin(seguidores.map(s => this.getPerfilCompleto(s.idUsuario)));
      })
    );
  }

  getPerfilCompleto(idUsuario: string): Observable<UsuarioSocial> {
    return forkJoin([
      this.http.get<UsuarioSocial>(`${this.apiUsuario}/${idUsuario}`),
      this.http.get<any[]>(`${this.apiLivro}/usuario/${idUsuario}`),
      this.http.get<any[]>(`${this.apiAvaliacao}/usuario/${idUsuario}`)
    ]).pipe(
      map(([usuario, livros, avaliacoes]) => {
        const media = avaliacoes.length > 0
          ? Math.round((avaliacoes.reduce((s, a) => s + a.nota, 0) / avaliacoes.length) * 10) / 10
          : 0;
        return {
          ...usuario,
          quantidadeLivros: livros.length,
          quantidadeLivrosLidos: livros.filter(l => l.status === 3).length,
          mediaAvaliacoes: media
        };
      })
    );
  }

  getPerfilCompletoComLivros(idUsuario: string): Observable<{ perfil: UsuarioSocial; livros: LivroSocial[] }> {
    return forkJoin([
      this.getPerfilCompleto(idUsuario),
      this.getLivrosDoUsuario(idUsuario),
      this.http.get<any[]>(`${this.apiAvaliacao}/usuario/${idUsuario}`)
    ]).pipe(
      map(([perfil, livros, avaliacoes]) => {
        const livrosComEstrelas = livros.map(livro => {
          const aval = avaliacoes.find(a => a.idLivro === livro.id);
          return { ...livro, estrelas: aval ? aval.nota : undefined };
        }).sort((a, b) => new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime());
        return { perfil, livros: livrosComEstrelas };
      })
    );
  }
}
