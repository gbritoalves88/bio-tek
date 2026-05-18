import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { AtividadeComunidade } from './comunidade.model';
import { map, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ComunidadeService {
  private apiLivro = 'http://localhost:5081/api/Livro';
  private apiAvaliacao = 'http://localhost:5081/api/AvaliacaoLivro';
  private apiUsuario = 'http://localhost:5081/api/Usuario';

  constructor(private http: HttpClient) {}


  getFeedComunidade(meuId: string): Observable<AtividadeComunidade[]> {
  return forkJoin([
    this.http.get<any[]>(`${this.apiLivro}/todos`),
    this.http.get<any[]>(`${this.apiAvaliacao}/todas`)
  ]).pipe(
    switchMap(([livros, avaliacoes]) => {
      // Filtra livros que NÃO são do usuário logado
      const livrosFiltrados = livros.filter(l => l.idUsuario !== meuId);
      const avaliacoesFiltradas = avaliacoes.filter(a => a.idUsuario !== meuId);

      const idsUsuarios = new Set<string>();
      livrosFiltrados.forEach(l => { if (l.idUsuario) idsUsuarios.add(l.idUsuario); });
      avaliacoesFiltradas.forEach(a => { if (a.idUsuario) idsUsuarios.add(a.idUsuario); });

      const idsArray = Array.from(idsUsuarios);

      if (idsArray.length === 0) return [];

      const usuariosReqs = idsArray.map(id =>
        this.http.get<any>(`${this.apiUsuario}/${id}`)
      );

      return forkJoin(usuariosReqs).pipe(
        map(usuarios => {
          const usuarioMap = new Map<string, any>();
          usuarios.forEach(u => usuarioMap.set(u.id, u));

          const atividades: AtividadeComunidade[] = [];

          livrosFiltrados.slice(0, 10).forEach(livro => {
            const u = usuarioMap.get(livro.idUsuario);
            atividades.push({
              id: 'livro-' + livro.id,
              tipo: livro.status === 2 ? 'livro_lendo' :
                    livro.status === 3 ? 'livro_lido' : 'livro_novo',
              usuario: {
                  id: u?.id || livro.idUsuario,
                  nome: u?.nome || 'Desconhecido',
                  nickname: u?.nickname || '@desconhecido',
                  avatar: u?.avatar || 'assets/capas/perfilSemFoto.png'  // ⬅️
              },
              livro: {
                id: livro.id,
                titulo: livro.titulo,
                autor: livro.autor,
                imagem: livro.imagem || 'assets/capas/perfilSemFoto.png'
              },
              data: livro.dataCriacao
            });
          });

          avaliacoesFiltradas.slice(0, 10).forEach(av => {
            const u = usuarioMap.get(av.idUsuario);
            atividades.push({
              id: 'av-' + av.id,
              tipo: 'livro_avaliado',
              usuario: {
                id: u?.id || av.idUsuario,
                nome: u?.nome || 'Desconhecido',
                nickname: u?.nickname || '@desconhecido',
                avatar: u?.avatar || ''
              },
              livro: {
                id: av.idLivro,
                titulo: 'Livro avaliado',
                autor: '',
                imagem: ''
              },
              avaliacao: { nota: av.nota },
              data: av.dataCriacao
            });
          });

          return atividades.sort((a, b) =>
            new Date(b.data).getTime() - new Date(a.data).getTime()
          ).slice(0, 20);
        })
      );
    })
  );
}
}
