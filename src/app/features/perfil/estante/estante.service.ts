import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Prateleira } from './estante.model';

@Injectable({
  providedIn: 'root'
})
export class EstanteService {
  private apiUrl = `${environment.apiUrl}/Colecao`;

  constructor(private http: HttpClient) {}

  // 🆕 Lista as prateleiras do usuário logado
  getMinhasPrateleiras(): Observable<Prateleira[]> {
    return this.http.get<Prateleira[]>(this.apiUrl);
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
}
