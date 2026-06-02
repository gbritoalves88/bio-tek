import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AlertService {

  private showToast(message: string, type: string): void {
    // Cria o container se não existir
    let container = document.querySelector('.alert-toast-container') as HTMLElement;
    if (!container) {
      container = document.createElement('div');
      container.className = 'alert-toast-container';
      container.style.cssText = `
        position: fixed;
        top: 70px;
        right: 16px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 8px;
      `;
      document.body.appendChild(container);
    }

    // Cria o toast
    const toast = document.createElement('div');
    toast.className = `alert-toast alert-${type}`;

    // Define cores baseado no tipo
    const colors = {
      success: { border: '#4caf50', icon: '#4caf50', iconChar: '✓', bg: '#f3dcba' },
      error: { border: '#e74c3c', icon: '#e74c3c', iconChar: '✗', bg: '#f3dcba' },
      info: { border: '#2196f3', icon: '#2196f3', iconChar: 'ℹ', bg: '#f3dcba' },
      warning: { border: '#ff9800', icon: '#ff9800', iconChar: '⚠', bg: '#f3dcba' }
    };

    const color = colors[type as keyof typeof colors] || colors.info;

    toast.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: ${color.bg};
      border-radius: 8px;
      border-left: 4px solid ${color.border};
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      min-width: 280px;
      max-width: 350px;
      animation: slideIn 0.3s ease;
      font-family: system-ui, -apple-system, sans-serif;
    `;

    toast.innerHTML = `
      <span style="font-size: 18px; font-weight: bold; color: ${color.icon}">${color.iconChar}</span>
      <span style="flex: 1; font-size: 14px; color: #333;">${message}</span>
      <button style="background: none; border: none; font-size: 18px; cursor: pointer; color: #999; padding: 0 4px;">×</button>
    `;

    // Botão fechar
    const closeBtn = toast.querySelector('button');
    closeBtn?.addEventListener('click', () => {
      toast.remove();
    });

    container.appendChild(toast);

    // Remove após 4 segundos
    setTimeout(() => {
      toast.remove();
    }, 4000);
  }

  success(message: string): void {
    console.log('✅ Sucesso:', message);
    this.showToast(message, 'success');
  }

  error(message: string): void {
    console.log('❌ Erro:', message);
    this.showToast(message, 'error');
  }

  info(message: string): void {
    console.log('ℹ️ Info:', message);
    this.showToast(message, 'info');
  }

  warning(message: string): void {
    console.log('⚠️ Aviso:', message);
    this.showToast(message, 'warning');
  }
}
