// src/app/shared/capa-hash/capa-hash.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LivroEncontrado, BuscarPorCapaRequest } from './capa-hash.model';

@Injectable({
  providedIn: 'root'
})
export class CapaHashService {
  private apiUrl = `${environment.apiUrl}/CapaHash`;

  constructor(private http: HttpClient) {}

  /**
   * Busca livros por imagem da capa (pHash)
   */
  buscarPorCapa(imagemBase64: string): Observable<LivroEncontrado[]> {
    const request: BuscarPorCapaRequest = { imagemBase64 };
    return this.http.post<LivroEncontrado[]>(`${this.apiUrl}/buscar`, request);
  }
}
