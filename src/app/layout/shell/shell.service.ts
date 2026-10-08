import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ShellService {
  private apiUrl = `${environment.apiUrl}/Usuario`;

  constructor(private http: HttpClient) {}

  // 🆕 Desativar conta do usuário logado
  desativarConta(): Observable<any> {
    return this.http.post(`${this.apiUrl}/desativar`, {});
  }

  // 🆕 Sair (limpa tudo do localStorage)
  limparSessao(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('usuario');
  }
}
