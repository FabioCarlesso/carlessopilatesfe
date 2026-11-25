import { CurrencyPipe, DatePipe } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { TomadorResponseDTO } from '../../../core/models/tomador';
import { TomadorService } from '../../../core/services/tomador.service';
import {
  RelatorioNfseFiltros,
  RelatorioNfseFormatoExportacao,
  RelatorioNfseResponseDTO
} from '../../../core/models/relatorio';
import { RelatorioService } from '../../../core/services/relatorio.service';
import { baixarBlob } from '../../../shared/utils/file-download';
import { formatCompetencia } from '../../../shared/utils/competencia-mask';
import { exibirValorGravado } from '../../../shared/utils/mascara';
import { focarPrimeiroCampo, focarPrimeiroInvalido } from '../../../shared/utils/form-focus';
import { CarregandoComponent } from '../../../shared/components/carregando/carregando.component';

@Component({
  selector: 'app-nfse-relatorio',
  imports: [CurrencyPipe, DatePipe, ReactiveFormsModule, RouterLink, CarregandoComponent],
  templateUrl: './nfse-relatorio.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './nfse-relatorio.component.scss'
})
export class NfseRelatorioComponent implements OnInit, AfterViewInit {
  form!: FormGroup;
  registros: RelatorioNfseResponseDTO[] = [];
  loadingRelatorio = false;
  exportandoCsv = false;
  exportandoExcel = false;
  consultado = false;
  erro: string | null = null;

  tomadores: TomadorResponseDTO[] = [];

  constructor(
    private relatorioService: RelatorioService,
    private fb: FormBuilder,
    private host: ElementRef<HTMLElement>,
    private tomadorService: TomadorService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      competencia: ['', [
        Validators.required,
        Validators.pattern(/^(0[1-9]|1[0-2])\/\d{4}$/)
      ]],
      notaAnteriorEmitida: [null],
      cpfNaNota: [null],
      tomadorId: [null as number | null]
    });
    // O detalhe do tomador abre o relatório já filtrado ("Ver notas deste tomador").
    const tomadorId = Number(this.route.snapshot.queryParamMap.get('tomadorId'));
    if (Number.isInteger(tomadorId) && tomadorId > 0) {
      this.form.patchValue({ tomadorId });
    }
    this.carregarTomadores();
  }

  /**
   * Ativos e inativos: um tomador inativado continua com pacientes vinculados, e as
   * notas deles seguem saindo no nome dele.
   */
  private carregarTomadores(): void {
    forkJoin([
      this.tomadorService.listar(0, 200, { ativo: true }),
      this.tomadorService.listar(0, 200, { ativo: false })
    ]).subscribe({
      next: ([ativos, inativos]) => {
        this.tomadores = [...ativos.content, ...inativos.content].sort((a, b) => a.nome.localeCompare(b.nome));
      },
      error: () => {
        this.tomadores = [];
      }
    });
  }

  ngAfterViewInit(): void {
    focarPrimeiroCampo(this.host);
  }

  formatarCompetencia(): void {
    const controle = this.form.get('competencia');
    if (!controle) return;

    const formatado = formatCompetencia(controle.value);
    if (formatado !== controle.value) {
      controle.setValue(formatado);
    }
  }

  consultar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      focarPrimeiroInvalido(this.form, this.host);
      return;
    }

    const competencia: string = this.form.value.competencia;
    this.loadingRelatorio = true;
    this.erro = null;
    this.consultado = false;
    this.registros = [];

    this.relatorioService.relatorioNfse(competencia, this.filtros()).subscribe({
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

  /** CPF ou CNPJ com máscara; "—" quando o paciente não deseja CPF na nota (a API manda nulo). */
  documento(valor: string | null): string {
    return valor ? exibirValorGravado('cpfCnpj', valor) : '—';
  }

  /** Registros que não podem ser emitidos como o paciente pediu até o cadastro ser completado. */
  totalPendencias(): number {
    return this.registros.filter(registro => !!registro.pendencia).length;
  }

  private filtros(): RelatorioNfseFiltros {
    const { notaAnteriorEmitida, cpfNaNota, tomadorId } = this.form.value;
    return { notaAnteriorEmitida, cpfNaNota, tomadorId };
  }

  private exportar(formato: RelatorioNfseFormatoExportacao): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      focarPrimeiroInvalido(this.form, this.host);
      return;
    }

    const competencia: string = this.form.value.competencia;
    const extensao = formato === 'CSV' ? 'csv' : 'xlsx';
    const fallbackNomeArquivo = `relatorio-nfse-${competencia.replace('/', '-')}.${extensao}`;

    this.setExportando(formato, true);
    this.erro = null;
    this.relatorioService.exportarRelatorioNfse(competencia, formato, this.filtros()).subscribe({
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
