import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ArquivoParaAbrir, ProgressoLeitura } from './leitor.model'; // Ajuste o caminho se necessário

@Injectable({
  providedIn: 'root'
})
export class LeitorService {
  private arquivoSubject = new BehaviorSubject<ArquivoParaAbrir | null>(null);
  public arquivo$ = this.arquivoSubject.asObservable();

  private progressoSubject = new BehaviorSubject<ProgressoLeitura | null>(null);
  public progresso$ = this.progressoSubject.asObservable();

  private arquivoInacessivelSubject = new BehaviorSubject<boolean>(false);
  public arquivoInacessivel$ = this.arquivoInacessivelSubject.asObservable();

  setArquivo(
    path: string,
    livroId: string,
    tipo: 'pdf' | 'epub',
    progressoInicial?: number,
    paginaInicial?: number,
    cfiInicial?: string,
    tituloLivro?: string // 🆕
  ): void {
    this.arquivoSubject.next({
      path,
      livroId,
      tipo,
      progressoInicial,
      paginaInicial,
      cfiInicial,
      tituloLivro
    });
  }

  getArquivo(): ArquivoParaAbrir | null {
    return this.arquivoSubject.value;
  }

  emitirProgresso(progresso: ProgressoLeitura): void {
    this.progressoSubject.next(progresso);
  }

  emitirArquivoInacessivel(): void {
    this.arquivoInacessivelSubject.next(true);
  }

  limparProgresso(): void {
    this.progressoSubject.next(null);
  }

  limparArquivoInacessivel(): void {
    this.arquivoInacessivelSubject.next(false);
  }

  limpar(): void {
    this.arquivoSubject.next(null);
  }
}
