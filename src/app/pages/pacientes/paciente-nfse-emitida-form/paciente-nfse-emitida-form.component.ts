import { NgIf } from '@angular/common';
import { Component, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NotaFiscalEmitidaRequestDTO } from '../../../core/models/nfse-emitida';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { NfseEmitidaService } from '../../../core/services/nfse-emitida.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';

@Component({
  selector: 'app-paciente-nfse-emitida-form',
  imports: [NgIf, ReactiveFormsModule, RouterLink],
  templateUrl: './paciente-nfse-emitida-form.component.html',
  styleUrl: './paciente-nfse-emitida-form.component.scss'
})
export class PacienteNfseEmitidaFormComponent implements OnInit {
  form!: FormGroup;
  pacienteId: number | null = null;
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
    if (this.pacienteId === null) {
      this.parametroInvalido = true;
      this.erro = 'Identificador inválido.';
      return;
    }

    this.carregar();
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
          this.loading = false;
        },
        error: () => {
          this.erro = 'Erro ao carregar dados do paciente.';
          this.parametroInvalido = true;
          this.loading = false;
        }
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

    const dto: NotaFiscalEmitidaRequestDTO = {
      pacienteId: this.pacienteId,
      competencia: valor.competencia,
      dataEmissao: valor.dataEmissao,
      numeroNota: opt(valor.numeroNota),
      valor: valor.valor != null && valor.valor !== '' ? +valor.valor : null,
      observacoes: opt(valor.observacoes)
    };

    this.nfseEmitidaService.salvar(dto)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.router.navigate(['/pacientes', this.pacienteId, 'nfse-emitidas']),
        error: () => {
          this.erro = 'Erro ao registrar NFSE emitida.';
          this.salvando = false;
        }
      });
  }
}
