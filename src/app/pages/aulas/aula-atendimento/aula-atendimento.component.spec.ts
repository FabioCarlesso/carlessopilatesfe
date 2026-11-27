import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { AtendimentoResponseDTO } from '../../../core/models/atendimento';
import { EvolucaoSessaoResponseDTO } from '../../../core/models/evolucao-sessao';
import { AulaResponseDTO } from '../../../core/models/plano';
import { ProfissionalPage, ProfissionalResponseDTO } from '../../../core/models/profissional';
import { SessaoResponseDTO } from '../../../core/models/sessao';
import { AulaService } from '../../../core/services/aula.service';
import { EvolucaoSessaoService } from '../../../core/services/evolucao-sessao.service';
import { ProfissionalService } from '../../../core/services/profissional.service';
import { MENSAGEM_CONFLITO_CONCORRENCIA } from '../../../shared/utils/api-error';
import { conflitoConcorrencia } from '../../../../testing/conflito';
import { provideLocalePtBr } from '../../../../testing/locale';
import { AulaAtendimentoComponent } from './aula-atendimento.component';

const aulaPendente: AulaResponseDTO = {
  id: 21,
  pacienteId: 10,
  pacienteNome: 'Ana Silva',
  pagamentoId: 1,
  data: '2026-11-18',
  horario: '08:00:00',
  realizada: false,
  profissionalId: 5,
  profissionalNome: 'Paula Mendes',
  feriado: false,
  sessaoId: null,
  temEvolucao: false
};

const sessao: SessaoResponseDTO = {
  version: 0,
  id: 40,
  pacienteId: 10,
  nomePaciente: 'Ana Silva',
  dataHora: '2026-11-18T08:00',
  tipo: 'PILATES',
  duracao: 60,
  profissionalId: 5,
  nomeProfissional: 'Paula Mendes',
  status: 'REALIZADA',
  observacoes: null,
  dataCriacao: '2026-11-18T09:00:00',
  dataAtualizacao: null,
  aulaId: 21
};

const evolucao: EvolucaoSessaoResponseDTO = {
  version: 3,
  id: 90,
  sessaoId: 40,
  profissionalId: 5,
  profissionalNome: 'Paula Mendes',
  profissionalNumeroRegistro: null,
  dataHoraRegistro: '2026-11-18T08:50:00',
  exerciciosRealizados: 'Ponte',
  equipamentosUtilizados: 'Reformer',
  cargasMolas: null,
  dorAntes: 4,
  dorDepois: 1,
  respostaPaciente: null,
  intercorrencias: null,
  orientacoes: null,
  observacoesFisioterapeuta: 'Melhorou',
  dataCriacao: '2026-11-18T08:50:00',
  dataAtualizacao: null
};

const aulaAtendida: AulaResponseDTO = { ...aulaPendente, realizada: true, sessaoId: 40, temEvolucao: false };
const aulaEvoluida: AulaResponseDTO = { ...aulaAtendida, temEvolucao: true };
const atendimentoSemEvolucao: AtendimentoResponseDTO = { aula: aulaAtendida, sessao, evolucao: null };
const atendimentoEvoluido: AtendimentoResponseDTO = { aula: aulaEvoluida, sessao, evolucao };

function profissional(id: number, nome: string): ProfissionalResponseDTO {
  return {
    version: 0,
    id,
    nome,
    email: `${id}@x.com`,
    cpf: '111.111.111-11',
    telefone: null,
    numeroRegistro: null,
    tipoContrato: 'PJ',
    percentualPagamentoAula: 40,
    dataInicio: '2024-01-01',
    ativo: true
  };
}

const paginaProfissionais: ProfissionalPage = {
  content: [profissional(5, 'Paula Mendes'), profissional(6, 'Diego Pilates')],
  page: { totalElements: 2, totalPages: 1, size: 100, number: 0 }
};

const naoEncontrado = () => new HttpErrorResponse({ status: 404 });

