import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay, tap } from 'rxjs';
import { map } from 'rxjs/operators';
import { Usuario, LivroDoUsuario, AtividadeLeitura } from './perfil.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PerfilService {
  private apiUrl = `${environment.apiUrl}/Usuario`;
  private apiLivroUrl = `${environment.apiUrl}/Livro`;

  // 🆕 Cache do perfil
  private perfilCache$: Observable<Usuario> | null = null;
  private perfilCacheTimestamp: number = 0;
  private perfilCacheUsuarioId: string = '';
  private readonly CACHE_DURATION = 3 * 60 * 1000; // 3 minutos

  constructor(private http: HttpClient) {}

  getPerfil(id: string): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.apiUrl}/${id}`);
  }

  // 🆕 Perfil completo com cache de 3 minutos
  getPerfilCompleto(id: string): Observable<Usuario> {
    const agora = Date.now();

    // Retorna cache se for o mesmo usuário e estiver válido
    if (this.perfilCache$ &&
        this.perfilCacheUsuarioId === id &&
        (agora - this.perfilCacheTimestamp) < this.CACHE_DURATION) {
      return this.perfilCache$;
    }

    // Cria novo cache
    this.perfilCacheUsuarioId = id;
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
        colecoes: (data.colecoes || []).map((c: any) => ({
          id: c.id,
          nome: c.nome,
          descricao: c.descricao,
          totalLivros: c.totalLivros,
          capas: c.capas || [],
          dataCriacao: c.dataCriacao
        })),
        livros: (data.livros || []).map((l: any) => ({
          ...l,
          tipo: l.tipo || 'livro',
          minutoAtual: l.minutoAtual || null,
          totalMinutos: l.totalMinutos || null,
          generos: l.generos || [],
          anoPublicacao: l.anoPublicacao || null,
          editora: l.editora || null,
          idioma: l.idioma || null
        }))
      })),
      shareReplay(1),
      tap(() => {
        this.perfilCacheTimestamp = Date.now();
      })
    );

    return this.perfilCache$;
  }

  // 🆕 Limpa cache do perfil
  limparCache(): void {
    this.perfilCache$ = null;
    this.perfilCacheTimestamp = 0;
    this.perfilCacheUsuarioId = '';
  }

  // 🆕 Atualizar perfil + limpar cache
  atualizarPerfil(id: string, dados: Partial<Usuario>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, dados).pipe(
      tap(() => this.limparCache())
    );
  }

  aceitarTermos(): Observable<any> {
    return this.http.put(`${this.apiUrl}/aceitar-termos`, {}).pipe(
      tap(() => this.limparCache())
    );
  }

  criarLivro(livro: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/livro`, livro).pipe(
      tap(() => this.limparCache())
    );
  }

  // 🆕 Deletar livro + limpar cache
  deletarLivro(id: string): Observable<any> {
    return this.http.delete(`${this.apiLivroUrl}/${id}`).pipe(
      tap(() => this.limparCache())
    );
  }

  // 🆕 Atualizar livro + limpar cache
  atualizarLivro(id: string, livro: Partial<LivroDoUsuario>): Observable<any> {
    return this.http.put(`${this.apiLivroUrl}/${id}`, livro).pipe(
      tap(() => this.limparCache())
    );
  }

  enviarComentario(idLivro: string, comentario: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/ComentarioLivro`, {
      idLivro,
      comentario
    }).pipe(
      tap(() => this.limparCache())
    );
  }

  desativarConta(): Observable<any> {
    return this.http.post(`${this.apiUrl}/desativar`, {}).pipe(
      tap(() => this.limparCache())
    );
  }

  // 🆕 Deletar comentário + limpar cache
  deletarComentario(id: string): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/ComentarioLivro/${id}`).pipe(
      tap(() => this.limparCache())
    );
  }

  // 🆕 Adicionar livro + limpar cache
  adicionarLivro(livro: { titulo: string; autor: string; imagem?: string | null; descricao?: string | null }): Observable<any> {
    return this.http.post(`${environment.apiUrl}/Livro`, livro).pipe(
      tap(() => this.limparCache())
    );
  }

  // 🆕 Atividades com cache de 2 minutos
  private atividadesCache$: Observable<AtividadeLeitura[]> | null = null;
  private atividadesCacheTimestamp: number = 0;
  private atividadesCacheUsuarioId: string = '';
  private readonly ATIVIDADES_CACHE_DURATION = 2 * 60 * 1000; // 2 minutos

  getAtividades(usuarioId: string): Observable<AtividadeLeitura[]> {
    const agora = Date.now();

    if (this.atividadesCache$ &&
        this.atividadesCacheUsuarioId === usuarioId &&
        (agora - this.atividadesCacheTimestamp) < this.ATIVIDADES_CACHE_DURATION) {
      return this.atividadesCache$;
    }

    this.atividadesCacheUsuarioId = usuarioId;
    this.atividadesCache$ = this.http.get<AtividadeLeitura[]>(
      `${environment.apiUrl}/Livro/usuario/${usuarioId}/atividades`
    ).pipe(
      shareReplay(1),
      tap(() => {
        this.atividadesCacheTimestamp = Date.now();
      })
    );

    return this.atividadesCache$;
  }
}
