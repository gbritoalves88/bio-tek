import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-bottom-sheet',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="bottom-sheet-overlay"
      [class.active]="aberto"
      (click)="fechar.emit()"
      (touchstart)="$event.stopPropagation()"
      (touchmove)="$event.stopPropagation()">

      <div
        class="bottom-sheet"
        [class.active]="aberto"
        (click)="$event.stopPropagation()"
        (touchstart)="$event.stopPropagation()"
        (touchmove)="$event.stopPropagation()">

        <!-- Barra de arrastar (visual) -->
        <div class="drag-handle"></div>

        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    .bottom-sheet-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1000;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
    }

    .bottom-sheet-overlay.active {
      opacity: 1;
      pointer-events: auto;
    }

    .bottom-sheet {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: var(--bg-card);
      border-radius: 20px 20px 0 0;
      max-height: 85vh;
      overflow-y: auto;
      transform: translateY(100%);
      transition: transform 0.3s ease;
      padding: 20px;
      box-sizing: border-box;
    }

    .bottom-sheet.active {
      transform: translateY(0);
    }

    .drag-handle {
      width: 40px;
      height: 4px;
      background: var(--border-color);
      border-radius: 2px;
      margin: 0 auto 16px;
    }
  `]
})
export class BottomSheetComponent {
  @Input() aberto = false;
  @Output() fechar = new EventEmitter<void>();
}
