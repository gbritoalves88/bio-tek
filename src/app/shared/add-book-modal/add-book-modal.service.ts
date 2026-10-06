import { Injectable } from '@angular/core';
import { HttpBackend, HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AddBookModalService {
  private apiUrl = `${environment.apiUrl}/Livro`;
  private apiCatalogoUrl = `${environment.apiUrl}/Catalogo`;
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
  arquivoLeitura?: string | null;
  tipo?: string;
  status?: number;
}): Observable<any> {
  return this.http.post(this.apiUrl, livro);
}

  buscarPorCodigoBarras(isbn: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/buscar/isbn/${isbn}`);
  }

  // 🆕 Buscar por título (OCR scanner)
  buscarPorTitulo(titulo: string, autor?: string): Observable<any> {
    let url = `${this.apiCatalogoUrl}/buscar-por-titulo?titulo=${encodeURIComponent(titulo)}`;

    if (autor && autor.trim()) {
      url += `&autor=${encodeURIComponent(autor.trim())}`;
    }

    return this.http.get<any>(url);
  }
}
