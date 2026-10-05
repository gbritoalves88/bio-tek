import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay, tap } from 'rxjs';
import { DashboardData } from './home.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class HomeService {
  private homeApiUrl = `${environment.apiUrl}/Home`;
  private livroApiUrl = `${environment.apiUrl}/Livro`;

  // 🆕 Cache do dashboard com timestamp
  private dashboardCache$: Observable<DashboardData> | null = null;
  private dashboardCacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 60 * 1000; // 60 segundos

  constructor(private http: HttpClient) {}

  // 🆕 Dashboard com cache de 60 segundos
  getDashboard(): Observable<DashboardData> {
    const agora = Date.now();

    // Retorna cache se estiver válido
    if (this.dashboardCache$ && (agora - this.dashboardCacheTimestamp) < this.CACHE_DURATION) {
      return this.dashboardCache$;
    }

    // Cria novo cache
    this.dashboardCache$ = this.http.get<DashboardData>(`${this.homeApiUrl}/dashboard`).pipe(
      shareReplay(1),
      tap(() => {
        this.dashboardCacheTimestamp = Date.now();
      })
    );

    return this.dashboardCache$;
  }

  // 🆕 Limpa cache (chamado quando dados mudam)
  limparCache(): void {
    this.dashboardCache$ = null;
    this.dashboardCacheTimestamp = 0;
  }

  // 🆕 Adicionar livro + limpar cache
  adicionarLivro(livro: {
    titulo: string;
    autor: string;
    descricao?: string;
    imagem?: string | null;
    codigoBarras?: string | null;
  }): Observable<any> {
    return this.http.post(this.livroApiUrl, livro).pipe(
      tap(() => this.limparCache()) // Limpa cache ao adicionar livro
    );
  }

  // 🆕 Atualizar progresso + limpar cache
  atualizarProgresso(id: string, dados: {
    paginaAtual?: number;
    totalPaginas?: number;
    progresso?: number;
    pausado?: boolean;
    minutoAtual?: number;
    totalMinutos?: number;
  }): Observable<any> {
    return this.http.put(`${this.livroApiUrl}/${id}/progresso`, dados).pipe(
      tap(() => this.limparCache()) // Limpa cache ao atualizar progresso
    );
  }

  // 🆕 Baixar imagem (sem cache, é proxy)
  baixarImagem(url: string): Observable<Blob> {
      const urlProxy = `${this.livroApiUrl}/proxy-imagem?url=${encodeURIComponent(url)}`;
      return this.http.get(urlProxy, { responseType: 'blob' });
    }

    finalizarLeitura(id: string): Observable<any> {
    return this.http.put(`${this.livroApiUrl}/${id}`, {
      status: 3   // Lido
    }).pipe(
      tap(() => this.limparCache())
    );
  }
}
