import { NgIf } from '@angular/common';
import { Component, DestroyRef, OnDestroy, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AvaliacaoFisioterapeuticaResponseDTO } from '../../../core/models/avaliacao-fisioterapeutica';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { AvaliacaoFisioterapeuticaService } from '../../../core/services/avaliacao-fisioterapeutica.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';

@Component({
  selector: 'app-paciente-avaliacao-fisioterapeutica',
  imports: [NgIf, ReactiveFormsModule, RouterLink],
  templateUrl: './paciente-avaliacao-fisioterapeutica.component.html',
  styleUrl: './paciente-avaliacao-fisioterapeutica.component.scss'
})
export class PacienteAvaliacaoFisioterapeuticaComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  pacienteId: number | null = null;
  paciente: PacienteResponseDTO | null = null;
  avaliacao: AvaliacaoFisioterapeuticaResponseDTO | null = null;
  loading = false;
  salvando = false;
  erro: string | null = null;
  sucesso: string | null = null;
  parametroInvalido = false;
  private successTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private fb: FormBuilder,
    private pacienteService: PacienteService,
    private avaliacaoService: AvaliacaoFisioterapeuticaService,
    private route: ActivatedRoute,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      dataAvaliacao: ['', Validators.required],
      queixaFuncional: ['', [Validators.required, Validators.pattern(/\S/)]],
      avaliacaoPostural: [''],
      mobilidadeArticular: [''],
      forcaMuscular: [''],
      flexibilidade: [''],
      equilibrio: [''],
      coordenacaoMotora: [''],
      padraoRespiratorio: [''],
      escalaDor: [null, [Validators.required, Validators.min(0), Validators.max(10)]],
      testesFuncionaisRealizados: [''],
      diagnosticoFisioterapeutico: ['', [Validators.required, Validators.pattern(/\S/)]],
      observacoesGerais: ['']
    });

    this.pacienteId = parseRouteNumberParam(this.route.snapshot.paramMap, 'pacienteId');
    if (this.pacienteId === null) {
      this.parametroInvalido = true;
      this.erro = 'Identificador inválido.';
      return;
    }

    this.carregar();
  }

  ngOnDestroy(): void {
    if (this.successTimer !== null) {
      clearTimeout(this.successTimer);
    }
  }

  carregar(): void {
    if (this.pacienteId === null) return;

    this.loading = true;
    this.erro = null;

    forkJoin({
      paciente: this.pacienteService.buscar(this.pacienteId),
      avaliacoes: this.avaliacaoService.listarPorPaciente(this.pacienteId)
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ paciente, avaliacoes }) => {
        this.paciente = paciente;
        this.avaliacao = avaliacoes[0] ?? null;
        if (this.avaliacao) {
          const { id, pacienteId, nomePaciente, dataCriacao, dataAtualizacao, ...formFields } = this.avaliacao;
          this.form.patchValue(formFields);
        }
        this.loading = false;
      },
      error: () => {
        this.erro = 'Erro ao carregar avaliação fisioterapêutica do paciente.';
        this.loading = false;
      }
    });
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
    this.sucesso = null;

    const valor = this.form.value;
    const opt = (v: string | null | undefined): string | null => (v?.trim() ? v.trim() : null);
    const dto = {
      dataAvaliacao: valor.dataAvaliacao,
      queixaFuncional: valor.queixaFuncional,
      avaliacaoPostural: opt(valor.avaliacaoPostural),
      mobilidadeArticular: opt(valor.mobilidadeArticular),
      forcaMuscular: opt(valor.forcaMuscular),
      flexibilidade: opt(valor.flexibilidade),
      equilibrio: opt(valor.equilibrio),
      coordenacaoMotora: opt(valor.coordenacaoMotora),
      padraoRespiratorio: opt(valor.padraoRespiratorio),
      escalaDor: Number(valor.escalaDor),
      testesFuncionaisRealizados: opt(valor.testesFuncionaisRealizados),
      diagnosticoFisioterapeutico: valor.diagnosticoFisioterapeutico,
      observacoesGerais: opt(valor.observacoesGerais)
    };

    const avaliacaoAtual = this.avaliacao;
    const criando = avaliacaoAtual === null;
    const obs = criando
      ? this.avaliacaoService.criar({ pacienteId: this.pacienteId, ...dto })
      : this.avaliacaoService.atualizar(avaliacaoAtual.id, dto);

    obs.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => {
        this.avaliacao = response;
        const { id, pacienteId, nomePaciente, dataCriacao, dataAtualizacao, ...formFields } = response;
        this.form.patchValue(formFields);
        if (this.successTimer !== null) {
          clearTimeout(this.successTimer);
        }
        this.sucesso = criando
          ? 'Avaliação fisioterapêutica cadastrada com sucesso.'
          : 'Avaliação fisioterapêutica atualizada com sucesso.';
        this.successTimer = setTimeout(() => { this.sucesso = null; }, 4000);
        this.salvando = false;
      },
      error: () => {
        this.erro = 'Erro ao salvar avaliação fisioterapêutica.';
        this.salvando = false;
      }
    });
  }

  campo(nome: string) {
    return this.form.get(nome);
  }
}
