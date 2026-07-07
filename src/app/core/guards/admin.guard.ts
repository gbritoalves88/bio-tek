import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AlertService } from '../../shared/services/alert.service';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  constructor(private router: Router, private alertService: AlertService) {}

  canActivate(): boolean {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

    if (usuario?.adm === true) {
      return true;
    }

    this.alertService.error('Acesso restrito ao administrador');
    this.router.navigate(['/inicio']);
    return false;
  }
}
