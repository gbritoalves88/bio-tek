// src/app/features/biblioteca/catalogo.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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

  constructor(private http: HttpClient) {}

  getAll(): Observable<CatalogoLivro[]> {
    return this.http.get<CatalogoLivro[]>(this.apiUrl);
  }

  // Endpoint correto para adicionar à biblioteca pessoal
  adicionarBiblioteca(catalogoId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${catalogoId}/adicionar-biblioteca`, {});
  }
}