describe('AulaAtendimentoComponent', () => {
  let component: AulaAtendimentoComponent;
  let fixture: ComponentFixture<AulaAtendimentoComponent>;
  let aulaServiceSpy: jasmine.SpyObj<AulaService>;
  let evolucaoServiceSpy: jasmine.SpyObj<EvolucaoSessaoService>;
  let profissionalServiceSpy: jasmine.SpyObj<ProfissionalService>;

  async function setup(opcoes: {
    aulaId?: string;
    aula?: AulaResponseDTO;
    erroAula?: HttpErrorResponse;
    atendimento?: AtendimentoResponseDTO | null;
    erroAtendimento?: HttpErrorResponse;
    erroProfissionais?: boolean;
  } = {}) {
    aulaServiceSpy = jasmine.createSpyObj('AulaService', ['buscar', 'buscarAtendimento', 'registrarAtendimento']);
    evolucaoServiceSpy = jasmine.createSpyObj('EvolucaoSessaoService', ['atualizar']);
    profissionalServiceSpy = jasmine.createSpyObj('ProfissionalService', ['listar']);

    aulaServiceSpy.buscar.and.returnValue(
      opcoes.erroAula ? throwError(() => opcoes.erroAula) : of(opcoes.aula ?? aulaPendente));
    const atendimento = opcoes.atendimento ?? null;
    aulaServiceSpy.buscarAtendimento.and.returnValue(
      opcoes.erroAtendimento
        ? throwError(() => opcoes.erroAtendimento)
        : atendimento === null ? throwError(naoEncontrado) : of(atendimento));
    profissionalServiceSpy.listar.and.returnValue(
      opcoes.erroProfissionais ? throwError(() => new HttpErrorResponse({ status: 500 })) : of(paginaProfissionais));

    await TestBed.configureTestingModule({
      imports: [AulaAtendimentoComponent, RouterTestingModule],
      providers: [
        provideLocalePtBr(),
        { provide: AulaService, useValue: aulaServiceSpy },
        { provide: EvolucaoSessaoService, useValue: evolucaoServiceSpy },
        { provide: ProfissionalService, useValue: profissionalServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ aulaId: opcoes.aulaId ?? '21' }) } }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AulaAtendimentoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => TestBed.resetTestingModule());

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const texto = (seletor: string): string => el().querySelector(seletor)?.textContent?.trim() ?? '';

  function preencher(id: string, valor: string): void {
    const campo = el().querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${id}`)!;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
  }

  function selecionar(id: string, indice: number): void {
    const select = el().querySelector<HTMLSelectElement>(`#${id}`)!;
    select.selectedIndex = indice;
    select.dispatchEvent(new Event('change'));
  }

  function submeter(): void {
    el().querySelector<HTMLButtonElement>('form button[type="submit"]')!.click();
    fixture.detectChanges();
  }

  function botao(textoBotao: string): HTMLButtonElement | undefined {
    return Array.from(el().querySelectorAll<HTMLButtonElement>('button'))
      .find(b => b.textContent?.trim() === textoBotao);
  }

  it('should reject an invalid id without calling the API', async () => {
    await setup({ aulaId: 'abc' });

    expect(component.erro).toBe('Identificador inválido.');
    expect(aulaServiceSpy.buscar).not.toHaveBeenCalled();
    expect(el().querySelector('form')).toBeNull();
  });

  describe('sem atendimento', () => {
    beforeEach(async () => setup());

    it('should load the class with patient, date, time and professional filled in', () => {
      expect(aulaServiceSpy.buscar).toHaveBeenCalledWith(21);
      expect(aulaServiceSpy.buscarAtendimento).toHaveBeenCalledWith(21);
      expect(profissionalServiceSpy.listar).toHaveBeenCalledWith(0, 100, { ativo: true });
      expect(component.atendimento).toBeNull();
      expect(component.erro).toBeNull();
      expect(texto('.page-subtitle')).toBe('Ana Silva — 18/11/2026 (qua.) às 08:00');
      expect(texto('.resumo .badge-atendimento')).toBe('Sem atendimento');
      const select = el().querySelector<HTMLSelectElement>('#profissionalId')!;
      expect(select.options[select.selectedIndex].textContent?.trim()).toBe('Paula Mendes');
      expect(texto('form button[type="submit"]')).toBe('Realizar e registrar evolução');
      expect(el().querySelector('app-evolucao-campos #dataHoraRegistro')).not.toBeNull();
    });

    it('should realize the class and register the evolution in one request', () => {
      aulaServiceSpy.registrarAtendimento.and.returnValue(of(atendimentoEvoluido));
      selecionar('profissionalId', 2);
      selecionar('tipo', 1);
      preencher('dataHoraRegistro', '2026-11-18T08:50');
      preencher('exerciciosRealizados', '  Ponte  ');
      preencher('dorAntes', '4');
      submeter();

      expect(aulaServiceSpy.registrarAtendimento).toHaveBeenCalledWith(21, {
        profissionalId: 6,
        tipo: 'FISIOTERAPIA',
        evolucao: jasmine.objectContaining({
          dataHoraRegistro: '2026-11-18T08:50',
          exerciciosRealizados: 'Ponte',
          equipamentosUtilizados: null,
          dorAntes: 4,
          dorDepois: null
        })
      });
      expect(texto('.alert-success')).toBe('Atendimento registrado: aula realizada e evolução salva.');
      expect(component.atendimento).toEqual(atendimentoEvoluido);
      expect(texto('.resumo .badge-atendimento')).toBe('Evoluída');
      expect(texto('form button[type="submit"]')).toBe('Atualizar evolução');
      // A sessão existe: profissional e tipo saem do formulário.
      expect(el().querySelector('#profissionalId')).toBeNull();
    });

    it('should require the professional to realize a pending class', () => {
      selecionar('profissionalId', 0);
      submeter();

      expect(aulaServiceSpy.registrarAtendimento).not.toHaveBeenCalled();
      expect(texto('.registro .invalid-feedback')).toBe('Selecione o profissional para realizar a aula.');
      expect(el().querySelector('#profissionalId')?.getAttribute('aria-invalid')).toBe('true');
      expect(document.activeElement).toBe(el().querySelector('#profissionalId'));
    });

    it('should not submit an invalid pain value', () => {
      preencher('dorDepois', '11');
      submeter();

      expect(aulaServiceSpy.registrarAtendimento).not.toHaveBeenCalled();
      expect(texto('#dorDepoisError')).toBe('A dor depois deve estar entre 0 e 10.');
    });

    it('should realize the class without evolution', () => {
      aulaServiceSpy.registrarAtendimento.and.returnValue(of(atendimentoSemEvolucao));
      botao('Realizar sem evolução')!.click();
      fixture.detectChanges();

      expect(aulaServiceSpy.registrarAtendimento).toHaveBeenCalledWith(21, { profissionalId: 5, tipo: 'PILATES' });
      expect(texto('.alert-success')).toBe('Atendimento registrado sem evolução.');
      expect(texto('.resumo .badge-atendimento')).toBe('Sem evolução');
      expect(texto('form button[type="submit"]')).toBe('Registrar evolução');
    });

    it('should not realize without evolution when the professional is missing', () => {
      selecionar('profissionalId', 0);
      botao('Realizar sem evolução')!.click();
      fixture.detectChanges();

      expect(aulaServiceSpy.registrarAtendimento).not.toHaveBeenCalled();
      expect(component.profissionalInvalido()).toBeTrue();
    });

    it('should show the API detail of a 422', () => {
      aulaServiceSpy.registrarAtendimento.and.returnValue(throwError(() => new HttpErrorResponse({
        status: 422,
        error: { title: 'Regra de negócio', detail: 'Profissional inativo' }
      })));
      submeter();

      expect(texto('.alert-danger')).toBe('Profissional inativo');
      expect(botao('Recarregar')).toBeUndefined();
      expect(component.salvando).toBeFalse();
    });

    it('should explain a 404 without detail', () => {
      aulaServiceSpy.registrarAtendimento.and.returnValue(throwError(naoEncontrado));
      submeter();

      expect(component.erro).toBe('Aula ou profissional não encontrado. A aula pode ser de um paciente inativo.');
    });

    it('should explain a 400 without detail', () => {
      aulaServiceSpy.registrarAtendimento.and.returnValue(throwError(() => new HttpErrorResponse({ status: 400 })));
      submeter();

      expect(component.erro).toBe('Dados inválidos: confira a dor antes e depois (de 0 a 10).');
    });

    it('should fall back to a generic message on other errors', () => {
      aulaServiceSpy.registrarAtendimento.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      submeter();

      expect(component.erro).toBe('Erro ao registrar o atendimento.');
    });

    it('should offer to reload after a 409 and reload the atendimento', () => {
      aulaServiceSpy.registrarAtendimento.and.returnValue(throwError(() => new HttpErrorResponse({
        status: 409,
        error: { type: 'https://carlessopilates.com.br/problemas/conflict', detail: 'A sessão da aula já tem evolução' }
      })));
      submeter();

      expect(texto('.alert-danger')).toContain('A sessão da aula já tem evolução');
      aulaServiceSpy.buscarAtendimento.and.returnValue(of(atendimentoEvoluido));
      botao('Recarregar')!.click();
      fixture.detectChanges();

      expect(aulaServiceSpy.buscarAtendimento).toHaveBeenCalledTimes(2);
      expect(component.erro).toBeNull();
      expect(component.evolucao).toEqual(evolucao);
    });
  });

  describe('atendimento sem evolução', () => {
    beforeEach(async () => setup({ aula: aulaAtendida, atendimento: atendimentoSemEvolucao }));

    it('should show what was registered and offer only the evolution', () => {
      expect(texto('.resumo .badge-atendimento')).toBe('Sem evolução');
      expect(texto('.resumo')).toContain('Pilates · Realizada · Paula Mendes');
      expect(el().querySelector('#profissionalId')).toBeNull();
      expect(botao('Realizar sem evolução')).toBeUndefined();
      expect(el().querySelector('a[href="/pacientes/10/sessoes"]')?.textContent?.trim()).toBe('Atendimentos do paciente');
      expect(texto('form button[type="submit"]')).toBe('Registrar evolução');
    });

    it('should register the evolution with the same POST, only with the evolution', () => {
      aulaServiceSpy.registrarAtendimento.and.returnValue(of(atendimentoEvoluido));
      preencher('observacoesFisioterapeuta', 'Bem');
      submeter();

      const [aulaId, corpo] = aulaServiceSpy.registrarAtendimento.calls.mostRecent().args;
      expect(aulaId).toBe(21);
      expect(Object.keys(corpo!)).toEqual(['evolucao']);
      expect(corpo!.evolucao?.observacoesFisioterapeuta).toBe('Bem');
      expect(texto('.alert-success')).toBe('Evolução registrada.');
    });
  });

  describe('atendimento com evolução', () => {
    beforeEach(async () => setup({ aula: aulaEvoluida, atendimento: atendimentoEvoluido }));

    it('should open the evolution already filled in', () => {
      expect(el().querySelector<HTMLTextAreaElement>('#exerciciosRealizados')!.value).toBe('Ponte');
      expect(el().querySelector<HTMLInputElement>('#dorAntes')!.value).toBe('4');
      expect(texto('.resumo')).toContain('por Paula Mendes');
      expect(texto('form button[type="submit"]')).toBe('Atualizar evolução');
    });

    it('should edit the evolution by PUT with the version, without a new atendimento', () => {
      evolucaoServiceSpy.atualizar.and.returnValue(of({ ...evolucao, version: 4, exerciciosRealizados: 'Ponte e prancha' }));
      preencher('exerciciosRealizados', 'Ponte e prancha');
      submeter();

      expect(aulaServiceSpy.registrarAtendimento).not.toHaveBeenCalled();
      expect(evolucaoServiceSpy.atualizar).toHaveBeenCalledWith(90, jasmine.objectContaining({
        exerciciosRealizados: 'Ponte e prancha',
        dorAntes: 4,
        version: 3
      }));
      expect(texto('.alert-success')).toBe('Evolução atualizada.');
      expect(component.evolucao?.version).toBe(4);
    });

    it('should explain a concurrent edit', () => {
      evolucaoServiceSpy.atualizar.and.returnValue(throwError(conflitoConcorrencia));
      submeter();

      expect(component.erro).toBe(MENSAGEM_CONFLITO_CONCORRENCIA);
      expect(botao('Recarregar')).toBeDefined();
    });

    it('should hide the success message after a while', fakeAsync(() => {
      evolucaoServiceSpy.atualizar.and.returnValue(of(evolucao));
      submeter();
      expect(component.sucesso).toBe('Evolução atualizada.');

      tick(4000);
      expect(component.sucesso).toBeNull();
    }));
  });

  it('should not offer atendimento on a holiday class', async () => {
    await setup({ aula: { ...aulaPendente, realizada: true, feriado: true } });

    expect(el().querySelector('form')).toBeNull();
    expect(texto('.alert-warning')).toContain('Aula de feriado');
    expect(el().querySelector('.resumo .badge-atendimento')).toBeNull();
    expect(texto('.resumo .badge--info')).toBe('Feriado');

    component.salvar();
    component.realizarSemEvolucao();
    expect(aulaServiceSpy.registrarAtendimento).not.toHaveBeenCalled();
  });

  it('should let a done class without session be attended, with an optional professional', async () => {
    await setup({ aula: { ...aulaPendente, realizada: true, profissionalId: null, profissionalNome: null } });

    expect(component.exigeProfissional).toBeFalse();
    expect(texto('#profissionalId option')).toBe('Sem profissional');
    expect(texto('form button[type="submit"]')).toBe('Registrar atendimento');
    expect(texto('.form-actions .btn-secondary')).toBe('Registrar sem evolução');

    aulaServiceSpy.registrarAtendimento.and.returnValue(of(atendimentoSemEvolucao));
    botao('Registrar sem evolução')!.click();

    expect(aulaServiceSpy.registrarAtendimento).toHaveBeenCalledWith(21, { tipo: 'PILATES' });
  });

  it('should keep the professional of the class as an option when it is no longer active', async () => {
    await setup({ aula: { ...aulaPendente, profissionalId: 9, profissionalNome: 'Inativa' } });

    expect(component.opcoesProfissional.map(p => p.nome)).toEqual(['Inativa', 'Paula Mendes', 'Diego Pilates']);
  });

  it('should still work when the professionals do not load', async () => {
    await setup({ erroProfissionais: true });

    expect(component.profissionais).toEqual([]);
    expect(component.opcoesProfissional.map(p => p.nome)).toEqual(['Paula Mendes']);
    expect(component.erro).toBeNull();
  });

  it('should report a missing class', async () => {
    await setup({ erroAula: naoEncontrado() });

    expect(component.semAula).toBeTrue();
    expect(component.erro).toBe('Aula não encontrada. Ela pode ter sido removida ou ser de um paciente inativo.');
    expect(el().querySelector('form')).toBeNull();
  });

  it('should report other load errors', async () => {
    await setup({ erroAtendimento: new HttpErrorResponse({ status: 500 }) });

    expect(component.semAula).toBeFalse();
    expect(component.erro).toBe('Erro ao carregar o atendimento da aula.');
    expect(component.loading).toBeFalse();
  });
});
