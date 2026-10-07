import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LeitorService {
  private arquivoSubject = new BehaviorSubject<File | null>(null);
  public arquivo$ = this.arquivoSubject.asObservable();

  private livroIdSubject = new BehaviorSubject<string>('');
  public livroId$ = this.livroIdSubject.asObservable();

  setArquivo(file: File, livroId: string): void {
    this.arquivoSubject.next(file);
    this.livroIdSubject.next(livroId);
  }

  getArquivo(): File | null {
    return this.arquivoSubject.value;
  }

  getLivroId(): string {
    return this.livroIdSubject.value;
  }

  limpar(): void {
    this.arquivoSubject.next(null);
    this.livroIdSubject.next('');
  }
}
