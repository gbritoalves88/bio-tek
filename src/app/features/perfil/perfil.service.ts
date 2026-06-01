import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Usuario, LivroDoUsuario } from './perfil.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PerfilService {
  private apiUrl = `${environment.apiUrl}/Usuario`;
  private apiLivroUrl = `${environment.apiUrl}/Livro`;

  constructor(private http: HttpClient) {}

  getPerfil(id: string): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.apiUrl}/${id}`);
  }

  getPerfilCompleto(id: string): Observable<Usuario> {
    return this.http.get<any>(`${this.apiUrl}/${id}/perfil-completo`).pipe(
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
        livros: data.livros || []
      }))
    );
  }

  limparCache(): void {
    // Não há cache
  }

  atualizarPerfil(id: string, dados: Partial<Usuario>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, dados);
  }

  aceitarTermos(): Observable<any> {
    return this.http.put(`${this.apiUrl}/aceitar-termos`, {});
  }

  criarLivro(livro: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/livro`, livro);
  }

  deletarLivro(id: string): Observable<any> {
    return this.http.delete(`${this.apiLivroUrl}/${id}`);
  }

  atualizarLivro(id: string, livro: Partial<LivroDoUsuario>): Observable<any> {
    return this.http.put(`${this.apiLivroUrl}/${id}`, livro);
  }
}
