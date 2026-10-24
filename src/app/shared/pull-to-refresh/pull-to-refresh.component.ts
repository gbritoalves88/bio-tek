import { Component, EventEmitter, Output, Input, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pull-to-refresh',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ptr-wrapper"
         (touchstart)="onTouchStart($event)"
         (touchmove)="onTouchMove($event)"
         (touchend)="onTouchEnd($event)">

      <div class="ptr-spinner" [class.visivel]="carregando || deslocamento > 0">
        <div class="ptr-spinner-icon" [class.girando]="carregando || deslocamento >= threshold"></div>
      </div>

      <div class="ptr-content" [class.com-spinner]="carregando || deslocamento > 0">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styleUrl: './pull-to-refresh.component.scss'
})
export class PullToRefreshComponent {
  @Output() refresh = new EventEmitter<void>();
  @Input() carregando = false;

  readonly threshold = 70;
  readonly zonaMorta = 15;
  readonly resistencia = 0.4;

  arrastando = false;
  deslocamento = 0;
  private startY = 0;

  constructor(private cdr: ChangeDetectorRef) {}

  onTouchStart(event: TouchEvent): void {
    if (this.carregando) return;

    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const target = event.target as HTMLElement;
    const scrollContainer = this.encontrarScrollContainer(target);

    if (scrollTop > 0 || (scrollContainer && scrollContainer.scrollTop > 0)) {
      this.arrastando = false;
      return;
    }

    this.startY = event.touches[0].clientY;
    this.arrastando = true;
    this.deslocamento = 0;
  }

  onTouchMove(event: TouchEvent): void {
    if (!this.arrastando || this.carregando) return;

    const diff = event.touches[0].clientY - this.startY;

    // Se rolar para cima, libera o scroll nativo imediatamente
    if (diff < 0) {
      this.arrastando = false;
      this.deslocamento = 0;
      this.cdr.markForCheck();
      return;
    }

    if (diff < this.zonaMorta) return;

    if (event.cancelable) {
      event.preventDefault();
    }

    const diffReal = diff - this.zonaMorta;
    this.deslocamento = Math.min(diffReal * this.resistencia, this.threshold);
    this.cdr.markForCheck();
  }

  // 🆕 Aceita o parâmetro 'event' (mesmo que não use, para bater com o template)
  onTouchEnd(event: TouchEvent): void {
    if (!this.arrastando) return;
    this.arrastando = false;

    if (this.deslocamento >= this.threshold) {
      this.refresh.emit();
      setTimeout(() => this.resetar(), 1500);
    } else {
      this.resetar();
    }
  }

  resetar(): void {
    this.deslocamento = 0;
    this.cdr.markForCheck();
  }

  private encontrarScrollContainer(el: HTMLElement | null): HTMLElement | null {
    while (el && el !== document.body) {
      const style = window.getComputedStyle(el);
      if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
        return el;
      }
      el = el.parentElement;
    }
    return null;
  }
}
