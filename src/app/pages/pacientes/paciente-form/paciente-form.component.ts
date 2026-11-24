import { AfterViewInit, Component, ElementRef, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, of, switchMap } from 'rxjs';
import { PacienteService } from '../../../core/services/paciente.service';
import { TomadorService } from '../../../core/services/tomador.service';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';
import { focarPrimeiroCampo, focarPrimeiroInvalido } from '../../../shared/utils/form-focus';
import {
  ehConflitoConcorrencia,
  extrairMensagemErro,
  MENSAGEM_CONFLITO_CONCORRENCIA
} from '../../../shared/utils/api-error';
import { cpfValidator } from '../../../core/validators/cpf.validator';
import { MascaraDirective } from '../../../shared/directives/mascara.directive';
import { exibirValorGravado, somenteDigitos } from '../../../shared/utils/mascara';
import { CarregandoComponent } from '../../../shared/components/carregando/carregando.component';

/** Opção do seletor de tomador da nota fiscal. */
export interface TomadorOpcao {
  id: number;
  nome: string;
  cpfCnpj: string;
  /** Vinculado ao paciente mas inativado depois: aparece para não sumir da tela. */
  inativo?: boolean;
}

@Component({
  selector: 'app-paciente-form',
  imports: [ReactiveFormsModule, RouterLink, MascaraDirective, CarregandoComponent],
  templateUrl: './paciente-form.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './paciente-form.component.scss'
})
export class PacienteFormComponent implements OnInit, AfterViewInit {
  form!: FormGroup;
  isEdit = false;
  pacienteId: number | null = null;
  loading = false;
  salvando = false;
  erro: string | null = null;
  parametroInvalido = false;
  /** Versão carregada no GET: vai no PUT para a API recusar a edição se outra pessoa salvou antes. */
  private version: number | null = null;
  /** Se o paciente em edição já tinha CPF gravado (o campo fica travado). */
  private cpfGravado = false;
  /** Tomador vinculado ao carregar: o vínculo só muda por `PATCH /pacientes/{id}/tomador`, e só se a escolha mudou. */
  private tomadorOriginal: number | null = null;
  private tomadoresAtivos: TomadorOpcao[] = [];
  private vinculado: TomadorOpcao | null = null;

  constructor(
    private fb: FormBuilder,
    private service: PacienteService,
    private route: ActivatedRoute,
    private router: Router,
    private host: ElementRef<HTMLElement>,
    private tomadorService: TomadorService
  ) {}

  /** Tomadores ativos, mais o vinculado ao paciente se ele foi inativado depois do vínculo. */
  get tomadores(): TomadorOpcao[] {
    const vinculado = this.vinculado;
    if (vinculado && !this.tomadoresAtivos.some(t => t.id === vinculado.id)) {
      return [...this.tomadoresAtivos, { ...vinculado, inativo: true }];
    }
    return this.tomadoresAtivos;
  }

  documento(cpfCnpj: string): string {
    return exibirValorGravado('cpfCnpj', cpfCnpj);
  }

