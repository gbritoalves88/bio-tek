import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FeedComponent } from './feed/feed.component';
import { SocialComponent } from './social/social.component';

@Component({
  selector: 'app-comunidade',
  standalone: true,
  imports: [CommonModule, FeedComponent, SocialComponent],
  templateUrl: './comunidade.component.html',
  styleUrl: './comunidade.component.scss',
  host: { 'ngSkipHydration': 'true' }
})
export class ComunidadeComponent {
  abaAtiva: 'feed' | 'social' = 'feed';

  trocarAba(aba: 'feed' | 'social'): void {
    this.abaAtiva = aba;
  }
}
