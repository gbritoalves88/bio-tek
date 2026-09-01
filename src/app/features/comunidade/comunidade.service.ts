import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
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

  constructor(private http: HttpClient) {}

  getFeedComunidade(): Observable<AtividadeComunidade[]> {
    return this.http.get<AtividadeComunidade[]>(
      `${this.apiComunidade}/feed?limite=15`
    );
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

  // ============ SOCIAL ============
  getSeguindo(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiSeguidor}/seguindo-completo`);
  }

  buscarUsuarios(termo: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUsuario}/buscar?termo=${termo}`);
  }

  seguir(idUsuario: string): Observable<any> {
    return this.http.post(`${this.apiSeguidor}/seguir/${idUsuario}`, {});
  }

  deixarDeSeguir(idUsuario: string): Observable<any> {
    return this.http.delete(`${this.apiSeguidor}/deixar-de-seguir/${idUsuario}`);
  }

  curtir(id: string, dados: {
    tipoAtividade: string;
    idUsuarioDono: string;
    nomeCurtidor: string;
    tituloLivro: string;
  }): Observable<any> {
    return this.http.post(`${this.apiComunidade}/${id}/curtir`, dados);
  }

  descurtir(id: string): Observable<any> {
    return this.http.delete(`${this.apiComunidade}/${id}/curtir`);
  }

  deletarComentario(id: string): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/ComentarioLivro/${id}`);
  }

  adicionarLivro(livro: { titulo: string; autor: string; imagem?: string | null }): Observable<any> {
    return this.http.post(`${environment.apiUrl}/Livro`, livro);
  }
}
