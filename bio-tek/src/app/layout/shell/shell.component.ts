import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <h1>Shell OK</h1>
    <router-outlet></router-outlet>
  `
})
export class ShellComponent {}
