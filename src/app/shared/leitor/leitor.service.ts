import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ArquivoParaAbrir {
  path: string;
  livroId: string;
  tipo: 'pdf' | 'epub';
  progressoInicial?: number;   // 🆕 0-100 (para EPUB e como fallback do PDF)
  paginaInicial?: number;      // 🆕 1-based (para PDF)
}

export interface ProgressoLeitura {
  paginaAtual?: number | null;
  totalPaginas?: number | null;
  progresso?: number | null;
}

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

  // 🆕 Assinatura atualizada (parâmetros opcionais no final)
  setArquivo(
    path: string,
    livroId: string,
    tipo: 'pdf' | 'epub',
    progressoInicial?: number,
    paginaInicial?: number
  ): void {
    this.arquivoSubject.next({
      path,
      livroId,
      tipo,
      progressoInicial,
      paginaInicial
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
