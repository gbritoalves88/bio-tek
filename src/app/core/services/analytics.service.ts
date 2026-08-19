import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getAnalytics, logEvent, setAnalyticsCollectionEnabled } from 'firebase/analytics';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private analytics: any;

  constructor() {
    const app = initializeApp(environment.firebase);
    this.analytics = getAnalytics(app);
    setAnalyticsCollectionEnabled(this.analytics, true);
  }

  logLogin(method: string): void {
    logEvent(this.analytics, 'login', { method });
  }

  logAddBook(bookId: string): void {
    logEvent(this.analytics, 'add_book', { book_id: bookId });
  }

  logUpdateProgress(progress: number): void {
    logEvent(this.analytics, 'update_progress', { progress });
  }

  logShareReading(bookId: string): void {
    logEvent(this.analytics, 'share_reading', { book_id: bookId });
  }

  logComment(bookId: string): void {
    logEvent(this.analytics, 'comment', { book_id: bookId });
  }

  logFollowUser(userId: string): void {
    logEvent(this.analytics, 'follow_user', { user_id: userId });
  }
}
