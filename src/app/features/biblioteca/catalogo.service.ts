// src/app/features/biblioteca/catalogo.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CatalogoLivro } from './biblioteca.model';


@Injectable({
  providedIn: 'root'
})
export class CatalogoService {
  private apiUrl = `${environment.apiUrl}/Catalogo`;

  // Cache do catálogo
  private catalogoCache$: Observable<CatalogoLivro[]> | null = null;

  // 🆕 Cache da biblioteca inicial
  private bibliotecaCache$: Observable<any> | null = null;
  private bibliotecaCacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  constructor(private http: HttpClient) {}

  getAll(): Observable<CatalogoLivro[]> {
    if (!this.catalogoCache$) {
      this.catalogoCache$ = this.http.get<CatalogoLivro[]>(this.apiUrl).pipe(
        shareReplay(1)
      );
    }
    return this.catalogoCache$;
  }

  adicionarBiblioteca(catalogoId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${catalogoId}/adicionar-biblioteca`, {}).pipe(
      tap(() => this.limparCache())
    );
  }

  limparCache(): void {
    this.catalogoCache$ = null;
    this.limparCacheBiblioteca(); // 🆕 Limpa também o cache da biblioteca
  }

  getCategorias(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/categorias`);
  }

  buscarExterno(termo: string, limite: number = 30): Observable<any> {
    return this.http.post(`${this.apiUrl}/importar/termo/${termo}?limite=${limite}`, {});
  }

  // 🆕 Método com cache
getBibliotecaInicial(): Observable<any> {
    const agora = Date.now();
    const cacheKey = 'bliteca_biblioteca_inicial';

    // 1. Tenta pegar do cache em memória
    if (this.bibliotecaCache$ && (agora - this.bibliotecaCacheTimestamp) < this.CACHE_DURATION) {
      return this.bibliotecaCache$;
    }

    // 2. Se não tem em memória, tenta pegar do localStorage (Instantâneo)
    const cacheSalvo = localStorage.getItem(cacheKey);
    let dadosIniciais = null;

    if (cacheSalvo) {
      try {
        dadosIniciais = JSON.parse(cacheSalvo);
      } catch (e) {}
    }

    // 3. Faz a requisição para o servidor
    const request$ = this.http.get(`${this.apiUrl}/biblioteca-inicial`).pipe(
      tap((res) => {
        // Salva no localStorage para a próxima vez
        localStorage.setItem(cacheKey, JSON.stringify(res));
      }),
      shareReplay(1)
    );

    // Se tem dados no localStorage, retorna eles AGORA e busca os novos em background
    if (dadosIniciais) {
      request$.subscribe(); // Dispara a requisição em background
      return of(dadosIniciais); // Retorna o cache na hora
    }

    // Se não tem nada, espera o servidor
    this.bibliotecaCache$ = request$;
    this.bibliotecaCacheTimestamp = agora;
    return this.bibliotecaCache$;
  }

  // 🆕 Limpar cache da biblioteca
  limparCacheBiblioteca(): void {
    this.bibliotecaCache$ = null;
    this.bibliotecaCacheTimestamp = 0;
  }

  salvarPreferencias(generos: string[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/preferencias`, { generos }).pipe(
      tap(() => this.limparCacheBiblioteca()) // 🆕 Limpa cache ao salvar preferências
    );
  }

  getPaginado(pagina: number = 1, tamanhoPagina: number = 20, busca: string = '', genero: string = ''): Observable<any> {
    let url = `${this.apiUrl}/paginado?pagina=${pagina}&tamanhoPagina=${tamanhoPagina}`;

    if (busca) url += `&busca=${encodeURIComponent(busca)}`;
    if (genero) url += `&genero=${encodeURIComponent(genero)}`;

    return this.http.get<any>(url);
  }

  adicionarLivro(livro: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/Livro`, livro);
  }
}
