// src/app/features/biblioteca/catalogo.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CatalogoLivro {
  id: string;
  titulo: string;
  autor: string;
  descricao?: string;
  imagem?: string;
  codigoBarras?: string;
  fonte?: string;
  fonteId?: string;
  generos?: string[];
  anoPublicacao?: number;
  editora?: string;
  numeroPaginas?: number;
  avaliacaoMedia?: number;
}

@Injectable({
  providedIn: 'root'
})
export class CatalogoService {
  private apiUrl = `${environment.apiUrl}/Catalogo`;

  // 🆕 Cache do catálogo
  private catalogoCache$: Observable<CatalogoLivro[]> | null = null;

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
    // 🆕 Invalida cache ao adicionar livro (pode atualizar dados do catálogo)
    return this.http.post(`${this.apiUrl}/${catalogoId}/adicionar-biblioteca`, {}).pipe(
      tap(() => this.limparCache())
    );
  }

  limparCache(): void {
    this.catalogoCache$ = null;
  }

  getCategorias(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/categorias`);
  }

  buscarExterno(termo: string, limite: number = 30): Observable<any> {
    return this.http.post(`${this.apiUrl}/importar/termo/${termo}?limite=${limite}`, {});
  }

  getBibliotecaInicial(): Observable<any> {
    return this.http.get(`${this.apiUrl}/biblioteca-inicial`);
  }

  salvarPreferencias(generos: string[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/preferencias`, { generos });
  }
}
