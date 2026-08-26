import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AdminDashboard, AdminComentario, AdminUsuario, AdminLivro, Paginado } from './admin.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private api = `${environment.apiUrl}/Admin`;

  constructor(private http: HttpClient) {}

  getDashboard(params: { dataInicio?: string; dataFim?: string } = {}): Observable<AdminDashboard> {
    let httpParams = new HttpParams();
    if (params.dataInicio) httpParams = httpParams.set('dataInicio', params.dataInicio);
    if (params.dataFim) httpParams = httpParams.set('dataFim', params.dataFim);
    return this.http.get<AdminDashboard>(`${this.api}/dashboard`, { params: httpParams });
  }

  getComentarios(pagina: number = 1, limite: number = 20): Observable<Paginado<AdminComentario>> {
    return this.http.get<Paginado<AdminComentario>>(`${this.api}/comentarios`, {
      params: { pagina: pagina.toString(), limite: limite.toString() }
    });
  }

  // 🆕 USUÁRIOS COM FILTROS
  getUsuarios(
    pagina: number = 1,
    limite: number = 20,
    ordenar?: string,
    status?: string
  ): Observable<Paginado<AdminUsuario>> {
    let params = new HttpParams()
      .set('pagina', pagina.toString())
      .set('limite', limite.toString());

    if (ordenar) params = params.set('ordenar', ordenar);
    if (status) params = params.set('status', status);

    return this.http.get<Paginado<AdminUsuario>>(`${this.api}/usuarios`, { params });
  }

  getUsuario(id: string): Observable<AdminUsuario> {
    return this.http.get<AdminUsuario>(`${this.api}/usuarios/${id}`);
  }

  toggleAtivo(id: string): Observable<any> {
    return this.http.put(`${this.api}/usuarios/${id}/ativo`, {});
  }

  excluirConta(id: string): Observable<any> {
    return this.http.delete(`${this.api}/usuarios/${id}`);
  }

  getLivros(pagina: number = 1, limite: number = 20): Observable<Paginado<AdminLivro>> {
    return this.http.get<Paginado<AdminLivro>>(`${this.api}/livros`, {
      params: { pagina: pagina.toString(), limite: limite.toString() }
    });
  }

  excluirLivro(id: string): Observable<any> {
    return this.http.delete(`${this.api}/livros/${id}`);
  }

  deletarComentario(id: string): Observable<any> {
    return this.http.delete(`${this.api}/comentarios/${id}`);
  }

  aprovarComentario(id: string): Observable<any> {
    return this.http.put(`${this.api}/comentarios/${id}/aprovar`, {});
  }

  exportarDados(): Observable<Blob> {
    return this.http.get(`${this.api}/exportar`, { responseType: 'blob' });
  }
}
