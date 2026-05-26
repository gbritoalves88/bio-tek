import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { Usuario } from './perfil.model';
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
          dataCriacao: data.dataCriacao,
          dataAtualizacao: data.dataAtualizacao
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
}
