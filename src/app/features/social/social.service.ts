// src/app/features/social/social.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, shareReplay, switchMap } from 'rxjs/operators';
import { Seguidor, UsuarioSocial, LivroSocial } from './social.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SocialService {
  private apiSeguidor = `${environment.apiUrl}/Seguidor`;
  private apiUsuario = `${environment.apiUrl}/Usuario`;
  private apiLivro = `${environment.apiUrl}/Livro`;

  // Cache
  private seguindoCache$: Observable<UsuarioSocial[]> | null = null;

  constructor(private http: HttpClient) {}

  // ===== SEGUINDO =====

  getSeguindo(): Observable<Seguidor[]> {
    return this.http.get<Seguidor[]>(`${this.apiSeguidor}/seguindo`);
  }

  getSeguindoCompleto(): Observable<UsuarioSocial[]> {
    if (!this.seguindoCache$) {
      this.seguindoCache$ = this.http.get<UsuarioSocial[]>(
        `${this.apiSeguidor}/seguindo-completo`
      ).pipe(shareReplay(1));
    }
    return this.seguindoCache$;
  }

  limparCacheSeguindo(): void {
    this.seguindoCache$ = null;
  }

  // ===== PERFIL =====

  getUsuario(id: string): Observable<UsuarioSocial> {
    return this.http.get<UsuarioSocial>(`${this.apiUsuario}/${id}`);
  }

  getPerfilCompleto(idUsuario: string): Observable<any> {
    return this.http.get<any>(`${this.apiUsuario}/${idUsuario}/perfil-completo`).pipe(shareReplay(1));
  }

  getLivrosDoUsuario(idUsuario: string): Observable<LivroSocial[]> {
    return this.http.get<LivroSocial[]>(`${this.apiLivro}/usuario/${idUsuario}`);
  }

  // ===== AÇÕES =====

  deixarDeSeguir(idUsuario: string): Observable<any> {
    return this.http.delete(`${this.apiSeguidor}/deixar-de-seguir/${idUsuario}`);
  }

  getTodosUsuarios(): Observable<UsuarioSocial[]> {
    return this.http.get<UsuarioSocial[]>(`${this.apiUsuario}/todos`);
  }

  buscarUsuarios(termo: string): Observable<UsuarioSocial[]> {
      return this.http.get<UsuarioSocial[]>(`${this.apiUsuario}/buscar?q=${encodeURIComponent(termo)}`);
  }

  seguir(idUsuario: string): Observable<any> {
    return this.http.post(`${this.apiSeguidor}/seguir/${idUsuario}`, {});
  }
}
