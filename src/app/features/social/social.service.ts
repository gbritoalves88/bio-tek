// src/app/features/social/social.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { Seguidor, UsuarioSocial, LivroSocial } from './social.model';
import { of } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class SocialService {
  private apiSeguidor = 'http://localhost:5081/api/Seguidor';
  private apiUsuario = 'http://localhost:5081/api/Usuario';
  private apiLivro = 'http://localhost:5081/api/Livro';

  constructor(private http: HttpClient) {}

  // Quem eu estou seguindo (IDs)
  getSeguindo(): Observable<Seguidor[]> {
    return this.http.get<Seguidor[]>(`${this.apiSeguidor}/seguindo`);
  }

  // Buscar dados de um usuário pelo ID
  getUsuario(id: string): Observable<UsuarioSocial> {
    return this.http.get<UsuarioSocial>(`${this.apiUsuario}/${id}`);
  }


  // Buscar livros de um usuário específico
  getLivrosDoUsuario(idUsuario: string): Observable<LivroSocial[]> {
    return this.http.get<LivroSocial[]>(`${this.apiLivro}/usuario/${idUsuario}`);
  }

  // Deixar de seguir
  deixarDeSeguir(idUsuario: string): Observable<any> {
    return this.http.delete(`${this.apiSeguidor}/deixar-de-seguir/${idUsuario}`);
  }

  getSeguindoComDados(): Observable<UsuarioSocial[]> {
    return this.http.get<Seguidor[]>(`${this.apiSeguidor}/seguindo`).pipe(
      switchMap(seguidores => {
        if (!seguidores || seguidores.length === 0) {
          return of([]);
        }
        // Para cada seguidor, busca o perfil COMPLETO (com estatísticas)
        const requisicoes = seguidores.map(s => this.getPerfilCompleto(s.idUsuario));
        return forkJoin(requisicoes);
      })
    );
  }

  getPerfilCompleto(idUsuario: string): Observable<UsuarioSocial> {
    return forkJoin([
      this.http.get<UsuarioSocial>(`${this.apiUsuario}/${idUsuario}`),
      this.http.get<any[]>(`${this.apiLivro}/usuario/${idUsuario}`),
      this.http.get<any[]>(`http://localhost:5081/api/AvaliacaoLivro/usuario/${idUsuario}`) // ⬅️ Com ID
    ]).pipe(
      map(([usuario, livros, avaliacoes]) => {
        const media = avaliacoes.length > 0
          ? Math.round((avaliacoes.reduce((s, a) => s + a.nota, 0) / avaliacoes.length) * 10) / 10
          : 0;

        // Mapear estrelas nos livros
        const livrosComEstrelas = livros.map(livro => {
          const avaliacao = avaliacoes.find(a => a.idLivro === livro.id);
          return { ...livro, estrelas: avaliacao ? avaliacao.nota : undefined };
        });

        return {
          ...usuario,
          quantidadeLivros: livros.length,
          quantidadeLivrosLidos: livros.filter(l => l.status === 3).length,
          mediaAvaliacoes: media
        };
      })
    );
  }

}
