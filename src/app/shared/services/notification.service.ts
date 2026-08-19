import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { BehaviorSubject, firstValueFrom } from 'rxjs';


export interface Notificacao {
  id: string;
  tipo: string;
  mensagem: string;
  lida: boolean;
  dataCriacao: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = `${environment.apiUrl}/Notificacao`;


   constructor(private http: HttpClient) {
    // Inicializa o Firebase
    const app = initializeApp(environment.firebase);
    this.messaging = getMessaging(app);
  }


  getNaoLidas(): Observable<Notificacao[]> {
    return this.http.get<Notificacao[]>(`${this.apiUrl}/nao-lidas`);
  }

  getAll(): Observable<Notificacao[]> {
    return this.http.get<Notificacao[]>(this.apiUrl);
  }

  marcarLidas(): Observable<any> {
    return this.http.post(`${this.apiUrl}/marcar-lidas`, {});
  }

    private messaging: any;
  private tokenSubject = new BehaviorSubject<string>('');
  public token$ = this.tokenSubject.asObservable();


  // Solicitar permissão e registrar
  async requestPermission(userId: string): Promise<void> {
    try {
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        const token = await this.getToken();

        if (token) {
          await this.saveSubscription(userId, token);
        }
      } else {
        console.log('Permissão negada');
      }
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
    }
  }

  // Obter token FCM
  private async getToken(): Promise<string> {
    try {
      const currentToken = await getToken(this.messaging, {
        vapidKey: environment.firebase.vapidKey
      });

      if (currentToken) {
        this.tokenSubject.next(currentToken);
        return currentToken;
      } else {
        console.log('Sem token disponível. Peça permissão ao usuário.');
        return '';
      }
    } catch (error) {
      console.error('Erro ao obter token:', error);
      return '';
    }
  }

  // Salvar subscription no backend
  private async saveSubscription(userId: string, token: string): Promise<void> {
    try {
      const subscription = {
        userId: userId,
        token: token,
        device: navigator.userAgent,
        platform: 'web',
        createdAt: new Date().toISOString()
      };

      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/Notificacao/subscribe`, subscription)
      );

    } catch (error) {
      console.error('Erro ao salvar subscription:', error);
    }
  }

  // Escutar mensagens quando app está aberto
  listenForMessages(): void {
    if (!this.messaging) return;

    onMessage(this.messaging, (payload) => {

      // Mostrar notificação quando app está aberto
      if (payload.notification) {
        const notificationTitle = payload.notification.title || 'Bliteca';
        const notificationOptions: NotificationOptions = {
          body: payload.notification.body,
          icon: 'assets/icons/icon-192x192.png',
          data: payload.data || {}
        };

        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(notificationTitle, notificationOptions);
        }
      }
    });
  }

  // Cancelar subscription
  async unsubscribe(userId: string): Promise<void> {
    try {
      const token = this.tokenSubject.value;
      if (token) {
        await firstValueFrom(
          this.http.post(`${environment.apiUrl}/Notificacao/unsubscribe`, {
            userId,
            token
          })
        );
        this.tokenSubject.next('');
      }
    } catch (error) {
      console.error('Erro ao cancelar subscription:', error);
    }
  }
}
