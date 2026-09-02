import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
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

  @ViewChild(SocialComponent) socialComponent?: SocialComponent;

  constructor(private cdr: ChangeDetectorRef) {}

  trocarAba(aba: 'feed' | 'social'): void {
    this.abaAtiva = aba;

    // 🆕 Se for social, recarrega após renderizar
    if (aba === 'social') {
      setTimeout(() => {
        if (this.socialComponent) {
          this.socialComponent.carregarUsuarios();
        }
      }, 100);
    }
  }
}
