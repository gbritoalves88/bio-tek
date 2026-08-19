import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { LoginResponse } from './login.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LoginService {
  private apiUrl = `${environment.apiUrl}/Auth`;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  // 🆕 Novo método: envia apenas o code para o backend
  loginComGoogleCode(code: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/google-code`, {
      code,
      redirectUri: environment.google.redirectUri
    }).pipe(
      tap(response => {
        localStorage.setItem('token', response.token);
        localStorage.setItem('refreshToken', response.refreshToken);  // 🆕
        localStorage.setItem('usuario', JSON.stringify(response.usuario));
        const usuario = {
          id: response.usuario.id,
          nome: response.usuario.nome,
          nickname: response.usuario.nickname,
          email: response.usuario.email,
          avatar: response.usuario.avatar,
          descricao: response.usuario.descricao,
          tema: response.usuario.tema,
          adm: response.usuario.adm,
          aceitouTermos: response.usuario.aceitouTermos || false
        };
        localStorage.setItem('usuario', JSON.stringify(usuario));
      })
    );
  }

  loginMock(nome: string, email: string, nickname?: string): Observable<LoginResponse> {
    const id = 'mock-' + Date.now();
    return this.http.post<LoginResponse>(`${this.apiUrl}/mock`, {
      id,
      idToken: 'fake-mock-token',
      nome,
      email,
      nickname
    }).pipe(
      tap(response => {
        localStorage.setItem('token', response.token);
        const usuario = {
          id: response.usuario.id,
          nome: response.usuario.nome,
          nickname: response.usuario.nickname,
          email: response.usuario.email,
          avatar: response.usuario.avatar,
          descricao: response.usuario.descricao,
          tema: response.usuario.tema,
          adm: response.usuario.adm,
          aceitouTermos: response.usuario.aceitouTermos || false  // ⬅️ ADICIONAR
        };
        localStorage.setItem('usuario', JSON.stringify(usuario));
      })
    );
  }

  getToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem('token');
  }

  getUsuario(): any {
    if (typeof localStorage === 'undefined') return null;
    const usuario = localStorage.getItem('usuario');
    return usuario ? JSON.parse(usuario) : null;
  }

  estaLogado(): boolean {
    return !!this.getToken();
  }

  sair(): void {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken'); // ← ADICIONAR (se faltar)
      localStorage.removeItem('usuario');
      this.router.navigate(['/']);
  }
}
