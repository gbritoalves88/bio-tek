import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class PerfilCompletoGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    const nickname = usuario?.nickname;

    if (!nickname || nickname === '@sem-nickname' || nickname === '') {
      this.router.navigate(['/inicio/perfil'], { queryParams: { editar: 'true' } });
      return false;
    }

    return true;
  }
}
