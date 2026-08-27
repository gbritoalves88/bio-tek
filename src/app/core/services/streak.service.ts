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

  getStreak(): Observable<StreakData> {
    return this.http.get<StreakData>(this.api);
  }

  getHistorico(): Observable<StreakHistorico> {
    return this.http.get<StreakHistorico>(`${this.api}/historico`);
  }

  getMetricasMes(): Observable<MetricasMes> {
    return this.http.get<MetricasMes>(`${this.api}/metricas-mes`);
  }
}
