import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AulaService } from '../../../core/services/aula.service';
import { PagamentoService } from '../../../core/services/pagamento.service';
import { ProfissionalService } from '../../../core/services/profissional.service';
import { AulaResponseDTO } from '../../../core/models/plano';
import { ProfissionalResponseDTO } from '../../../core/models/profissional';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';

@Component({
  selector: 'app-aula-list',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './aula-list.component.html',
  styleUrl: './aula-list.component.scss'
})
export class AulaListComponent implements OnInit {
  pacienteId: number | null = null;
  pagamentoId: number | null = null;
  aulas: AulaResponseDTO[] = [];
  profissionais: ProfissionalResponseDTO[] = [];
  profissionalSelecionadoPorAula: Record<number, number | null> = {};
  loading = false;
  erro: string | null = null;
  titulo = 'Aulas';

  constructor(
    private service: AulaService,
    private pagamentoService: PagamentoService,
    private profissionalService: ProfissionalService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const rawPacienteId = this.route.snapshot.paramMap.get('pacienteId');
    const rawPagamentoId = this.route.snapshot.paramMap.get('pagamentoId');

    this.pacienteId = parseRouteNumberParam(this.route.snapshot.paramMap, 'pacienteId');
    this.pagamentoId = parseRouteNumberParam(this.route.snapshot.paramMap, 'pagamentoId');
    this.titulo = this.pagamentoId !== null ? 'Aulas do Pagamento' : 'Aulas do Paciente';

    if ((rawPacienteId !== null && this.pacienteId === null) || (rawPagamentoId !== null && this.pagamentoId === null)) {
      this.erro = 'Identificador inválido.';
      return;
    }

    if (this.pacienteId === null && this.pagamentoId === null) {
      this.erro = 'Identificador inválido.';
      return;
    }

    this.carregarProfissionais();

    if (this.pagamentoId !== null) {
      this.loading = true;
      this.erro = null;
      this.pagamentoService.buscar(this.pagamentoId).subscribe({
        next: pagamento => {
          this.pacienteId = pagamento.pacienteId;
          this.carregar();
        },
        error: () => {
          this.erro = 'Erro ao carregar dados do pagamento.';
          this.loading = false;
        }
      });
    } else {
      this.carregar();
    }
  }

  carregarProfissionais(): void {
    this.profissionalService.listar(0, 100).subscribe({
      next: page => {
        this.profissionais = page.content;
      },
      error: () => {
        this.erro = 'Erro ao carregar profissionais.';
      }
    });
  }

  carregar(): void {
    if (this.pacienteId === null && this.pagamentoId === null) {
      this.erro = 'Identificador inválido.';
      return;
    }
    this.loading = true;
    this.erro = null;
    const request$ = this.pagamentoId !== null
      ? this.service.listarPorPagamento(this.pagamentoId)
      : this.service.listarPorPaciente(this.pacienteId!);

    request$.subscribe({
      next: aulas => {
        this.aulas = aulas;
        this.profissionalSelecionadoPorAula = aulas.reduce<Record<number, number | null>>((acc, aula) => {
          acc[aula.id] = aula.profissionalId ?? null;
          return acc;
        }, {});
        this.loading = false;
      },
      error: () => {
        this.erro = 'Erro ao carregar aulas.';
        this.loading = false;
      }
    });
  }

  realizar(id: number): void {
    const profissionalId = this.profissionalSelecionadoPorAula[id];
    if (!profissionalId) {
      this.erro = 'Selecione um profissional para marcar a aula como realizada.';
      return;
    }

    this.service.realizar(id, profissionalId).subscribe({
      next: () => this.carregar(),
      error: () => (this.erro = 'Erro ao marcar aula como realizada.')
    });
  }
}
