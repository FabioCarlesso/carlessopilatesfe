import { CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { Component, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { NotaFiscalEmitidaResponseDTO } from '../../../core/models/nfse-emitida';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { NfseEmitidaService } from '../../../core/services/nfse-emitida.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';
import { extrairMensagemErro } from '../../../shared/utils/api-error';
import { LocalDatePipe } from '../../../shared/pipes/local-date.pipe';

@Component({
  selector: 'app-paciente-nfse-emitida-list',
  imports: [NgIf, NgFor, CurrencyPipe, LocalDatePipe, RouterLink, BreadcrumbComponent],
  templateUrl: './paciente-nfse-emitida-list.component.html',
  styleUrl: './paciente-nfse-emitida-list.component.scss'
})
export class PacienteNfseEmitidaListComponent implements OnInit {
  pacienteId: number | null = null;
  paciente: PacienteResponseDTO | null = null;
  notas: NotaFiscalEmitidaResponseDTO[] = [];
  loading = false;
  erro: string | null = null;

  constructor(
    private nfseEmitidaService: NfseEmitidaService,
    private pacienteService: PacienteService,
    private route: ActivatedRoute,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.pacienteId = parseRouteNumberParam(this.route.snapshot.paramMap, 'pacienteId');
    if (this.pacienteId === null) {
      this.erro = 'Identificador inválido.';
      return;
    }
    this.carregar();
  }

  get ultimaNota(): NotaFiscalEmitidaResponseDTO | null {
    return this.notas.length > 0 ? this.notas[0] : null;
  }

  carregar(): void {
    if (this.pacienteId === null) return;

    this.loading = true;
    this.erro = null;

    this.pacienteService.buscar(this.pacienteId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: paciente => {
          this.paciente = paciente;
          this.carregarNotas();
        },
        error: err => {
          this.erro = extrairMensagemErro(err, 'Erro ao carregar dados do paciente.');
          this.loading = false;
        }
      });
  }

  private carregarNotas(): void {
    if (this.pacienteId === null) return;

    this.nfseEmitidaService.listarPorPaciente(this.pacienteId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: notas => {
          this.notas = [...notas].sort((a, b) =>
            b.dataEmissao.localeCompare(a.dataEmissao) || b.id - a.id
          );
          this.loading = false;
        },
        error: err => {
          this.erro = extrairMensagemErro(err, 'Erro ao carregar NFSEs emitidas.');
          this.loading = false;
        }
      });
  }
}