  ngAfterViewInit(): void {
    if (!this.isEdit) focarPrimeiroCampo(this.host);
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      nome: ['', [Validators.required, Validators.minLength(3)]],
      // E-mail e CPF são opcionais na API: a importação do seufisio trouxe
      // pacientes sem eles, e o formulário não pode impedir de editá-los (#286).
      email: ['', [Validators.email]],
      cpf: ['', [cpfValidator]],
      telefone: [''],
      dataNascimento: [''],
      endereco: this.fb.group({
        logradouro: [''],
        numero: [''],
        bairro: [''],
        cidade: [''],
        uf: [''],
        cep: ['']
      }),
      notaFiscal: this.fb.group({
        cpfNaNota: [false],
        tomadorId: [null as number | null]
      })
    });
    this.carregarTomadores();

    const rawId = this.route.snapshot.paramMap.get('id');
    if (rawId === null) return;

    this.pacienteId = parseRouteNumberParam(this.route.snapshot.paramMap, 'id');
    if (this.pacienteId === null) {
      this.parametroInvalido = true;
      this.erro = 'Identificador inválido.';
      return;
    }

    this.isEdit = true;
    this.loading = true;
    this.service.buscar(this.pacienteId).subscribe({
      next: p => {
        this.form.patchValue(p);
        this.form.get('notaFiscal')?.patchValue({ cpfNaNota: p.cpfNaNota ?? false, tomadorId: p.tomadorId ?? null });
        this.tomadorOriginal = p.tomadorId ?? null;
        if (p.tomadorId != null && p.tomadorCpfCnpj != null) {
          this.vinculado = { id: p.tomadorId, nome: p.tomadorNome ?? '', cpfCnpj: p.tomadorCpfCnpj };
        }
        this.version = p.version;
        this.cpfGravado = !!p.cpf;
        // Só trava o CPF de quem já tem um; sem CPF, o campo fica aberto para completar o cadastro.
        if (this.cpfGravado) this.form.get('cpf')?.disable();
        this.loading = false;
      },
      error: () => {
        this.erro = 'Erro ao carregar paciente.';
        this.loading = false;
      }
    });
  }

  salvar(): void {
    if (this.parametroInvalido) {
      this.erro = 'Identificador inválido.';
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      focarPrimeiroInvalido(this.form, this.host);
      return;
    }
    this.salvando = true;
    this.erro = null;
    const valor = this.form.getRawValue();

    // Só dígitos, o formato único de envio (ver `shared/utils/mascara.ts`). A
    // máscara já entrega assim; normalizar aqui garante o contrato mesmo que o
    // valor chegue ao controle por outro caminho. Vazios não vão: na edição,
    // ausente mantém o valor gravado, e a API não aceita CPF ou e-mail em branco.
    const email = texto(valor.email) || undefined;
    const cpf = somenteDigitos(valor.cpf) || undefined;
    const cpfNaNota = !!valor.notaFiscal.cpfNaNota;
    const tomadorId: number | null = valor.notaFiscal.tomadorId ?? null;

    const obs: Observable<unknown> = this.isEdit && this.pacienteId !== null
      ? this.service.atualizar(this.pacienteId, {
          nome: valor.nome,
          email,
          cpf: this.cpfGravado ? undefined : cpf,
          telefone: valor.telefone,
          dataNascimento: valor.dataNascimento,
          endereco: valor.endereco,
          cpfNaNota,
          version: this.version
        }).pipe(switchMap(salvo => this.atualizarTomador(salvo, cpfNaNota, tomadorId)))
      : this.service.cadastrar({
          nome: valor.nome,
          email,
          cpf,
          telefone: somenteDigitos(valor.telefone),
          dataNascimento: valor.dataNascimento,
          endereco: { ...valor.endereco, cep: somenteDigitos(valor.endereco.cep) },
          cpfNaNota,
          tomadorId: cpfNaNota ? tomadorId : null
        });

    obs.subscribe({
      next: () => this.router.navigate(['/pacientes']),
      error: (err: unknown) => {
        this.erro = this.mensagemErro(err);
        this.salvando = false;
      }
    });
  }

  /**
   * Depois do PUT, ajusta o vínculo do tomador só se a escolha mudou. Com "CPF na
   * nota" desmarcado, o vínculo fica como estava: o tomador é ignorado na nota, mas
   * não se perde, e volta a valer se a opção for marcada de novo.
   */
  private atualizarTomador(
    salvo: PacienteResponseDTO,
    cpfNaNota: boolean,
    tomadorId: number | null
  ): Observable<PacienteResponseDTO> {
    if (!cpfNaNota || this.pacienteId === null || tomadorId === this.tomadorOriginal) {
      return of(salvo);
    }
    return this.service.vincularTomador(this.pacienteId, tomadorId);
  }

  private carregarTomadores(): void {
    // Lista curta (responsáveis e empresas): uma página basta. Sem a lista, o seletor
    // fica só com "O próprio paciente" e o restante do formulário segue funcionando.
    this.tomadorService.listar(0, 200, { ativo: true }).subscribe({
      next: pagina => {
        this.tomadoresAtivos = pagina.content.map(t => ({ id: t.id, nome: t.nome, cpfCnpj: t.cpfCnpj }));
      },
      error: () => {
        this.tomadoresAtivos = [];
      }
    });
  }

  /**
   * `400`, `409` (CPF ou e-mail de outro paciente) e `422` (tomador inativo) trazem
   * a mensagem da API, que diz o que corrigir.
   */
  private mensagemErro(err: unknown): string {
    if (ehConflitoConcorrencia(err)) return MENSAGEM_CONFLITO_CONCORRENCIA;
    if (err instanceof HttpErrorResponse && [400, 409, 422].includes(err.status)) {
      return extrairMensagemErro(err, 'Erro ao salvar paciente.');
    }
    return 'Erro ao salvar paciente.';
  }

  campo(nome: string): AbstractControl | null {
    return this.form.get(nome);
  }
}

function texto(valor: string | null | undefined): string {
  return (valor ?? '').trim();
}
