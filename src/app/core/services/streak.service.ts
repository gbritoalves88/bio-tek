import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MetricasMes, StreakData, StreakHistorico } from '../../features/perfil/perfil.model';

@Injectable({
  providedIn: 'root'
})
export class StreakService {
  private api = `${environment.apiUrl}/Streak`;

  constructor(private http: HttpClient) {}

  // 🆕 Aceita usuarioId opcional
  getStreak(usuarioId?: string): Observable<StreakData> {
    if (usuarioId) {
      return this.http.get<StreakData>(`${this.api}/usuario/${usuarioId}`);
    }
    return this.http.get<StreakData>(this.api);
  }

  getHistorico(usuarioId?: string): Observable<StreakHistorico> {
    if (usuarioId) {
      return this.http.get<StreakHistorico>(`${this.api}/usuario/${usuarioId}/historico`);
    }
    return this.http.get<StreakHistorico>(`${this.api}/historico`);
  }

  getMetricasMes(usuarioId?: string): Observable<MetricasMes> {
    if (usuarioId) {
      return this.http.get<MetricasMes>(`${this.api}/usuario/${usuarioId}/metricas-mes`);
    }
    return this.http.get<MetricasMes>(`${this.api}/metricas-mes`);
  }
}
