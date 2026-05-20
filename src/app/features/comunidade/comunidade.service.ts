// src/app/features/comunidade/comunidade.service.ts

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
  private apiLivro = `${environment.apiUrl}/Livro`;
  private apiAvaliacao = `${environment.apiUrl}/AvaliacaoLivro`;
  private apiUsuario = `${environment.apiUrl}/Usuario`;
  private apiComentario = `${environment.apiUrl}/ComentarioLivro`;
  private apiSeguidor = `${environment.apiUrl}/Seguidor`;

  constructor(private http: HttpClient) {}

  getFeedComunidade(meuId: string): Observable<AtividadeComunidade[]> {
    return forkJoin([
      this.http.get<any[]>(`${this.apiLivro}/todos`),
      this.http.get<any[]>(`${this.apiAvaliacao}/todas`)
    ]).pipe(
      switchMap(([livros, avaliacoes]) => {
        const livrosFiltrados = livros.filter(l => l.idUsuario !== meuId);
        const avaliacoesFiltradas = avaliacoes.filter(a => a.idUsuario !== meuId);
        const idsUsuarios = new Set<string>();

        livrosFiltrados.forEach(l => { if (l.idUsuario) idsUsuarios.add(l.idUsuario); });
        avaliacoesFiltradas.forEach(a => { if (a.idUsuario) idsUsuarios.add(a.idUsuario); });

        const idsArray = Array.from(idsUsuarios);
        if (idsArray.length === 0) return of([]);

        // Mapa de livros para cruzar com avaliações
        const livroMap = new Map(livros.map(l => [l.id, l]));

        return forkJoin(idsArray.map(id => this.http.get<any>(`${this.apiUsuario}/${id}`))).pipe(
          map(usuarios => {
            const usuarioMap = new Map(usuarios.map(u => [u.id, u]));
            const atividades: AtividadeComunidade[] = [];

            livrosFiltrados.slice(0, 10).forEach(livro => {
              const u = usuarioMap.get(livro.idUsuario);
              atividades.push({
                id: 'livro-' + livro.id,
                tipo: livro.status === 2 ? 'livro_lendo' : livro.status === 3 ? 'livro_lido' : 'livro_novo',
                usuario: { id: u?.id, nome: u?.nome || 'Desconhecido', nickname: u?.nickname || '@desconhecido', avatar: u?.avatar || 'assets/capas/perfilSemFoto.png' },
                livro: { id: livro.id, titulo: livro.titulo, autor: livro.autor, imagem: livro.imagem || 'assets/capas/perfilSemFoto.png' },
                data: livro.dataAtualizacao || livro.dataCriacao  // ⬅️ Prioriza data de atualização
              });
            });

            avaliacoesFiltradas.slice(0, 10).forEach(av => {
              const u = usuarioMap.get(av.idUsuario);
              const livroAvaliado = livroMap.get(av.idLivro);
              atividades.push({
                id: 'av-' + av.id, tipo: 'livro_avaliado',
                usuario: { id: u?.id, nome: u?.nome || 'Desconhecido', nickname: u?.nickname || '@desconhecido', avatar: u?.avatar || 'assets/capas/perfilSemFoto.png' },
                livro: {
                  id: av.idLivro,
                  titulo: livroAvaliado?.titulo || 'Livro avaliado',
                  autor: livroAvaliado?.autor || '',
                  imagem: livroAvaliado?.imagem || 'assets/capas/perfilSemFoto.png'
                },
                avaliacao: { nota: av.nota },
                data: av.dataAtualizacao || av.dataCriacao  // ⬅️ Prioriza data de atualização
              });
            });

            return atividades
              .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
              .slice(0, 20);
          })
        );
      })
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
