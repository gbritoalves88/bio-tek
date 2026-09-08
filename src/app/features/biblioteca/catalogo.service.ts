// src/app/features/biblioteca/catalogo.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay, tap } from 'rxjs';
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

    // Se cache válido, retorna ele
    if (this.bibliotecaCache$ && (agora - this.bibliotecaCacheTimestamp) < this.CACHE_DURATION) {
      return this.bibliotecaCache$;
    }

    // Cria novo cache
    this.bibliotecaCache$ = this.http.get(`${this.apiUrl}/biblioteca-inicial`).pipe(
      shareReplay(1),
      tap(() => {
        this.bibliotecaCacheTimestamp = Date.now();
      })
    );

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
}
