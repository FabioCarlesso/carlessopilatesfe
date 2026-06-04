import { NgIf } from '@angular/common';
import { Component, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { NotaFiscalEmitidaRequestDTO, NotaFiscalEmitidaResponseDTO } from '../../../core/models/nfse-emitida';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { NfseEmitidaService } from '../../../core/services/nfse-emitida.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';
import { extrairMensagemErro } from '../../../shared/utils/api-error';

@Component({
  selector: 'app-paciente-nfse-emitida-form',
  imports: [NgIf, ReactiveFormsModule, RouterLink],
  templateUrl: './paciente-nfse-emitida-form.component.html',
  styleUrl: './paciente-nfse-emitida-form.component.scss'
})
export class PacienteNfseEmitidaFormComponent implements OnInit {
  form!: FormGroup;
  pacienteId: number | null = null;
  nfseId: number | null = null;
  paciente: PacienteResponseDTO | null = null;
  loading = false;
  salvando = false;
  erro: string | null = null;
  parametroInvalido = false;

  constructor(
    private fb: FormBuilder,
    private pacienteService: PacienteService,
    private nfseEmitidaService: NfseEmitidaService,
    private route: ActivatedRoute,
    private router: Router,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      competencia: ['', [
        Validators.required,
        Validators.pattern(/^(0[1-9]|1[0-2])\/\d{4}$/)
      ]],
      dataEmissao: ['', Validators.required],
      numeroNota: ['', Validators.maxLength(60)],
      valor: [null, Validators.min(0)],
      observacoes: ['']
    });

    this.pacienteId = parseRouteNumberParam(this.route.snapshot.paramMap, 'pacienteId');
    this.nfseId = parseRouteNumberParam(this.route.snapshot.paramMap, 'id');

    if (this.pacienteId === null || (this.route.snapshot.paramMap.has('id') && this.nfseId === null)) {
      this.parametroInvalido = true;
      this.erro = 'Identificador inválido.';
      return;
    }

    this.carregar();
  }

  get modoEdicao(): boolean {
    return this.nfseId !== null;
  }

  carregar(): void {
    if (this.pacienteId === null) return;

    this.loading = true;
    this.erro = null;

    const paciente$ = this.pacienteService.buscar(this.pacienteId);
    // O backend não expõe busca de NFSE por ID; em modo de edição a nota é
    // localizada na listagem do paciente, que também valida o vínculo.
    const notas$ = this.nfseId !== null
      ? this.nfseEmitidaService.listarPorPaciente(this.pacienteId)
      : of(null);

    forkJoin({ paciente: paciente$, notas: notas$ })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ paciente, notas }) => {
          this.paciente = paciente;

          if (this.nfseId !== null) {
            const nota = (notas ?? []).find(n => n.id === this.nfseId);
            if (!nota) {
              this.parametroInvalido = true;
              this.erro = 'NFSE emitida não encontrada para o paciente informado.';
              this.loading = false;
              return;
            }
            this.preencherFormulario(nota);
          }

          this.loading = false;
        },
        error: err => {
          this.erro = extrairMensagemErro(err, 'Erro ao carregar dados da NFSE emitida.');
          this.parametroInvalido = true;
          this.loading = false;
        }
      });
  }

  private preencherFormulario(nota: NotaFiscalEmitidaResponseDTO): void {
    this.form.patchValue({
      competencia: nota.competencia,
      dataEmissao: nota.dataEmissao,
      numeroNota: nota.numeroNota ?? '',
      valor: nota.valor ?? null,
      observacoes: nota.observacoes ?? ''
    });
  }

  campo(nome: string) {
    return this.form.get(nome);
  }

  salvar(): void {
    if (this.parametroInvalido || this.pacienteId === null) {
      this.erro = 'Identificador inválido.';
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.salvando = true;
    this.erro = null;

    const valor = this.form.value;
    const opt = (v: string | null | undefined): string | null => (v?.trim() ? v.trim() : null);
    const numero = valor.valor != null && valor.valor !== '' ? Number(valor.valor) : null;

    const dto: NotaFiscalEmitidaRequestDTO = {
      pacienteId: this.pacienteId,
      competencia: valor.competencia,
      dataEmissao: valor.dataEmissao,
      numeroNota: opt(valor.numeroNota),
      valor: numero != null && Number.isFinite(numero) ? numero : null,
      observacoes: opt(valor.observacoes)
    };

    this.nfseEmitidaService.salvar(dto)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.router.navigate(['/pacientes', this.pacienteId, 'nfse-emitidas']),
        error: err => {
          this.erro = extrairMensagemErro(err, 'Erro ao registrar NFSE emitida.');
          this.salvando = false;
        }
      });
  }
}
