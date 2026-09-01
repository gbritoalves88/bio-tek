import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LivroDetalhesInterno } from './livro.model';



@Injectable({
  providedIn: 'root'
})
export class LivroService {
  private apiUrl = `${environment.apiUrl}/Livro`;

  constructor(private http: HttpClient) {}

  getDetalhesInterno(id: string): Observable<LivroDetalhesInterno> {
    return this.http.get<LivroDetalhesInterno>(`${this.apiUrl}/${id}/detalhes-interno`);
  }

  adicionarABiblioteca(livro: {
    titulo: string;
    autor: string;
    descricao?: string;
    imagem?: string | null;
    codigoBarras?: string | null;
  }): Observable<any> {
    return this.http.post(this.apiUrl, livro);
  }

  atualizarLivro(id: string, dados: {
    titulo?: string;
    autor?: string;
    descricao?: string;
    imagem?: string;
    status?: number;
    tipo?: string;
  }): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, dados);
  }

  deletarLivro(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
