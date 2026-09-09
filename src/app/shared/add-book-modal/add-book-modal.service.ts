import { Injectable } from '@angular/core';
import { HttpBackend, HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AddBookModalService {
  private apiUrl = `${environment.apiUrl}/Livro`;
  private httpSemAuth: HttpClient;

  constructor(private http: HttpClient, private httpBackend: HttpBackend) {
    this.httpSemAuth = new HttpClient(httpBackend);
  }

  adicionarLivro(livro: {
    titulo: string;
    autor: string;
    descricao?: string;
    imagem?: string | null;
    codigoBarras?: string | null;
    generos?: string[];
    anoPublicacao?: number | null;
    editora?: string | null;
    idioma?: string | null;
    // 🆕
    tipo?: string;
    status?: number;
  }): Observable<any> {
    return this.http.post(this.apiUrl, livro);
  }

  buscarPorCodigoBarras(isbn: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/buscar/isbn/${isbn}`);
  }
}
