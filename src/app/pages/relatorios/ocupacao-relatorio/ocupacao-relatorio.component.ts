import { DatePipe } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProfissionalResponseDTO } from '../../../core/models/profissional';
import { OcupacaoCelula, RelatorioOcupacaoDTO } from '../../../core/models/relatorio-ocupacao';
import { ProfissionalService } from '../../../core/services/profissional.service';
import { RelatorioService } from '../../../core/services/relatorio.service';
import { CarregandoComponent } from '../../../shared/components/carregando/carregando.component';
import { extrairMensagemErro } from '../../../shared/utils/api-error';
import { formatarIntervalo, hojeIso, somarDias } from '../../../shared/utils/calendario';
import { focarPrimeiroCampo } from '../../../shared/utils/form-focus';
import {
  FAIXA_OCUPACAO_LABEL,
  FaixaOcupacao,
  GradeOcupacao,
  faixaOcupacao,
  lotadoComEspera,
  montarGradeOcupacao
} from '../../../shared/utils/ocupacao-grade';

export const MENSAGEM_SEM_PERMISSAO_OCUPACAO =
  'Você não tem permissão para acessar a ocupação da grade.';

interface FiltrosForm {
  semana: string;
  profissionalId: number | null;
}

/**
 * Ocupação da grade semanal (issue #294): horário × dia com alunos e vagas de
 * cada profissional e a lista de espera, para orientar a venda de horários.
 * Ocupação, vagas e totais vêm prontos da API (carlessopilatesapi#235); a tela
 * só monta a grade e escolhe a cor de cada item.
 */
@Component({
  selector: 'app-ocupacao-relatorio',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, CarregandoComponent],
  templateUrl: './ocupacao-relatorio.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './ocupacao-relatorio.component.scss'
})
export class OcupacaoRelatorioComponent implements OnInit, AfterViewInit {
  readonly faixaLabel = FAIXA_OCUPACAO_LABEL;
  readonly legenda: FaixaOcupacao[] = ['livre', 'parcial', 'lotado', 'fora', 'sem-vaga'];

  form!: FormGroup;
  relatorio: RelatorioOcupacaoDTO | null = null;
  grade: GradeOcupacao | null = null;
  profissionais: ProfissionalResponseDTO[] = [];
  /** Item clicado na grade, com os alunos do horário no painel ao lado. */
  selecionada: OcupacaoCelula | null = null;
  loading = false;
  erro: string | null = null;
  erroProfissionais: string | null = null;

  constructor(
    private relatorioService: RelatorioService,
    private profissionalService: ProfissionalService,
    private fb: FormBuilder,
    private host: ElementRef<HTMLElement>
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      semana: [hojeIso()],
      profissionalId: [null as number | null]
    });
    this.carregarProfissionais();
    this.consultar();
  }

  ngAfterViewInit(): void {
    focarPrimeiroCampo(this.host);
  }

  /** Sem a lista a grade continua funcionando; só o filtro de profissional fica vazio. */
  carregarProfissionais(): void {
    this.profissionalService.listar(0, 100).subscribe({
      next: page => (this.profissionais = page.content),
      error: () => (this.erroProfissionais = 'Não foi possível carregar os profissionais para o filtro.')
    });
  }

  consultar(): void {
    const valor = this.form.value as FiltrosForm;
    this.loading = true;
    this.erro = null;
    this.selecionada = null;
    this.relatorioService
      .relatorioOcupacao({
        semana: valor.semana || hojeIso(),
        profissionalId: valor.profissionalId === null ? null : Number(valor.profissionalId)
      })
      .subscribe({
        next: relatorio => {
          this.relatorio = relatorio;
          this.grade = montarGradeOcupacao(relatorio.semana.inicio, relatorio.celulas);
          this.loading = false;
        },
        error: (err: unknown) => {
          this.relatorio = null;
          this.grade = null;
          this.erro =
            err instanceof HttpErrorResponse && err.status === 403
              ? MENSAGEM_SEM_PERMISSAO_OCUPACAO
              : extrairMensagemErro(err, 'Erro ao carregar a ocupação da grade.');
          this.loading = false;
        }
      });
  }

  /** Semana anterior (-1) ou seguinte (+1), a partir da segunda que a API devolveu. */
  navegar(direcao: -1 | 1): void {
    const base = this.relatorio?.semana.inicio ?? (this.form.value as FiltrosForm).semana ?? hojeIso();
    this.form.patchValue({ semana: somarDias(base, 7 * direcao) });
    this.consultar();
  }

  semanaAtual(): void {
    this.form.patchValue({ semana: hojeIso() });
    this.consultar();
  }

  selecionar(celula: OcupacaoCelula): void {
    this.selecionada = this.selecionada === celula ? null : celula;
  }

  fecharDetalhe(): void {
    this.selecionada = null;
  }

  faixa(celula: OcupacaoCelula): FaixaOcupacao {
    return faixaOcupacao(celula);
  }

  destacarEspera(celula: OcupacaoCelula): boolean {
    return lotadoComEspera(celula);
  }

  /** "2/3" quando a célula conta vaga; só a quantidade de alunos quando não conta. */
  resumoItem(celula: OcupacaoCelula): string {
    return celula.capacidade === null ? `${celula.ocupacao}` : `${celula.ocupacao}/${celula.capacidade}`;
  }

  /** Rótulo acessível do botão do item, com tudo o que a cor sozinha comunica. */
  rotuloItem(celula: OcupacaoCelula): string {
    const partes = [
      celula.profissional?.nome ?? 'Sem profissional',
      celula.horario ? celula.horario.slice(0, 5) : 'sem horário',
      `${celula.ocupacao} aluno(s)`
    ];
    if (celula.capacidade !== null && celula.vagas !== null) {
      partes.push(`${celula.vagas} vaga(s) de ${celula.capacidade}`);
    }
    partes.push(FAIXA_OCUPACAO_LABEL[faixaOcupacao(celula)]);
    if (celula.listaEspera > 0) {
      partes.push(`${celula.listaEspera} na lista de espera`);
    }
    return partes.join(', ');
  }

  periodo(relatorio: RelatorioOcupacaoDTO): string {
    return formatarIntervalo(relatorio.semana.inicio, relatorio.semana.fim);
  }
}
