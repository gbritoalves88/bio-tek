import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ShellService {
  private apiUrl = `${environment.apiUrl}/Usuario`;

  // 🆕 BehaviorSubject para notificar mudanças no usuário em tempo real
  private usuarioAtualSubject = new BehaviorSubject<any>(this.getUsuarioLocalStorage());
  public usuarioAtual$ = this.usuarioAtualSubject.asObservable();

  constructor(private http: HttpClient) {}

  // 🆕 Desativar conta do usuário logado
  desativarConta(): Observable<any> {
    return this.http.post(`${this.apiUrl}/desativar`, {});
  }

  // 🆕 Atualiza o localStorage e notifica todos os componentes inscritos
  atualizarUsuarioLocal(dados: Partial<any>): void {
    const atual = this.getUsuarioLocalStorage();
    const novo = { ...atual, ...dados };
    localStorage.setItem('usuario', JSON.stringify(novo));
    this.usuarioAtualSubject.next(novo);
  }

  // 🆕 Lê o usuário do localStorage com segurança
  private getUsuarioLocalStorage(): any {
    try {
      return JSON.parse(localStorage.getItem('usuario') || '{}');
    } catch {
      return {};
    }
  }

  // 🆕 Sair (limpa tudo do localStorage e notifica)
  limparSessao(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('usuario');
    this.usuarioAtualSubject.next({}); // Notifica que o usuário saiu
  }
}
