// src/app/features/comunidade/comunidade.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap, shareReplay } from 'rxjs/operators';
import { AtividadeComunidade, Comentario } from './comunidade.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ComunidadeService {
  private api = environment.apiUrl;
  private apiComunidade = `${this.api}/Comunidade`;
  private apiUsuario = `${this.api}/Usuario`;
  private apiComentario = `${this.api}/ComentarioLivro`;
  private apiSeguidor = `${this.api}/Seguidor`;

  // Cache
  private feedCache$: Observable<AtividadeComunidade[]> | null = null;
  private cacheKey = '';

  constructor(private http: HttpClient) {}

  getFeedComunidade(meuId: string): Observable<AtividadeComunidade[]> {
    if (this.cacheKey !== meuId) {
      this.feedCache$ = null;
      this.cacheKey = meuId;
    }

    if (!this.feedCache$) {
      this.feedCache$ = this.http.get<AtividadeComunidade[]>(
        `${this.apiComunidade}/feed?meuId=${meuId}&limite=30`
      ).pipe(shareReplay(1));
    }

    return this.feedCache$;
  }

  atualizarFeed(meuId: string): Observable<AtividadeComunidade[]> {
    this.feedCache$ = null;
    return this.getFeedComunidade(meuId);
  }

  getComentariosDoLivro(idLivro: string): Observable<Comentario[]> {
    return this.http.get<any[]>(`${this.apiComentario}/livro/${idLivro}`).pipe(
      switchMap(data => {
        if (!data?.length) return of([]);
        const ids = [...new Set(data.map(c => c.idUsuario))];
        return forkJoin(ids.map(id => this.http.get<any>(`${this.apiUsuario}/${id}`))).pipe(
          map(usuarios => {
            const mapU = new Map(usuarios.map(u => [u.id, u]));
            return data.map(c => ({
              id: c.id, idUsuario: c.idUsuario,
              usuarioNickname: mapU.get(c.idUsuario)?.nickname || '@desconhecido',
              comentario: c.comentario, dataCriacao: c.dataCriacao
            }));
          })
        );
      })
    );
  }

  enviarComentario(idLivro: string, comentario: string): Observable<any> {
    return this.http.post(this.apiComentario, { idLivro, comentario });
  }

  getSeguindo(): Observable<string[]> {
    return this.http.get<any[]>(`${this.apiSeguidor}/seguindo`).pipe(
      map(s => s.map(x => x.idUsuario))
    );
  }

  seguir(idUsuario: string): Observable<any> {
    return this.http.post(`${this.apiSeguidor}/seguir/${idUsuario}`, {});
  }

  deixarDeSeguir(idUsuario: string): Observable<any> {
    return this.http.delete(`${this.apiSeguidor}/deixar-de-seguir/${idUsuario}`);
  }
}
