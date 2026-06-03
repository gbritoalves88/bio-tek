import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AlertService {

  private getThemeColors(): { bg: string; text: string; button: string } {
    // Verifica se está no navegador
    if (typeof document === 'undefined') {
      return { bg: '#ffffff', text: '#333333', button: '#999999' };
    }

    const isDarkTheme = document.body.classList.contains('dark-theme');

    return {
      bg: isDarkTheme ? '#2a2a2a' : '#ffffff',
      text: isDarkTheme ? '#e0e0e0' : '#333333',
      button: isDarkTheme ? '#888888' : '#999999'
    };
  }

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

    // Obtém as cores do tema atual
    const theme = this.getThemeColors();

    // Cria o toast
    const toast = document.createElement('div');
    toast.className = `alert-toast alert-${type}`;

    // Define cores baseado no tipo (apenas borda e ícone)
    const colors = {
      success: { border: '#4caf50', icon: '#4caf50', iconChar: '✓' },
      error: { border: '#e74c3c', icon: '#e74c3c', iconChar: '✗' },
      info: { border: '#2196f3', icon: '#2196f3', iconChar: 'ℹ' },
      warning: { border: '#ff9800', icon: '#ff9800', iconChar: '⚠' }
    };

    const color = colors[type as keyof typeof colors] || colors.info;

    toast.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: ${theme.bg};
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
      <span style="flex: 1; font-size: 14px; color: ${theme.text};">${message}</span>
      <button style="background: none; border: none; font-size: 18px; cursor: pointer; color: ${theme.button}; padding: 0 4px;">×</button>
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
