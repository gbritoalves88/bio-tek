import { Injectable } from '@angular/core';
import { HttpBackend, HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AddBookModalService {
  private apiUrl = 'http://localhost:5081/api/Livro';
  private httpSemAuth: HttpClient;

  constructor(private http: HttpClient, private httpBackend: HttpBackend ) {
    this.httpSemAuth = new HttpClient(httpBackend);
  }

  adicionarLivro(livro: {
  titulo: string;
  autor: string;
  descricao?: string;
  imagem?: string | null;
  codigoBarras?: string | null;
  }): Observable<any> {
    return this.http.post(this.apiUrl, livro);
  }

  buscarPorCodigoBarras(isbn: string): Observable<any> {
    return this.http.get<any>(`http://localhost:5081/api/Livro/buscar/isbn/${isbn}`);
  }

}
