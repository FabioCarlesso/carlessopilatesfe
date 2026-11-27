import { HttpErrorResponse } from '@angular/common/http';
import { provideOpcoesAvaliacaoFake } from '../../../../testing/opcoes-avaliacao';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, ParamMap, Params, Router, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { AnamneseResponseDTO } from '../../../core/models/anamnese';
import { AvaliacaoFisioterapeuticaResponseDTO } from '../../../core/models/avaliacao-fisioterapeutica';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { PlanoTratamentoResponseDTO } from '../../../core/models/plano-tratamento';
import { ReavaliacaoResponseDTO } from '../../../core/models/reavaliacao';
import { AnamneseService } from '../../../core/services/anamnese.service';
import { AvaliacaoFisioterapeuticaService } from '../../../core/services/avaliacao-fisioterapeutica.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { PlanoTratamentoService } from '../../../core/services/plano-tratamento.service';
import { ReavaliacaoService } from '../../../core/services/reavaliacao.service';
import { PontoDorService } from '../../../core/services/ponto-dor.service';
import { PacienteAnamneseComponent } from '../paciente-anamnese/paciente-anamnese.component';
import {
  PacienteAvaliacaoFisioterapeuticaComponent
} from '../paciente-avaliacao-fisioterapeutica/paciente-avaliacao-fisioterapeutica.component';
import {
  PacientePlanoTratamentoFormComponent
} from '../paciente-plano-tratamento-form/paciente-plano-tratamento-form.component';
import { PacienteReavaliacaoFormComponent } from '../paciente-reavaliacao-form/paciente-reavaliacao-form.component';
import { PacienteAvaliacaoComponent } from './paciente-avaliacao.component';

const mockPaciente = { id: 1, nome: 'Ana Silva' } as PacienteResponseDTO;

const mockAnamnese = {
  id: 10,
  pacienteId: 1,
  queixaPrincipal: 'Dor lombar',
  objetivos: 'Fortalecer',
  version: 0
} as AnamneseResponseDTO;

function mockAvaliacao(id: number, dataAvaliacao: string): AvaliacaoFisioterapeuticaResponseDTO {
  return {
    id,
    pacienteId: 1,
    dataAvaliacao,
    queixaFuncional: 'Dor ao agachar',
    escalaDor: 6,
    diagnosticoFisioterapeutico: 'Lombalgia mecânica',
    version: 0
  } as AvaliacaoFisioterapeuticaResponseDTO;
}

function mockPlano(id: number, dataInicio: string): PlanoTratamentoResponseDTO {
  return { id, pacienteId: 1, dataInicio, objetivosTratamento: 'Reduzir dor', version: 0 } as PlanoTratamentoResponseDTO;
}

function mockReavaliacao(id: number, dataReavaliacao: string): ReavaliacaoResponseDTO {
  return {
    id,
    pacienteId: 1,
    dataReavaliacao,
    evolucaoDor: 'Dor de 6 para 3',
    objetivosAlcancados: null,
    pontosAtencao: null,
    ajustesRecomendados: null,
    version: 0
  } as ReavaliacaoResponseDTO;
}

interface Cenario {
  anamnese?: AnamneseResponseDTO | null;
  avaliacoes?: AvaliacaoFisioterapeuticaResponseDTO[];
  planos?: PlanoTratamentoResponseDTO[];
  reavaliacoes?: ReavaliacaoResponseDTO[];
  query?: Params;
  pacienteId?: string;
}

