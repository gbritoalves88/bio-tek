import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Prateleira } from './estante.model';

@Injectable({
  providedIn: 'root'
})
export class EstanteService {
  private prateleirasCache$: Observable<Prateleira[]> | null = null;
  private prateleirasCacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 30 * 1000;

  private apiUrl = `${environment.apiUrl}/Colecao`;

  constructor(private http: HttpClient) {}

  // 🆕 Lista as prateleiras do usuário logado
  getMinhasPrateleiras(forcarAtualizacao: boolean = false): Observable<Prateleira[]> {
    const agora = Date.now();

    if (forcarAtualizacao) {
      this.prateleirasCache$ = null;
      this.prateleirasCacheTimestamp = 0;
    }

    if (this.prateleirasCache$ && (agora - this.prateleirasCacheTimestamp) < this.CACHE_DURATION) {
      return this.prateleirasCache$;
    }

    this.prateleirasCache$ = this.http.get<Prateleira[]>(this.apiUrl).pipe(
      shareReplay(1),
      tap(() => this.prateleirasCacheTimestamp = Date.now())
    );

    return this.prateleirasCache$;
  }

  limparCachePrateleiras(): void {
    this.prateleirasCache$ = null;
    this.prateleirasCacheTimestamp = 0;
  }

  // 🆕 Cria nova prateleira
  criarPrateleira(dados: { nome: string; descricao?: string | null }): Observable<Prateleira> {
    return this.http.post<Prateleira>(this.apiUrl, dados);
  }

  // 🆕 Atualiza prateleira (pra usar depois)
  atualizarPrateleira(id: string, dados: { nome: string; descricao?: string | null }): Observable<Prateleira> {
    return this.http.put<Prateleira>(`${this.apiUrl}/${id}`, dados);
  }

  // 🆕 Deleta prateleira (pra usar depois)
  deletarPrateleira(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // 🆕 Lista as prateleiras de um usuário específico (perfil visitado)
  getPrateleirasDoUsuario(usuarioId: string): Observable<Prateleira[]> {
    return this.http.get<Prateleira[]>(`${this.apiUrl}/usuario/${usuarioId}`);
  }

}
