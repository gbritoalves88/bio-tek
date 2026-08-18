import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { DashboardData } from './home.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class HomeService {
  private homeApiUrl = `${environment.apiUrl}/Home`;
  private livroApiUrl = `${environment.apiUrl}/Livro`;

  private dashboardCache$: Observable<DashboardData> | null = null;

  constructor(private http: HttpClient) {}

  getDashboard(): Observable<DashboardData> {
    if (!this.dashboardCache$) {
      this.dashboardCache$ = this.http.get<DashboardData>(`${this.homeApiUrl}/dashboard`).pipe(
        shareReplay(1)
      );
    }
    return this.dashboardCache$;
  }

  limparCache(): void {
    this.dashboardCache$ = null;
  }

  adicionarLivro(livro: {
    titulo: string;
    autor: string;
    descricao?: string;
    imagem?: string | null;
    codigoBarras?: string | null;
  }): Observable<any> {
    return this.http.post(this.livroApiUrl, livro);
  }

  atualizarProgresso(id: string, dados: {
    paginaAtual?: number;
    totalPaginas?: number;
    progresso?: number;
    pausado?: boolean;
    minutoAtual?: number;      // 🆕
    totalMinutos?: number;     // 🆕
  }): Observable<any> {
    return this.http.put(`${this.livroApiUrl}/${id}/progresso`, dados);
  }

  baixarImagem(url: string): Observable<Blob> {
    const urlProxy = `${this.livroApiUrl}/proxy-imagem?url=${encodeURIComponent(url)}`;
    return this.http.get(urlProxy, { responseType: 'blob' });
  }
}
