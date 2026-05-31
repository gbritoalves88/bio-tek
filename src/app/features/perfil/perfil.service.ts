// perfil.service.ts - CORRIGIDO

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { Usuario, LivroDoUsuario } from './perfil.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PerfilService {
  private apiUrl = `${environment.apiUrl}/Usuario`;

  private perfilCache$: Observable<Usuario> | null = null;
  private cacheId = '';

  constructor(private http: HttpClient) {}

  getPerfil(id: string): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.apiUrl}/${id}`);
  }

  getPerfilCompleto(id: string): Observable<Usuario> {
    // Limpa cache se mudou o usuário
    if (this.cacheId !== id) {
      this.perfilCache$ = null;
      this.cacheId = id;
    }

    if (!this.perfilCache$) {
      this.perfilCache$ = this.http.get<any>(`${this.apiUrl}/${id}/perfil-completo`).pipe(
        map(data => ({
          id: data.id,
          idGoogle: data.idGoogle,
          nome: data.nome,
          nickname: data.nickname,
          email: data.email,
          descricao: data.descricao,
          avatar: data.avatar,
          tema: data.tema,
          quantidadeLivros: data.quantidadeLivros,
          quantidadeLivrosLidos: data.quantidadeLivrosLidos,
          mediaAvaliacoes: data.mediaAvaliacoes,
          adm: data.adm,
          ativo: data.ativo,
          aceitouTermos: data.aceitouTermos,
          dataAceiteTermos: data.dataAceiteTermos,
          dataCriacao: data.dataCriacao,
          dataAtualizacao: data.dataAtualizacao,
          livros: data.livros || []  // ⬅️ ESSENCIAL: incluir os livros!
        })),
        shareReplay(1)
      );
    }

    return this.perfilCache$;
  }

  limparCache(): void {
    this.perfilCache$ = null;
    this.cacheId = '';
  }

  atualizarPerfil(id: string, dados: Partial<Usuario>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, dados);
  }

  aceitarTermos(): Observable<any> {
    return this.http.put(`${this.apiUrl}/aceitar-termos`, {});
  }

  // Métodos para livros
  criarLivro(livro: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/livro`, livro);
  }

  atualizarLivro(id: string, livro: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/livro/${id}`, livro);
  }

  deletarLivro(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/livro/${id}`);
  }
}
