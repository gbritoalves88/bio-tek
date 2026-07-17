import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdminDashboard, AdminComentario, AdminUsuario, Paginado } from './admin.model';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private api = `${environment.apiUrl}/Admin`;

  constructor(private http: HttpClient) {}

  getDashboard(params?: any): Observable<AdminDashboard> {
    return this.http.get<AdminDashboard>(`${this.api}/dashboard`, { params });
  }

  getComentarios(pagina: number = 1): Observable<Paginado<AdminComentario>> {
    return this.http.get<Paginado<AdminComentario>>(`${this.api}/comentarios?pagina=${pagina}&limite=20`);
  }

  deletarComentario(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/comentarios/${id}`);
  }

  aprovarComentario(id: string): Observable<any> {
    return this.http.put(`${this.api}/comentarios/${id}/aprovar`, {});
  }

  getUsuarios(pagina: number = 1): Observable<Paginado<AdminUsuario>> {
    return this.http.get<Paginado<AdminUsuario>>(`${this.api}/usuarios?pagina=${pagina}&limite=20`);
  }

  toggleAtivo(id: string): Observable<any> {
    return this.http.put(`${this.api}/usuarios/${id}/ativo`, {});
  }

  excluirConta(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/usuarios/${id}`);
  }
}
