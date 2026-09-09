import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LivroService } from './livro.service';
import { AlertService } from '../services/alert.service';
import { BottomSheetComponent } from '../bottom-sheet/bottom-sheet.component';
import { LivroDetalhesInterno } from './livro.model';
import { AmazonService } from '../services/amazon.service';

@Component({
  selector: 'app-livro',
  standalone: true,
  imports: [CommonModule, FormsModule, BottomSheetComponent],
  templateUrl: './livro.component.html',
  styleUrl: './livro.component.scss',
  host: { 'ngSkipHydration': 'true' }
})
export class LivroComponent implements OnInit {
  livro: any = null;
  detalhes: LivroDetalhesInterno | null = null;
  editavel = false;
  carregandoDetalhes = true;
  adicionando = false;
  linkAmazon: string | null = null;

  // Bottom Sheet pós-adicionar
  modalPosAdicionar = false;
  tipoSelecionado = 'livro';
  statusSelecionado = 1;
  livroAdicionado: any = null;

  // Edição
  modalEdicaoAberto = false;
  livroEditando: any = null;

  // Remover
  modalRemoverAberto = false;

  constructor(
    private router: Router,
    private location: Location,
    private livroService: LivroService,
    private alertService: AlertService,
    private amazonService: AmazonService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
      const state = history.state as any;

      if (state?.livro) {
        this.livro = state.livro;
        this.editavel = state.editavel || false;
        this.gerarLinkAmazon(); // 🆕
        this.carregarDetalhes(state.livro.id);
      } else {
        this.voltar();
      }
  }


  gerarLinkAmazon(): void {
    this.linkAmazon = this.amazonService.gerarLinkCompleto(this.livro);
  }

  // 🆕 Registrar clique no link Amazon
  registrarCliqueAmazon(): void {
    console.log('Clique Amazon:', {
      livroId: this.livro?.id,
      titulo: this.livro?.titulo,
      codigoBarras: this.livro?.codigoBarras || null
    });
    // Futuro: integrar com analytics
    // this.analyticsService.logEvent('amazon_click', { ... });
  }


  carregarDetalhes(id: string): void {
    this.carregandoDetalhes = true;

    this.livroService.getDetalhesInterno(id).subscribe({
      next: (detalhes) => {
        this.detalhes = detalhes;
        this.carregandoDetalhes = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.carregandoDetalhes = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ============ ADICIONAR À BIBLIOTECA ============
  adicionarABiblioteca(): void {
    if (!this.livro || this.adicionando) return;

    this.adicionando = true;

    // CORREÇÃO: Usar this.livro (não this.livroEditando)
    const dadosParaAdicionar = {
      titulo: this.livro.titulo,
      autor: this.livro.autor,
      descricao: this.livro.descricao || '',
      imagem: this.livro.imagem || null,
      codigoBarras: this.livro.codigoBarras || null
    };

    this.livroService.adicionarABiblioteca(dadosParaAdicionar).subscribe({
      next: (livroCriado) => {
        this.adicionando = false;
        this.livroAdicionado = livroCriado;

        // Inicializa os valores para os dropdowns
        this.tipoSelecionado = livroCriado.tipo || 'livro';
        this.statusSelecionado = livroCriado.status || 1;

        // Abre o bottom sheet de configuração
        this.modalPosAdicionar = true;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.adicionando = false;
        if (err.status === 400 && err.error?.mensagem) {
          this.alertService.warning(err.error.mensagem);
        } else {
          this.alertService.error('Erro ao adicionar livro');
        }
        this.cdr.markForCheck();
      }
    });
  }

  salvarPosAdicionar(): void {
    if (!this.livroAdicionado) return;

    // Usa os valores dos dropdowns
    const dados: any = {
      tipo: this.tipoSelecionado,
      status: this.statusSelecionado,
      titulo: this.livro.titulo,
      autor: this.livro.autor,
      descricao: this.livro.descricao || '',
      imagem: this.livro.imagem || null,
      codigoBarras: this.livro.codigoBarras || null
    };


    // Atualiza o livro recém-criado com as configurações
    this.livroService.atualizarLivro(this.livroAdicionado.id, dados).subscribe({
      next: () => {
        this.modalPosAdicionar = false;
        this.livroAdicionado = null;
        this.alertService.success('Livro configurado!');
        this.location.back();
      },
      error: () => {
        this.alertService.error('Erro ao salvar configurações');
      }
    });
  }

  abrirAlterarStatus(): void {
    this.livroEditando = { ...this.livro };
    this.modalEdicaoAberto = true;
    this.cdr.markForCheck();
  }


  fecharModalPosAdicionar(): void {
    this.modalPosAdicionar = false;
    this.livroAdicionado = null;
    // Limpa os valores
    this.tipoSelecionado = 'livro';
    this.statusSelecionado = 1;
    this.router.navigate(['/inicio']);
  }

  // ============ EDITAR ============
  editarLivro(): void {
    this.livroEditando = { ...this.livro };
    this.modalEdicaoAberto = true;
    this.cdr.markForCheck();
  }

  fecharEdicao(): void {
    this.modalEdicaoAberto = false;
    this.livroEditando = null;
    this.cdr.markForCheck();
  }

  salvarEdicao(): void {
    if (!this.livroEditando) return;

    const dados: any = {
      titulo: this.livroEditando.titulo,
      autor: this.livroEditando.autor,
      descricao: this.livroEditando.descricao,
      imagem: this.livroEditando.imagem,
      status: this.livroEditando.status,
      tipo: this.livroEditando.tipo || 'livro'
    };

    this.livroService.atualizarLivro(this.livroEditando.id, dados).subscribe({
      next: () => {
        this.livro = { ...this.livro, ...dados };
        this.fecharEdicao();
        this.alertService.success('Livro atualizado!');
        this.cdr.markForCheck();
      },
      error: () => {
        this.alertService.error('Erro ao atualizar livro');
      }
    });
  }

  // ============ REMOVER ============
  removerLivro(): void {
    this.modalRemoverAberto = true;
  }

  fecharRemover(): void {
    this.modalRemoverAberto = false;
  }

  confirmarRemover(): void {
    if (!this.livro) return;

    this.livroService.deletarLivro(this.livro.id).subscribe({
      next: () => {
        this.modalRemoverAberto = false;
        this.alertService.success('Livro removido!');
        this.router.navigate(['/inicio']);
      },
      error: () => {
        this.alertService.error('Erro ao remover livro');
      }
    });
  }

  // ============ OUTROS ============
  voltar(): void {
    this.location.back();
  }

  getStatusTexto(status: number): string {
    switch (status) {
      case 1: return 'Quero ler';
      case 2: return 'Lendo';
      case 3: return 'Lido';
      default: return 'Quero ler';
    }
  }

  getTipoTexto(tipo: string): string {
    return tipo === 'audiobook' ? 'Audiobook' : 'Livro';
  }

  formatarMinutos(minutos: number): string {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return horas > 0 ? `${horas}h ${mins}min` : `${mins}min`;
  }
}
