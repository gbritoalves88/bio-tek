// src/app/shared/comentarios-modal/comentarios-modal.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Comentario } from './comentarios-modal.model';
import { environment } from '../../../environments/environment';
import { switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ComentariosModalService {
  private apiComentario = `${environment.apiUrl}/ComentarioLivro`;
  private apiUsuario = `${environment.apiUrl}/Usuario`;

  constructor(private http: HttpClient) {}

  getComentarios(idLivro: string): Observable<Comentario[]> {
    return this.http.get<any[]>(`${this.apiComentario}/livro/${idLivro}`).pipe(
      switchMap(data => {
        if (!data?.length) return of([]);
        const ids = [...new Set(data.map(c => c.idUsuario))];
        return forkJoin(ids.map(id => this.http.get<any>(`${this.apiUsuario}/${id}`))).pipe(
          map(usuarios => {
            const mapU = new Map(usuarios.map(u => [u.id, u]));
            return data.map(c => ({
              id: c.id,
              idUsuario: c.idUsuario,
              usuarioNickname: mapU.get(c.idUsuario)?.nickname || '@desconhecido',
              comentario: c.comentario,
              dataCriacao: c.dataCriacao
            }));
          })
        );
      })
    );
  }

  enviarComentario(idLivro: string, comentario: string): Observable<any> {
    return this.http.post(this.apiComentario, { idLivro, comentario });
  }
}