describe('PacienteAvaliacaoComponent', () => {
  let fixture: ComponentFixture<PacienteAvaliacaoComponent>;
  let component: PacienteAvaliacaoComponent;
  let pacienteSpy: jasmine.SpyObj<PacienteService>;
  let anamneseSpy: jasmine.SpyObj<AnamneseService>;
  let avaliacaoSpy: jasmine.SpyObj<AvaliacaoFisioterapeuticaService>;
  let planoSpy: jasmine.SpyObj<PlanoTratamentoService>;
  let reavaliacaoSpy: jasmine.SpyObj<ReavaliacaoService>;
  let pontoDorSpy: jasmine.SpyObj<PontoDorService>;
  let queryParams: BehaviorSubject<ParamMap>;
  let navigate: jasmine.Spy;

  function setup(cenario: Cenario = {}) {
    pacienteSpy = jasmine.createSpyObj('PacienteService', ['buscar']);
    pacienteSpy.buscar.and.returnValue(of(mockPaciente));
    anamneseSpy = jasmine.createSpyObj('AnamneseService', ['buscarPorPaciente', 'criar', 'atualizar']);
    const anamnese = cenario.anamnese ?? null;
    anamneseSpy.buscarPorPaciente.and.returnValue(
      anamnese ? of(anamnese) : throwError(() => new HttpErrorResponse({ status: 404 }))
    );
    avaliacaoSpy = jasmine.createSpyObj('AvaliacaoFisioterapeuticaService', ['listarPorPaciente', 'criar', 'atualizar']);
    avaliacaoSpy.listarPorPaciente.and.returnValue(of(cenario.avaliacoes ?? []));
    planoSpy = jasmine.createSpyObj('PlanoTratamentoService', ['listarPorPaciente', 'buscar', 'criar', 'atualizar']);
    planoSpy.listarPorPaciente.and.returnValue(of(cenario.planos ?? []));
    planoSpy.buscar.and.callFake((id: number) => of((cenario.planos ?? []).find(p => p.id === id)!));
    reavaliacaoSpy = jasmine.createSpyObj('ReavaliacaoService', ['listarPorPaciente', 'buscar', 'criar', 'atualizar']);
    reavaliacaoSpy.listarPorPaciente.and.returnValue(of(cenario.reavaliacoes ?? []));
    reavaliacaoSpy.buscar.and.callFake((id: number) => of((cenario.reavaliacoes ?? []).find(r => r.id === id)!));

    pontoDorSpy = jasmine.createSpyObj('PontoDorService', ['listar', 'salvar', 'historicoDoPaciente']);
    pontoDorSpy.listar.and.returnValue(of([]));
    pontoDorSpy.historicoDoPaciente.and.returnValue(of([]));

    queryParams = new BehaviorSubject(convertToParamMap(cenario.query ?? {}));

    TestBed.configureTestingModule({
      imports: [PacienteAvaliacaoComponent, RouterTestingModule],
      providers: [
        provideOpcoesAvaliacaoFake(),
        { provide: PacienteService, useValue: pacienteSpy },
        { provide: AnamneseService, useValue: anamneseSpy },
        { provide: AvaliacaoFisioterapeuticaService, useValue: avaliacaoSpy },
        { provide: PlanoTratamentoService, useValue: planoSpy },
        { provide: ReavaliacaoService, useValue: reavaliacaoSpy },
        { provide: PontoDorService, useValue: pontoDorSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ pacienteId: cenario.pacienteId ?? '1' }) },
            queryParamMap: queryParams.asObservable()
          }
        }
      ]
    });

    navigate = spyOn(TestBed.inject(Router), 'navigate');
    fixture = TestBed.createComponent(PacienteAvaliacaoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => TestBed.resetTestingModule());

  /** Simula a navegação que `irPara` (ou o voltar do navegador) produziria. */
  function irParaUrl(query: Params) {
    queryParams.next(convertToParamMap(query));
    fixture.detectChanges();
  }

  function el(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function passos(): HTMLButtonElement[] {
    return Array.from(el().querySelectorAll<HTMLButtonElement>('.stepper-botao'));
  }

  function rotulos(): string[] {
    return Array.from(el().querySelectorAll('.stepper-rotulo')).map(r => r.textContent?.trim() ?? '');
  }

  function situacoes(): (string | null)[] {
    return Array.from(el().querySelectorAll('.stepper-item')).map(li => li.getAttribute('data-situacao'));
  }

  function etapaAtual(): string | null {
    return el().querySelector('[aria-current="step"]')?.closest('.stepper-item')?.getAttribute('data-etapa') ?? null;
  }

  function ultimaNavegacao(): Params {
    return navigate.calls.mostRecent().args[1].queryParams;
  }

  function botao(texto: string): HTMLButtonElement {
    const alvo = Array.from(el().querySelectorAll<HTMLButtonElement>('button')).find(b => b.textContent?.trim() === texto);
    expect(alvo).withContext(`botão "${texto}"`).toBeTruthy();
    return alvo!;
  }

  const completo: Cenario = {
    anamnese: mockAnamnese,
    avaliacoes: [mockAvaliacao(5, '2026-03-01')],
    planos: [mockPlano(3, '2026-03-02')]
  };

  describe('stepper', () => {
    it('should list the four steps in order, with the postural one optional', () => {
      setup();
      expect(rotulos()).toEqual(['Anamnese', 'Avaliação fisioterapêutica', 'Análise postural', 'Plano de tratamento']);
      expect(situacoes()).toEqual(['pendente', 'pendente', 'opcional', 'pendente']);
      expect(el().querySelector('nav.stepper')?.getAttribute('aria-label')).toBe('Etapas da avaliação inicial');
      expect(passos().every(p => p.type === 'button')).toBeTrue();
      expect(passos()[0].textContent).toContain('Etapa 1 de 4');
    });

    it('should open a brand-new patient at the anamnesis, embedding the existing form', () => {
      setup();
      expect(etapaAtual()).toBe('anamnese');
      expect(passos().filter(p => p.hasAttribute('aria-current')).length).toBe(1);
      const anamnese = fixture.debugElement.query(By.directive(PacienteAnamneseComponent));
      expect(anamnese.componentInstance.embutido).toBeTrue();
      expect(el().querySelector('#etapa-titulo')?.textContent).toContain('Etapa 1 de 4 · Anamnese');
      expect(el().querySelector('[data-aviso="pendente"]')).toBeNull();
    });

    it('should resume at the pending step derived from the API', () => {
      setup({ anamnese: mockAnamnese });
      expect(situacoes()).toEqual(['concluida', 'pendente', 'opcional', 'pendente']);
      expect(etapaAtual()).toBe('avaliacao');
      expect(fixture.debugElement.query(By.directive(PacienteAvaliacaoFisioterapeuticaComponent))).toBeTruthy();
    });

    it('should skip the optional postural step when resuming', () => {
      setup({ anamnese: mockAnamnese, avaliacoes: [mockAvaliacao(5, '2026-03-01')] });
      expect(etapaAtual()).toBe('plano');
      const plano = fixture.debugElement.query(By.directive(PacientePlanoTratamentoFormComponent));
      expect(plano.componentInstance.embutido).toBeTrue();
      expect(plano.componentInstance.planoIdEmbutido).toBeNull();
    });

    it('should show the completed panel when every required step exists', () => {
      setup(completo);
      expect(situacoes()).toEqual(['concluida', 'concluida', 'opcional', 'concluida']);
      expect(etapaAtual()).toBeNull();
      expect(el().querySelector('[data-etapa-concluida]')?.textContent).toContain('Avaliação inicial completa');
    });

    it('should open the step given by the URL and flag the pending one', () => {
      setup({ query: { etapa: 'plano' } });
      expect(etapaAtual()).toBe('plano');
      expect(el().querySelector('[data-aviso="pendente"]')?.textContent).toContain('Anamnese');

      botao('Ir para a etapa pendente').click();
      expect(ultimaNavegacao()).toEqual({ etapa: 'anamnese' });
      expect(navigate.calls.mostRecent().args[1].queryParamsHandling).toBe('merge');
    });

    it('should ignore an unknown step in the URL', () => {
      setup({ query: { etapa: 'qualquer' } });
      expect(etapaAtual()).toBe('anamnese');
    });

    it('should edit the most recent plan in the plan step', () => {
      setup({ ...completo, planos: [mockPlano(3, '2026-03-02'), mockPlano(4, '2026-08-01')], query: { etapa: 'plano' } });
      const plano = fixture.debugElement.query(By.directive(PacientePlanoTratamentoFormComponent));
      expect(plano.componentInstance.planoIdEmbutido).toBe(4);
      expect(planoSpy.buscar).toHaveBeenCalledWith(4);
    });

    it('should navigate when a step is clicked', () => {
      setup();
      passos()[3].click();
      expect(ultimaNavegacao()).toEqual({ etapa: 'plano' });
    });

    it('should move the focus to the title of the new step', fakeAsync(() => {
      setup();
      tick();
      irParaUrl({ etapa: 'postural' });
      tick();
      expect(document.activeElement?.id).toBe('etapa-titulo');
      expect(document.activeElement?.textContent).toContain('Análise postural');
    }));

    it('should go back to the previous step', () => {
      setup({ query: { etapa: 'avaliacao' } });
      botao('Etapa anterior').click();
      expect(ultimaNavegacao()).toEqual({ etapa: 'anamnese' });
    });

    it('should not offer going back from the first step', () => {
      setup();
      expect(el().querySelector('.etapa-navegacao')).toBeNull();
    });
  });

  describe('salvar etapa por etapa', () => {
    it('should advance to the assessment after saving the anamnesis', () => {
      setup();
      const anamnese = fixture.debugElement.query(By.directive(PacienteAnamneseComponent));
      anamnese.componentInstance.salvo.emit(mockAnamnese);
      fixture.detectChanges();

      expect(ultimaNavegacao()).toEqual({ etapa: 'avaliacao' });
      expect(situacoes()[0]).toBe('concluida');
      expect(el().querySelector('.alert-success')?.textContent).toContain('Anamnese salva.');
    });

    it('should advance to the postural step after saving the assessment and add it to the timeline', () => {
      setup({ anamnese: mockAnamnese });
      const avaliacao = fixture.debugElement.query(By.directive(PacienteAvaliacaoFisioterapeuticaComponent));
      avaliacao.componentInstance.salvo.emit(mockAvaliacao(5, '2026-03-01'));
      fixture.detectChanges();

      expect(ultimaNavegacao()).toEqual({ etapa: 'postural' });
      expect(el().querySelectorAll('.timeline-item').length).toBe(1);
    });

    it('should finish the initial flow after saving the plan', () => {
      setup({ anamnese: mockAnamnese, avaliacoes: [mockAvaliacao(5, '2026-03-01')] });
      const plano = fixture.debugElement.query(By.directive(PacientePlanoTratamentoFormComponent));
      plano.componentInstance.salvo.emit(mockPlano(3, '2026-03-02'));
      fixture.detectChanges();

      expect(ultimaNavegacao()).toEqual({ etapa: null });
      expect(component.pendente).toBeNull();
    });

    it('should clear the success message after a while', fakeAsync(() => {
      setup();
      component.aoSalvarAnamnese(mockAnamnese);
      component.aoSalvarAnamnese(mockAnamnese);
      expect(component.sucesso).toBe('Anamnese salva.');
      tick(4000);
      expect(component.sucesso).toBeNull();
    }));
  });

  describe('análise postural (opcional)', () => {
    it('should lead to the postural screen and allow skipping it', () => {
      setup({ ...completo, query: { etapa: 'postural' } });
      const link = el().querySelector<HTMLAnchorElement>('.etapa-postural a');
      expect(link?.getAttribute('href')).toBe('/pacientes/1/avaliacao-fisioterapeutica/postural');
      expect(el().querySelector('[data-dica="sem-avaliacao"]')).toBeNull();

      botao('Pular esta etapa').click();
      expect(ultimaNavegacao()).toEqual({ etapa: 'plano' });
    });

    it('should explain that the postural analysis needs an assessment first', () => {
      setup({ query: { etapa: 'postural' } });
      expect(el().querySelector('[data-dica="sem-avaliacao"]')).not.toBeNull();
    });
  });

  describe('reavaliação', () => {
    const comHistorico: Cenario = {
      ...completo,
      reavaliacoes: [mockReavaliacao(20, '2026-06-01')]
    };

    it('should start a reassessment from the completed panel', () => {
      setup(completo);
      botao('Nova reavaliação').click();
      expect(ultimaNavegacao()).toEqual({ etapa: 'reavaliacao', fluxo: 'reavaliacao', reavaliacao: null });
    });

    it('should follow the same model, starting from the latest record', () => {
      setup({ ...comHistorico, query: { fluxo: 'reavaliacao', etapa: 'reavaliacao' } });
      expect(rotulos()).toEqual(['Reavaliação', 'Análise postural', 'Plano de tratamento']);
      expect(situacoes()).toEqual(['pendente', 'opcional', 'opcional']);
      expect(el().querySelector('nav.stepper')?.getAttribute('aria-label')).toBe('Etapas da reavaliação');
      expect(el().querySelector('[data-referencia]')?.textContent).toContain('Reavaliação');
      expect(el().querySelector('[data-referencia]')?.textContent).toContain('01/06/2026');
      const form = fixture.debugElement.query(By.directive(PacienteReavaliacaoFormComponent));
      expect(form.componentInstance.embutido).toBeTrue();
      expect(form.componentInstance.reavaliacaoIdEmbutido).toBeNull();
    });

    it('should open the reassessment flow at the reassessment when no step is given', () => {
      setup({ ...completo, query: { fluxo: 'reavaliacao' } });
      expect(etapaAtual()).toBe('reavaliacao');
      expect(el().querySelector('[data-referencia]')?.textContent).toContain('Avaliação inicial');
    });

    it('should say there is nothing to compare with for a patient without assessments', () => {
      setup({ query: { fluxo: 'reavaliacao' } });
      expect(el().querySelector('[data-referencia]')?.textContent).toContain('Nenhuma avaliação anterior');
    });

    it('should keep the saved reassessment in the URL and move on to the postural step', () => {
      setup({ ...comHistorico, query: { fluxo: 'reavaliacao', etapa: 'reavaliacao' } });
      const form = fixture.debugElement.query(By.directive(PacienteReavaliacaoFormComponent));
      form.componentInstance.salvo.emit(mockReavaliacao(21, '2026-11-20'));
      fixture.detectChanges();

      expect(ultimaNavegacao()).toEqual({ etapa: 'postural', reavaliacao: 21 });
      expect(el().querySelectorAll('.timeline-item').length).toBe(3);
    });

    it('should edit the reassessment of the URL, compared with the record before it', () => {
      setup({ ...comHistorico, query: { fluxo: 'reavaliacao', etapa: 'reavaliacao', reavaliacao: '20' } });
      expect(situacoes()[0]).toBe('concluida');
      expect(el().querySelector('[data-referencia]')?.textContent).toContain('Avaliação inicial');
      const form = fixture.debugElement.query(By.directive(PacienteReavaliacaoFormComponent));
      expect(form.componentInstance.reavaliacaoIdEmbutido).toBe(20);
      expect(reavaliacaoSpy.buscar).toHaveBeenCalledWith(20);
    });

    it('should let the plan be adjusted and finish the reassessment', () => {
      setup({ ...comHistorico, query: { fluxo: 'reavaliacao', etapa: 'plano', reavaliacao: '20' } });
      expect(el().querySelector('.etapa-dica')?.textContent).toContain('Ajuste o plano de tratamento atual');
      const plano = fixture.debugElement.query(By.directive(PacientePlanoTratamentoFormComponent));
      plano.componentInstance.salvo.emit(mockPlano(3, '2026-03-02'));

      expect(ultimaNavegacao()).toEqual({ etapa: null, fluxo: null, reavaliacao: null });
      expect(component.sucesso).toBe('Reavaliação concluída.');
    });

    it('should finish the reassessment without touching the plan', () => {
      setup({ ...comHistorico, query: { fluxo: 'reavaliacao', etapa: 'plano', reavaliacao: '20' } });
      botao('Concluir sem alterar o plano').click();
      expect(ultimaNavegacao()).toEqual({ etapa: null, fluxo: null, reavaliacao: null });
      expect(planoSpy.atualizar).not.toHaveBeenCalled();
    });

    it('should suggest creating a plan when the patient has none', () => {
      setup({ query: { fluxo: 'reavaliacao', etapa: 'plano' } });
      expect(el().querySelector('.etapa-dica')?.textContent).toContain('ainda não tem plano');
    });

    it('should show the registered panel and let the user leave the reassessment', () => {
      setup({ ...comHistorico, query: { fluxo: 'reavaliacao', reavaliacao: '20' } });
      expect(el().querySelector('[data-etapa-concluida]')?.textContent).toContain('Reavaliação registrada');
      botao('Voltar à visão geral').click();
      expect(ultimaNavegacao()).toEqual({ etapa: null, fluxo: null, reavaliacao: null });
      botao('Sair da reavaliação').click();
      expect(ultimaNavegacao()).toEqual({ etapa: null, fluxo: null, reavaliacao: null });
    });

    it('should ignore the reassessment id outside the reassessment flow', () => {
      setup({ query: { reavaliacao: '20' } });
      expect(component.reavaliacaoId).toBeNull();
    });
  });

  describe('linha do tempo', () => {
    it('should show the empty state without assessments', () => {
      setup();
      expect(el().querySelector('app-empty-state')?.textContent).toContain('Nenhuma avaliação registrada.');
      expect(el().querySelector('.timeline')).toBeNull();
    });

    it('should compare the pain map of the records, only when there is a record (issue #307)', () => {
      setup();
      expect(el().querySelector('app-comparativo-mapa-dor')).toBeNull();
      expect(pontoDorSpy.historicoDoPaciente).not.toHaveBeenCalled();

      TestBed.resetTestingModule();
      setup({ ...completo, avaliacoes: [mockAvaliacao(5, '2026-03-01')] });
      expect(el().querySelector('app-comparativo-mapa-dor')).not.toBeNull();
      expect(pontoDorSpy.historicoDoPaciente).toHaveBeenCalledOnceWith(1);
    });

    it('should reload the pain map comparison after a record is saved in the flow', () => {
      setup({ ...completo, avaliacoes: [mockAvaliacao(5, '2026-03-01')], query: { etapa: 'avaliacao' } });
      const avaliacao = fixture.debugElement.query(By.css('app-paciente-avaliacao-fisioterapeutica'));
      avaliacao.componentInstance.salvo.emit(mockAvaliacao(5, '2026-03-02'));
      fixture.detectChanges();
      expect(pontoDorSpy.historicoDoPaciente).toHaveBeenCalledTimes(2);
    });

    it('should list the initial assessment and the reassessments in chronological order', () => {
      setup({
        ...completo,
        avaliacoes: [mockAvaliacao(6, '2026-10-01'), mockAvaliacao(5, '2026-03-01')],
        reavaliacoes: [mockReavaliacao(21, '2026-09-01'), mockReavaliacao(20, '2026-06-01')]
      });
      const titulos = Array.from(el().querySelectorAll('.timeline-titulo')).map(t => t.textContent?.replace(/\s+/g, ' ').trim());
      expect(titulos).toEqual([
        '01/03/2026 · Avaliação inicial',
        '01/06/2026 · Reavaliação',
        '01/09/2026 · Reavaliação',
        '01/10/2026 · Avaliação fisioterapêutica'
      ]);
      expect(el().querySelector('.timeline-item')?.textContent).toContain('Lombalgia mecânica');
    });

    it('should give access to each reassessment and to the editable assessment', () => {
      setup({
        ...completo,
        avaliacoes: [mockAvaliacao(6, '2026-10-01'), mockAvaliacao(5, '2026-03-01')],
        reavaliacoes: [mockReavaliacao(20, '2026-06-01')]
      });
      const itens = Array.from(el().querySelectorAll('.timeline-item'));
      const link = (i: number) => itens[i].querySelector('a')?.getAttribute('href') ?? null;
      // A avaliação antiga não é editável: os formulários abrem sempre a mais recente.
      expect(link(0)).toBeNull();
      expect(link(1)).toBe('/pacientes/1/avaliacao?fluxo=reavaliacao&etapa=reavaliacao&reavaliacao=20');
      expect(link(2)).toBe('/pacientes/1/avaliacao?etapa=avaliacao');
      expect(itens[1].querySelector('a')?.getAttribute('aria-label')).toBe('Abrir Reavaliação de 01/06/2026');
    });

    it('should start a reassessment from the timeline', () => {
      setup(completo);
      const botaoLinha = el().querySelector<HTMLButtonElement>('.linha-do-tempo .fluxo-cabecalho button');
      botaoLinha!.click();
      expect(ultimaNavegacao()).toEqual({ etapa: 'reavaliacao', fluxo: 'reavaliacao', reavaliacao: null });
    });
  });

  describe('carregamento', () => {
    it('should load every record of the patient', () => {
      setup();
      expect(pacienteSpy.buscar).toHaveBeenCalledWith(1);
      expect(anamneseSpy.buscarPorPaciente).toHaveBeenCalledWith(1);
      expect(avaliacaoSpy.listarPorPaciente).toHaveBeenCalledWith(1);
      expect(planoSpy.listarPorPaciente).toHaveBeenCalledWith(1);
      expect(reavaliacaoSpy.listarPorPaciente).toHaveBeenCalledWith(1);
      expect(el().querySelector('.page-subtitle')?.textContent).toContain('Ana Silva');
      const voltar = el().querySelector<HTMLAnchorElement>('.page-header a');
      expect(voltar?.getAttribute('href')).toBe('/pacientes/1?aba=clinico');
    });

    it('should reject an invalid patient id without calling the API', () => {
      setup({ pacienteId: 'abc' });
      expect(component.erro).toBe('Identificador inválido.');
      expect(pacienteSpy.buscar).not.toHaveBeenCalled();
      expect(el().querySelector('.stepper')).toBeNull();
    });

    it('should show an error when loading fails', () => {
      setup();
      anamneseSpy.buscarPorPaciente.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      component.carregado = false;
      component.carregar();
      fixture.detectChanges();
      expect(component.erro).toBe('Erro ao carregar a avaliação do paciente.');
      expect(component.loading).toBeFalse();
      expect(el().querySelector('.stepper')).toBeNull();
    });
  });

  describe('opções pré-definidas (issue #306)', () => {
    const avaliacaoComOpcoes = {
      ...mockAvaliacao(1, '2026-03-01'),
      achadosPosturais: ['ESCOLIOSE'],
      equilibrioOpcao: 'ALTERACAO_LEVE',
      testesFuncionais: [{ teste: 'SCHOBER', resultado: 'POSITIVO' }]
    } as AvaliacaoFisioterapeuticaResponseDTO;
    const reavaliacaoComOpcoes = {
      ...mockReavaliacao(5, '2026-06-01'),
      regioesDor: ['LOMBAR'],
      achadosPosturais: ['ESCOLIOSE', 'PE_PLANO'],
      equilibrioOpcao: 'PRESERVADO',
      testesFuncionais: [{ teste: 'SCHOBER', resultado: 'NEGATIVO' }]
    } as ReavaliacaoResponseDTO;
    const anamneseComOpcoes = { ...mockAnamnese, regioesDor: ['CERVICAL'] } as AnamneseResponseDTO;

    function cenarioCompleto(query: Params = {}) {
      setup({
        anamnese: anamneseComOpcoes,
        avaliacoes: [avaliacaoComOpcoes],
        planos: [mockPlano(3, '2026-03-02')],
        reavaliacoes: [reavaliacaoComOpcoes],
        query
      });
    }

    it('mostra as opções selecionadas em cada item da linha do tempo', () => {
      cenarioCompleto();
      const [inicial, reav] = Array.from(el().querySelectorAll('.timeline-item'));
      expect(inicial.querySelector('.opcoes-item[data-campo="achadosPosturais"]')?.textContent).toContain('Escoliose');
      expect(inicial.querySelector('.opcoes-item[data-campo="testesFuncionais"]')?.textContent).toContain('Schober: Positivo');
      expect(inicial.querySelector('[data-comparativo]')).toBeNull();
      expect(reav.querySelector('.opcoes-item[data-campo="regioesDor"]')?.textContent).toContain('Lombar');
    });

    it('mostra na reavaliação o que mudou em relação à avaliação anterior', () => {
      cenarioCompleto();
      const comparativo = el().querySelectorAll('.timeline-item')[1].querySelector('[data-comparativo]') as HTMLElement;
      expect(comparativo.textContent).toContain('à avaliação inicial de 01/03/2026');
      expect(comparativo.querySelector('[data-campo="achadosPosturais"]')?.textContent).toContain('incluído: Pé plano');
      expect(comparativo.querySelector('[data-campo="regioesDor"]')?.textContent).toContain('incluído: Lombar; removido: Cervical');
      expect(comparativo.querySelector('[data-campo="equilibrioOpcao"]')?.textContent).toContain('de Alteração leve para Preservado');
      expect(comparativo.querySelector('[data-campo="testesFuncionais"]')?.textContent).toContain('Schober: de Positivo para Negativo');
    });

    it('mostra as opções do ponto de partida na etapa de reavaliação', () => {
      cenarioCompleto({ fluxo: 'reavaliacao', etapa: 'reavaliacao' });
      const referencia = el().querySelector('[data-referencia]') as HTMLElement;
      expect(referencia.querySelector('.opcoes-item[data-campo="achadosPosturais"]')?.textContent).toContain('Pé plano');
      // O formulário embutido também traz o bloco de achados estruturados.
      expect(el().querySelector('app-paciente-reavaliacao-form [data-campo="regioesDor"]')).toBeTruthy();
    });

    it('a anamnese salva no fluxo entra no comparativo', () => {
      setup({ avaliacoes: [avaliacaoComOpcoes], planos: [mockPlano(3, '2026-03-02')], reavaliacoes: [reavaliacaoComOpcoes] });
      expect(el().querySelector('[data-comparativo] [data-campo="regioesDor"]')).toBeNull();

      component.aoSalvarAnamnese(anamneseComOpcoes);
      fixture.detectChanges();

      expect(el().querySelector('[data-comparativo] [data-campo="regioesDor"]')?.textContent).toContain('removido: Cervical');
    });
  });
});
