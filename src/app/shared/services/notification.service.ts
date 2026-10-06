import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Capacitor } from '@capacitor/core';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';

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
  private messaging: any;
  private tokenSubject = new BehaviorSubject<string>('');
  public token$ = this.tokenSubject.asObservable();

  constructor(private http: HttpClient) {
    // Só inicializa Firebase JS no web
    if (!Capacitor.isNativePlatform()) {
      const app = initializeApp(environment.firebase);
      this.messaging = getMessaging(app);
    }
  }

  // ============ NOTIFICAÇÕES INTERNAS (não muda) ============

  getNaoLidas(): Observable<Notificacao[]> {
    return this.http.get<Notificacao[]>(`${this.apiUrl}/nao-lidas`);
  }

  getAll(): Observable<Notificacao[]> {
    return this.http.get<Notificacao[]>(this.apiUrl);
  }

  marcarLidas(): Observable<any> {
    return this.http.post(`${this.apiUrl}/marcar-lidas`, {});
  }

  // ============ PERMISSÃO (roteia por plataforma) ============

  async requestPermission(userId: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await this.requestPermissionNativo(userId);
    } else {
      await this.requestPermissionWeb(userId);
    }
  }

  // ============ WEB (atual) ============

  private async requestPermissionWeb(userId: string): Promise<void> {
    try {
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        const token = await this.getTokenWeb();
        if (token) {
          await this.saveSubscription(userId, token, 'web');
        }
        await this.registrarDecisao(userId, true);
      } else {
        await this.registrarDecisao(userId, false);
      }
    } catch (error) {
      console.error('Erro ao solicitar permissão web:', error);
    }
  }

  private async getTokenWeb(): Promise<string> {
    try {
      const currentToken = await getToken(this.messaging, {
        vapidKey: environment.firebase.vapidKey
      });
      if (currentToken) {
        this.tokenSubject.next(currentToken);
        return currentToken;
      }
      return '';
    } catch (error) {
      console.error('Erro ao obter token web:', error);
      return '';
    }
  }

  listenForMessages(): void {
    if (Capacitor.isNativePlatform() || !this.messaging) return;

    onMessage(this.messaging, (payload) => {
      if (payload.notification) {
        const title = payload.notification.title || 'Bliteca';
        const options: NotificationOptions = {
          body: payload.notification.body,
          icon: 'assets/icons/icon-192x192.png',
          data: payload.data || {}
        };
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(title, options);
        }
      }
    });
  }

  // ============ NATIVO (Capacitor) ============

  private async requestPermissionNativo(userId: string): Promise<void> {
    try {
      // 1. Verifica status atual
      let status = await FirebaseMessaging.checkPermissions();

      // 2. Se não autorizado, pede permissão
      if (status.receive !== 'granted') {
        status = await FirebaseMessaging.requestPermissions();
      }

      if (status.receive !== 'granted') {
        console.log('Permissão nativa negada');
        await this.registrarDecisao(userId, false);
        return;
      }

      // 3. Listener para token novo (rotação)
      await FirebaseMessaging.addListener('tokenReceived', async (event) => {
        console.log('Novo token FCM nativo:', event.token);
        await this.saveSubscription(userId, event.token, 'android');
      });

      // 4. Listener de clique na notificação
      await FirebaseMessaging.addListener('notificationActionPerformed', (event) => {
        console.log('Notificação clicada:', event);
        const url = (event.notification?.data as any)?.url as string;
        if (url) {
          window.location.href = url;
        }
      });

      // 5. Pegar token atual
      const { token } = await FirebaseMessaging.getToken();
      if (token) {
        await this.saveSubscription(userId, token, 'android');
      }

      await this.registrarDecisao(userId, true);
    } catch (error) {
      console.error('Erro ao solicitar permissão nativa:', error);
    }
  }

  // ============ SALVAR / REMOVER (comum) ============

  private async saveSubscription(userId: string, token: string, platform: string): Promise<void> {
    try {
      const subscription = {
        userId,
        token,
        device: platform === 'web' ? navigator.userAgent : 'android',
        platform,
        createdAt: new Date().toISOString()
      };

      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/Notificacao/subscribe`, subscription)
      );
    } catch (error) {
      console.error('Erro ao salvar subscription:', error);
    }
  }

  async unsubscribe(userId: string): Promise<void> {
    try {
      const token = this.tokenSubject.value;
      if (token) {
        await firstValueFrom(
          this.http.post(`${environment.apiUrl}/Notificacao/unsubscribe`, { userId, token })
        );
        this.tokenSubject.next('');
      }
    } catch (error) {
      console.error('Erro ao cancelar subscription:', error);
    }
  }

  private async registrarDecisao(userId: string, aceitou: boolean): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${this.apiUrl}/registrar-decisao`, { userId, aceitou })
      );
    } catch (error) {
      console.error('Erro ao registrar decisão:', error);
    }
  }
}
