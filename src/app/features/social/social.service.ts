// src/app/features/social/social.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Seguidor, UsuarioSocial, LivroSocial } from './social.model';

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

  // Buscar todos os usuários que estou seguindo com dados completos
  getSeguindoComDados(): Observable<UsuarioSocial[]> {
    return this.http.get<Seguidor[]>(`${this.apiSeguidor}/seguindo`).pipe(
      switchMap(seguidores => {
        // Se não há seguidores, retorna array vazio IMEDIATAMENTE
        if (!seguidores || seguidores.length === 0) {
          return []; // ⬅️ Observable de array vazio
        }
        const requisicoes = seguidores.map(s => this.getUsuario(s.idUsuario));
        return forkJoin(requisicoes);
      })
    );
  }

  // Buscar livros de um usuário específico
  getLivrosDoUsuario(idUsuario: string): Observable<LivroSocial[]> {
    return this.http.get<LivroSocial[]>(`${this.apiLivro}/usuario/${idUsuario}`);
  }

  // Deixar de seguir
  deixarDeSeguir(idUsuario: string): Observable<any> {
    return this.http.delete(`${this.apiSeguidor}/deixar-de-seguir/${idUsuario}`);
  }
}
