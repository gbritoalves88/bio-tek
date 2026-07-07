import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AdminDashboard {
  totalUsuarios: number;
  usuariosAtivos: number;
  totalComentarios: number;
  comentariosFlagged: number;
  totalLivros: number;
}

export interface AdminComentario {
  id: string;
  idLivro: string;
  idUsuario: string;
  comentario: string;
  dataCriacao: string;
  flagged: boolean;
  toxicidadeScore: number | null;
  usuario: { id: string; nome: string; nickname: string } | null;
}

export interface AdminUsuario {
  id: string;
  nome: string;
  nickname: string;
  email: string;
  ativo: boolean;
  adm: boolean;
  dataCriacao: string;
  quantidadeLivros: number;
  quantidadeLivrosLidos: number;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private api = `${environment.apiUrl}/Admin`;

  constructor(private http: HttpClient) {}

  getDashboard(): Observable<AdminDashboard> {
    return this.http.get<AdminDashboard>(`${this.api}/dashboard`);
  }

  getComentarios(pagina: number = 1): Observable<{ dados: AdminComentario[], total: number, totalPaginas: number, pagina: number }> {
    return this.http.get<any>(`${this.api}/comentarios?pagina=${pagina}&limite=20`);
  }

  getUsuarios(pagina: number = 1): Observable<{ dados: AdminUsuario[], total: number, totalPaginas: number, pagina: number }> {
    return this.http.get<any>(`${this.api}/usuarios?pagina=${pagina}&limite=20`);
  }

  deletarComentario(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/comentarios/${id}`);
  }

  aprovarComentario(id: string): Observable<any> {
    return this.http.put(`${this.api}/comentarios/${id}/aprovar`, {});
  }

  toggleAtivo(id: string): Observable<any> {
    return this.http.put(`${this.api}/usuarios/${id}/ativo`, {});
  }

  excluirConta(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/usuarios/${id}`);
  }
}
