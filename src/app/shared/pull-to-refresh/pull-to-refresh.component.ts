import { Component, EventEmitter, Output, Input, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'app-pull-to-refresh',
  standalone: true,
  imports: [CommonModule],
  template: `
    <ng-template #conteudo>
      <ng-content></ng-content>
    </ng-template>

    <ng-container *ngIf="!isNative; else nativo">
      <ng-container *ngTemplateOutlet="conteudo"></ng-container>
    </ng-container>

    <ng-template #nativo>
      <div class="ptr-wrapper"
           (touchstart)="onTouchStart($event)"
           (touchmove)="onTouchMove($event)"
           (touchend)="onTouchEnd($event)">

        <div class="ptr-spinner" [class.visivel]="carregando || deslocamento > 0">
          <div class="ptr-spinner-icon" [class.girando]="carregando || deslocamento >= threshold"></div>
        </div>

        <div class="ptr-content" [class.com-spinner]="carregando || deslocamento > 0">
          <ng-container *ngTemplateOutlet="conteudo"></ng-container>
        </div>
      </div>
    </ng-template>
  `,
  styleUrl: './pull-to-refresh.component.scss'
})
export class PullToRefreshComponent {
  @Output() refresh = new EventEmitter<void>();
  @Input() carregando = false;

  isNative = Capacitor.isNativePlatform();
  readonly threshold = 60;
  arrastando = false;
  deslocamento = 0;
  private startY = 0;

  constructor(private cdr: ChangeDetectorRef) {}

  onTouchStart(event: TouchEvent): void {
    if (this.carregando) return;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    if (scrollTop > 0) return;
    this.startY = event.touches[0].clientY;
    this.arrastando = true;
  }

  onTouchMove(event: TouchEvent): void {
    if (!this.arrastando || this.carregando) return;
    const diff = event.touches[0].clientY - this.startY;
    if (diff > 0) {
      event.preventDefault();
      this.deslocamento = Math.min(diff, this.threshold);
      this.cdr.markForCheck();
    }
  }

  onTouchEnd(event: TouchEvent): void {
    if (!this.arrastando) return;
    this.arrastando = false;

    if (this.deslocamento >= this.threshold) {
      this.refresh.emit();
      setTimeout(() => this.resetar(), 2000);
    } else {
      this.deslocamento = 0;
    }
    this.cdr.markForCheck();
  }

  resetar(): void {
    this.deslocamento = 0;
    this.cdr.markForCheck();
  }
}
