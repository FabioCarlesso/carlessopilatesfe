import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RelatorioNfseFormatoExportacao, RelatorioNfseResponseDTO } from '../../../core/models/relatorio';
import { RelatorioService } from '../../../core/services/relatorio.service';
import { baixarBlob } from '../../../shared/utils/file-download';

@Component({
  selector: 'app-nfse-relatorio',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './nfse-relatorio.component.html',
  styleUrl: './nfse-relatorio.component.scss'
})
export class NfseRelatorioComponent implements OnInit {
  form!: FormGroup;
  registros: RelatorioNfseResponseDTO[] = [];
  loadingRelatorio = false;
  exportandoCsv = false;
  exportandoExcel = false;
  consultado = false;
  erro: string | null = null;

  constructor(
    private relatorioService: RelatorioService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      competencia: ['', [
        Validators.required,
        Validators.pattern(/^(0[1-9]|1[0-2])\/\d{4}$/)
      ]],
      notaAnteriorEmitida: [null]
    });
  }

  consultar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { competencia, notaAnteriorEmitida } = this.form.value;
    this.loadingRelatorio = true;
    this.erro = null;
    this.consultado = false;
    this.registros = [];

    this.relatorioService.relatorioNfse(competencia, notaAnteriorEmitida).subscribe({
      next: registros => {
        this.registros = registros;
        this.consultado = true;
        this.loadingRelatorio = false;
      },
      error: () => {
        this.erro = 'Erro ao carregar relatório de emissão de NFSEs.';
        this.loadingRelatorio = false;
      }
    });
  }

  exportarCsv(): void {
    this.exportar('CSV');
  }

  exportarExcel(): void {
    this.exportar('XLSX');
  }

  totalValorPago(): number {
    return this.registros.reduce((total, registro) => total + registro.valorPago, 0);
  }

  private exportar(formato: RelatorioNfseFormatoExportacao): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { competencia, notaAnteriorEmitida } = this.form.value;
    const extensao = formato === 'CSV' ? 'csv' : 'xlsx';
    const fallbackNomeArquivo = `relatorio-nfse-${competencia.replace('/', '-')}.${extensao}`;

    this.setExportando(formato, true);
    this.erro = null;
    this.relatorioService.exportarRelatorioNfse(competencia, formato, notaAnteriorEmitida).subscribe({
      next: response => {
        try {
          baixarBlob(response, fallbackNomeArquivo);
        } catch {
          this.erro = `Erro ao exportar relatório em ${formato === 'CSV' ? 'CSV' : 'Excel'}.`;
        } finally {
          this.setExportando(formato, false);
        }
      },
      error: () => {
        this.erro = `Erro ao exportar relatório em ${formato === 'CSV' ? 'CSV' : 'Excel'}.`;
        this.setExportando(formato, false);
      }
    });
  }

  private setExportando(formato: RelatorioNfseFormatoExportacao, exportando: boolean): void {
    if (formato === 'CSV') {
      this.exportandoCsv = exportando;
      return;
    }

    this.exportandoExcel = exportando;
  }
}
