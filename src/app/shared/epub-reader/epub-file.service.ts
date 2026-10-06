import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EpubFileService {
  // 🆕 Guarda o File do EPUB que o usuário escolheu
  private arquivoSubject = new BehaviorSubject<File | null>(null);
  public arquivo$ = this.arquivoSubject.asObservable();

  // 🆕 Guarda o ID do livro que está sendo lido
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
