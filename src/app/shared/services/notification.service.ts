import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

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

  constructor(private http: HttpClient) {}

  getNaoLidas(): Observable<Notificacao[]> {
    return this.http.get<Notificacao[]>(`${this.apiUrl}/nao-lidas`);
  }

  getAll(): Observable<Notificacao[]> {
    return this.http.get<Notificacao[]>(this.apiUrl);
  }

  marcarLidas(): Observable<any> {
    return this.http.post(`${this.apiUrl}/marcar-lidas`, {});
  }
}
