import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class LoginGuard implements CanActivate {
  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  async canActivate(): Promise<boolean> {
    const token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refreshToken');

    // Se tem token, vai direto para o início
    if (token) {
      this.router.navigate(['/inicio']);
      return false;
    }

    // Se tem refreshToken, tenta renovar automaticamente
    if (refreshToken) {
      try {
        const response: any = await firstValueFrom(
          this.http.post(`${environment.apiUrl}/Auth/refresh`, { refreshToken })
        );

        // Salvar novos tokens
        localStorage.setItem('token', response.token);
        localStorage.setItem('refreshToken', response.refreshToken);

        // Redirecionar para o início
        this.router.navigate(['/inicio']);
        return false;
      } catch (error) {
        // Refresh token inválido ou expirado
        console.error('Refresh token inválido:', error);

        // Limpar dados inválidos
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('usuario');

        // Permitir ir para o login
        return true;
      }
    }

    // Não tem token nem refreshToken, vai para login
    return true;
  }
}
