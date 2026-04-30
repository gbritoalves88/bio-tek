import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  constructor(private router: Router) {}

  entrarComGoogle() {
    this.router.navigate(['/inicio']);
  }

  entrarComFacebook() {
    this.router.navigate(['/inicio']);
  }

  entrarComoConvidado() {
    this.router.navigate(['/inicio']);
  }
}
