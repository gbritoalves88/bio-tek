import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  async canActivate(): Promise<boolean> {
    const token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refreshToken');

    if (!token && !refreshToken) {
      this.router.navigate(['/']);
      return false;
    }

    // Se tem token, tenta usar (mesmo que expirado — interceptor renova)
    if (token) {
      return true;
    }

    // Se não tem token, mas tem refreshToken, tenta renovar
    if (!token && refreshToken) {
      try {
        const response: any = await firstValueFrom(
          this.http.post(`${environment.apiUrl}/Auth/refresh`, { refreshToken })
        );
        localStorage.setItem('token', response.token);
        localStorage.setItem('refreshToken', response.refreshToken);
        return true;
      } catch {
        this.router.navigate(['/']);
        return false;
      }
    }

    this.router.navigate(['/']);
    return false;
  }
}
