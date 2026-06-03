import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { DashboardData } from './home.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class HomeService {
  private homeApiUrl = `${environment.apiUrl}/Home`;

  private dashboardCache$: Observable<DashboardData> | null = null;

  constructor(private http: HttpClient) {}

  getDashboard(): Observable<DashboardData> {
    if (!this.dashboardCache$) {
      this.dashboardCache$ = this.http.get<DashboardData>(`${this.homeApiUrl}/dashboard`).pipe(
        shareReplay(1)
      );
    }
    return this.dashboardCache$;
  }

  limparCache(): void {
    this.dashboardCache$ = null;
  }
}
