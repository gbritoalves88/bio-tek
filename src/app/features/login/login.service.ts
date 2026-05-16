// src/app/features/login/login.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { LoginResponse } from './login.model';

@Injectable({
  providedIn: 'root'
})
export class LoginService {
  private apiUrl = 'http://localhost:5081/api/Auth';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  loginComGoogle(idToken: string, id: string, nome: string, email: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/google`, {
      id,
      idToken,
      nome,
      email
    }).pipe(
      tap(response => {
        localStorage.setItem('token', response.token);
        localStorage.setItem('usuario', JSON.stringify(response.usuario));
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
    localStorage.removeItem('usuario');
    this.router.navigate(['/']);
  }

  loginMock(nome: string, email: string): Observable<LoginResponse> {
    const id = 'mock-' + Date.now();
    return this.http.post<LoginResponse>(`${this.apiUrl}/mock`, {
      id,
      idToken: 'fake-mock-token',
      nome,
      email
    }).pipe(
      tap(response => {
        localStorage.setItem('token', response.token);
        localStorage.setItem('usuario', JSON.stringify(response.usuario));
      })
    );
  }
}
