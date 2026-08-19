import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Livro, LivroLeitura, LivroTop, DashboardData } from './home.model';
import { HomeService } from './home.service';
import { AddBookModalComponent } from '../../shared/add-book-modal/add-book-modal.component';
import { AlertService } from '../../shared/services/alert.service';
import { BottomSheetComponent } from '../../shared/bottom-sheet/bottom-sheet.component';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, AddBookModalComponent, BottomSheetComponent, FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  host: { 'ngSkipHydration': 'true' }
})
export class HomeComponent implements OnInit {
  modalAberto = false;
  livroAtual: Livro | null = null;
  listaLeitura: LivroLeitura[] = [];
  topAvaliados: LivroTop[] = [];
  carregando = true;
  bottomSheetAberto = false;
  livroSelecionado: LivroTop | LivroLeitura | null = null;
  lendoAgoraAberto = false;
  paginaAtual: number | null = null;
  totalPaginas: number | null = null;
  minutoAtual: number | null = null;
  totalMinutos: number | null = null;
  compartilhando = false;
  previewImagem = '';
  fraseAtividade = '';

  citacao = {
    texto: 'Um leitor vive mil vidas antes de morrer. O homem que nunca lê vive apenas uma.',
    autor: 'George R. R. Martin'
  };

  constructor(
    private homeService: HomeService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef,
    private alertService: AlertService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.carregarDashboard();
    }
  }

  get nickname(): string {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    return usuario?.nickname || '';
  }

  carregarDashboard(): void {
    this.carregando = true;
    this.homeService.getDashboard().subscribe({
      next: (data: DashboardData) => {
        this.livroAtual = data.livroAtual || null;
        this.listaLeitura = data.listaLeitura || [];
        this.topAvaliados = data.topAvaliados || [];
        this.carregando = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erro:', err);
        this.carregando = false;
        this.alertService.error('Erro ao carregar dados da home');
      }
    });
  }

  abrirModal(): void { this.modalAberto = true; }

  onLivroAdicionado(livro: any): void {
    this.homeService.limparCache();
    this.modalAberto = false;
    this.carregarDashboard();
    this.alertService.success('Livro adicionado com sucesso!');
  }

  abrirBottomSheet(livro: LivroTop | LivroLeitura): void {
    this.livroSelecionado = livro;
    this.bottomSheetAberto = true;
    this.cdr.markForCheck();
  }

  fecharBottomSheet(): void {
    this.bottomSheetAberto = false;
    this.livroSelecionado = null;
    this.cdr.markForCheck();
  }

  adicionarABiblioteca(livro: any): void {
    this.fecharBottomSheet();
    this.homeService.adicionarLivro({
      titulo: livro.titulo,
      autor: livro.autor,
      imagem: livro.imagem || null
    }).subscribe({
      next: () => {
        this.homeService.limparCache();
        this.carregarDashboard();
        this.alertService.success(`"${livro.titulo}" adicionado!`);
      },
      error: (err) => {
        if (err.status === 400 && err.error?.mensagem) {
          this.alertService.warning(err.error.mensagem);
        } else {
          this.alertService.error('Erro ao adicionar livro');
        }
      }
    });
  }

  fecharLendoAgora(): void {
    this.lendoAgoraAberto = false;
    this.previewImagem = '';
    this.fraseAtividade = '';
    this.cdr.markForCheck();
  }

  togglePausar(): void {
    if (!this.livroAtual) return;
    const novoEstado = !this.livroAtual.pausado;

    this.homeService.atualizarProgresso(this.livroAtual.id, {
      pausado: novoEstado
    }).subscribe({
      next: () => {
        this.homeService.limparCache();
        this.carregarDashboard();
        this.alertService.success(novoEstado ? 'Leitura pausada!' : 'Leitura retomada!');
      },
      error: (err) => {
        console.error('Erro:', err);
        this.alertService.error('Erro ao atualizar');
      }
    });
  }

  formatarMinutos(minutos: number | null | undefined): string {
    if (!minutos) return '0min';
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return horas > 0 ? `${horas}h ${mins}min` : `${mins}min`;
  }

  abrirLendoAgora(): void {
    this.lendoAgoraAberto = true;
    this.previewImagem = '';
    this.fraseAtividade = '';
    const tipo = this.livroAtual?.tipo || 'livro';

    if (tipo === 'audiobook') {
      this.minutoAtual = this.livroAtual?.minutoAtual || null;
      this.totalMinutos = this.livroAtual?.totalMinutos || null;
      this.paginaAtual = null;
      this.totalPaginas = null;
    } else {
      this.paginaAtual = this.livroAtual?.paginaAtual || null;
      this.totalPaginas = this.livroAtual?.totalPaginas || null;
      this.minutoAtual = null;
      this.totalMinutos = null;
    }

    this.cdr.markForCheck();
  }

  atualizarProgresso(): void {
    if (!this.livroAtual) return;

    const tipo = this.livroAtual.tipo || 'livro';
    let progresso: number | undefined;
    const dados: any = {};

    if (tipo === 'audiobook') {
      progresso = this.totalMinutos && this.minutoAtual
        ? Math.round((this.minutoAtual / this.totalMinutos) * 100)
        : undefined;
      if (this.minutoAtual) dados.minutoAtual = this.minutoAtual;
      if (this.totalMinutos) dados.totalMinutos = this.totalMinutos;
    } else {
      progresso = this.totalPaginas && this.paginaAtual
        ? Math.round((this.paginaAtual / this.totalPaginas) * 100)
        : undefined;
      if (this.paginaAtual) dados.paginaAtual = this.paginaAtual;
      if (this.totalPaginas) dados.totalPaginas = this.totalPaginas;
    }

    if (progresso !== undefined) dados.progresso = progresso;

    // 🆕 Se tiver frase, incluir
    if (this.fraseAtividade && this.fraseAtividade.trim()) {
      dados.frase = this.fraseAtividade.trim();
    }

    this.homeService.atualizarProgresso(this.livroAtual.id, dados).subscribe({
      next: () => {
        this.homeService.limparCache();
        this.carregarDashboard();
        this.fecharLendoAgora();
        this.fraseAtividade = ''; // 🆕 Limpar frase
        this.alertService.success('Progresso atualizado!');
      },
      error: () => this.alertService.error('Erro ao atualizar progresso')
    });
  }

  // 🆕 GERAR PREVIEW
  async gerarPreviewImagem(): Promise<void> {
    if (!this.livroAtual || this.compartilhando) return;

    this.compartilhando = true;
    this.cdr.markForCheck();

    try {
      this.previewImagem = await this.gerarImagemCompartilhamento();
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Erro:', error);
      this.alertService.error('Erro ao gerar imagem');
    } finally {
      this.compartilhando = false;
      this.cdr.markForCheck();
    }
  }

  // 🆕 COMPARTILHAR IMAGEM GERADA
  async compartilharLeitura(): Promise<void> {
    if (!this.livroAtual || this.compartilhando) return;

    this.compartilhando = true;
    this.cdr.markForCheck();

    try {
      const imagemFinal = await this.gerarImagemCompartilhamento();
      const blob = await fetch(imagemFinal).then(r => r.blob());
      const file = new File([blob], 'bliteca-leitura.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Bliteca',
          text: `📖 Estou lendo "${this.livroAtual.titulo}" no Bliteca!`,
          files: [file]
        });
      } else if (navigator.share) {
        await navigator.share({
          title: 'Bliteca',
          text: `📖 Estou lendo "${this.livroAtual.titulo}" no Bliteca! https://bliteca.com`
        });
      } else {
        const a = document.createElement('a');
        a.href = imagemFinal;
        a.download = 'bliteca-leitura.png';
        a.click();
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Erro:', error);
      }
    } finally {
      this.compartilhando = false;
      this.cdr.markForCheck();
    }
  }

  private gerarImagemCompartilhamento(): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      canvas.width = 941;
      canvas.height = 1672;
      const ctx = canvas.getContext('2d')!;

      const fundo = new Image();
      fundo.src = 'assets/compartilhamento-fundo.png';
      fundo.onload = async () => {
        // Mantém proporção
        const proporcao = Math.max(canvas.width / fundo.width, canvas.height / fundo.height);
        const fw = fundo.width * proporcao;
        const fh = fundo.height * proporcao;
        const fx = (canvas.width - fw) / 2;
        const fy = (canvas.height - fh) / 2;

        ctx.drawImage(fundo, fx, fy, fw, fh);

        const capa = new Image();
        capa.crossOrigin = 'anonymous';
        const capaBase64 = await this.baixarImagemComoBase64(
          this.livroAtual!.imagem || 'assets/capas/perfilSemFoto.png'
          );

        capa.src = capaBase64;

        capa.onload = () => {
          const capaW = 380;
          const capaH = 570;
          const capaX = (canvas.width - capaW) / 2;
          const capaY = 550;

          ctx.save();
          ctx.shadowColor = 'rgba(0,0,0,0.6)';
          ctx.shadowBlur = 25;
          ctx.shadowOffsetY = 12;
          ctx.beginPath();
          ctx.roundRect(capaX, capaY, capaW, capaH, 12);
          ctx.clip();
          ctx.drawImage(capa, capaX, capaY, capaW, capaH);
          ctx.restore();

          resolve(canvas.toDataURL('image/png'));
        };

        capa.onerror = () => {
          capa.src = 'assets/capas/perfilSemFoto.png';
        };
      };
      fundo.onerror = reject;
    });
  }

  private async baixarImagemComoBase64(url: string): Promise<string> {
    try {
      const blob = await firstValueFrom(this.homeService.baixarImagem(url));

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Erro ao baixar imagem:', error);
      return 'assets/capas/perfilSemFoto.png';
    }
  }


  async baixarImagemTeste(): Promise<void> {
    if (!this.livroAtual) return;

    try {
      const imagemFinal = await this.gerarImagemCompartilhamento();
      const a = document.createElement('a');
      a.href = imagemFinal;
      a.download = 'bliteca-teste.png';
      a.click();
      this.alertService.success('Imagem baixada!');
    } catch (error) {
      console.error('Erro:', error);
      this.alertService.error('Erro ao baixar');
    }
  }
}
