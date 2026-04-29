import { Component, OnInit } from '@angular/core';
import { CurrencyPipe, DatePipe, NgFor, NgIf } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProfissionalService } from '../../../core/services/profissional.service';
import {
  ProfissionalPagamentoRelatorioDTO,
  ProfissionalResponseDTO
} from '../../../core/models/profissional';
import { baixarBlob } from '../../../shared/utils/file-download';

@Component({
  selector: 'app-profissional-pagamento-relatorio',
  imports: [NgIf, NgFor, CurrencyPipe, DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './profissional-pagamento-relatorio.component.html',
  styleUrl: './profissional-pagamento-relatorio.component.scss'
})
export class ProfissionalPagamentoRelatorioComponent implements OnInit {
  profissionais: ProfissionalResponseDTO[] = [];
  form!: FormGroup;
  relatorio: ProfissionalPagamentoRelatorioDTO | null = null;
  loadingProfissionais = false;
  loadingRelatorio = false;
  exportandoPdf = false;
  exportandoExcel = false;
  erro: string | null = null;

  constructor(
    private profissionalService: ProfissionalService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      profissionalId: [null, Validators.required],
      inicio: ['', Validators.required],
      fim: ['', Validators.required]
    });
    this.carregarProfissionais();
  }

  carregarProfissionais(): void {
    this.loadingProfissionais = true;
    this.profissionalService.listar(0, 100).subscribe({
      next: page => {
        this.profissionais = page.content;
        this.loadingProfissionais = false;
      },
      error: () => {
        this.erro = 'Erro ao carregar profissionais.';
        this.loadingProfissionais = false;
      }
    });
  }

  consultar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { profissionalId, inicio, fim } = this.form.value;
    if (inicio > fim) {
      this.erro = 'A data inicial deve ser menor ou igual à data final.';
      this.relatorio = null;
      return;
    }

    this.loadingRelatorio = true;
    this.erro = null;
    this.relatorio = null;
    this.profissionalService.relatorioPagamento(Number(profissionalId), inicio, fim).subscribe({
      next: relatorio => {
        this.relatorio = relatorio;
        this.loadingRelatorio = false;
      },
      error: () => {
        this.erro = 'Erro ao carregar relatório de pagamento.';
        this.loadingRelatorio = false;
      }
    });
  }

  exportarPdf(): void {
    this.exportar('pdf');
  }

  exportarExcel(): void {
    this.exportar('xlsx');
  }

  private exportar(formato: 'pdf' | 'xlsx'): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { profissionalId, inicio, fim } = this.form.value;
    if (inicio > fim) {
      this.erro = 'A data inicial deve ser menor ou igual à data final.';
      return;
    }

    const id = Number(profissionalId);
    const fallbackNomeArquivo = `relatorio-pagamento-profissional-${id}-${inicio}-${fim}.${formato}`;
    const request$ = formato === 'pdf'
      ? this.profissionalService.exportarRelatorioPagamentoProfissionalPdf(id, inicio, fim)
      : this.profissionalService.exportarRelatorioPagamentoProfissionalExcel(id, inicio, fim);

    this.setExportando(formato, true);
    this.erro = null;
    request$.subscribe({
      next: response => {
        try {
          baixarBlob(response, fallbackNomeArquivo);
        } catch {
          this.erro = `Erro ao exportar relatório em ${formato === 'pdf' ? 'PDF' : 'Excel'}.`;
        } finally {
          this.setExportando(formato, false);
        }
      },
      error: () => {
        this.erro = `Erro ao exportar relatório em ${formato === 'pdf' ? 'PDF' : 'Excel'}.`;
        this.setExportando(formato, false);
      }
    });
  }

  private setExportando(formato: 'pdf' | 'xlsx', exportando: boolean): void {
    if (formato === 'pdf') {
      this.exportandoPdf = exportando;
      return;
    }

    this.exportandoExcel = exportando;
  }
}
