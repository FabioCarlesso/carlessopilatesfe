import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PontoDor } from '../../../core/models/ponto-dor';
import { MapaCorporalComponent } from '../../../shared/components/mapa-corporal/mapa-corporal.component';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { AvaliacaoFisioterapeuticaResponseDTO } from '../../../core/models/avaliacao-fisioterapeutica';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { AvaliacaoFisioterapeuticaService } from '../../../core/services/avaliacao-fisioterapeutica.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { PontoDorService } from '../../../core/services/ponto-dor.service';
import { PacienteAvaliacaoFisioterapeuticaComponent } from './paciente-avaliacao-fisioterapeutica.component';
import { MENSAGEM_CONFLITO_CONCORRENCIA } from '../../../shared/utils/api-error';
import { conflitoConcorrencia } from '../../../../testing/conflito';

const mockPaciente: PacienteResponseDTO = {
  version: 0,
  id: 1,
  nome: 'Ana Silva',
  email: 'ana@email.com',
  cpf: '123.456.789-00',
  telefone: '(11) 99999-9999',
  dataNascimento: '1990-05-15',
  endereco: null,
  ativo: true,
  cpfNaNota: false,
  tomadorId: null,
  tomadorNome: null,
  tomadorCpfCnpj: null
};

const mockAvaliacao: AvaliacaoFisioterapeuticaResponseDTO = {
  version: 0,
  id: 5,
  pacienteId: 1,
  nomePaciente: 'Ana Silva',
  dataAvaliacao: '2026-05-03',
  queixaFuncional: 'Dor no joelho direito',
  avaliacaoPostural: 'Anteriorização de cabeça',
  mobilidadeArticular: 'Redução de amplitude',
  forcaMuscular: 'Grau 4',
  flexibilidade: null,
  equilibrio: null,
  coordenacaoMotora: null,
  padraoRespiratorio: null,
  escalaDor: 7,
  testesFuncionaisRealizados: null,
  diagnosticoFisioterapeutico: 'Gonartrose',
  observacoesGerais: null,
  dataCriacao: '2026-05-03T10:00:00',
  dataAtualizacao: null
};

describe('PacienteAvaliacaoFisioterapeuticaComponent', () => {
  let component: PacienteAvaliacaoFisioterapeuticaComponent;
  let fixture: ComponentFixture<PacienteAvaliacaoFisioterapeuticaComponent>;
  let pacienteServiceSpy: jasmine.SpyObj<PacienteService>;
  let avaliacaoServiceSpy: jasmine.SpyObj<AvaliacaoFisioterapeuticaService>;
  let pontoDorServiceSpy: jasmine.SpyObj<PontoDorService>;

  function criarPontoDorSpy(): jasmine.SpyObj<PontoDorService> {
    pontoDorServiceSpy = jasmine.createSpyObj('PontoDorService', ['listar', 'salvar', 'historicoDoPaciente']);
    pontoDorServiceSpy.listar.and.returnValue(of([]));
    pontoDorServiceSpy.salvar.and.callFake((_o, _id, pontos) => of(pontos.map((p, i) => ({ ...p, id: i + 1 }))));
    return pontoDorServiceSpy;
  }

  async function setup(
    avaliacoes: AvaliacaoFisioterapeuticaResponseDTO[] = [mockAvaliacao],
    pacienteId = '1'
  ) {
    pacienteServiceSpy = jasmine.createSpyObj('PacienteService', ['buscar']);
    avaliacaoServiceSpy = jasmine.createSpyObj('AvaliacaoFisioterapeuticaService', [
      'listarPorPaciente',
      'criar',
      'atualizar'
    ]);

    pacienteServiceSpy.buscar.and.returnValue(of(mockPaciente));
    avaliacaoServiceSpy.listarPorPaciente.and.returnValue(of(avaliacoes));

    await TestBed.configureTestingModule({
      imports: [PacienteAvaliacaoFisioterapeuticaComponent, RouterTestingModule],
      providers: [
        { provide: PacienteService, useValue: pacienteServiceSpy },
        { provide: AvaliacaoFisioterapeuticaService, useValue: avaliacaoServiceSpy },
        { provide: PontoDorService, useValue: criarPontoDorSpy() },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ pacienteId }) } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PacienteAvaliacaoFisioterapeuticaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  describe('with existing avaliacao', () => {
    beforeEach(async () => setup([mockAvaliacao]));

    it('should create and load patient and latest avaliacao', () => {
      expect(component).toBeTruthy();
      expect(pacienteServiceSpy.buscar).toHaveBeenCalledWith(1);
      expect(avaliacaoServiceSpy.listarPorPaciente).toHaveBeenCalledWith(1);
      expect(component.paciente).toEqual(mockPaciente);
      expect(component.avaliacao).toEqual(mockAvaliacao);
      expect(component.form.get('queixaFuncional')?.value).toBe('Dor no joelho direito');
      expect(component.form.get('dataAvaliacao')?.value).toBe('2026-05-03');
      expect(component.loading).toBeFalse();
    });

    it('should update an existing avaliacao and show success message', () => {
      const updated = { ...mockAvaliacao, diagnosticoFisioterapeutico: 'Gonalgia' };
      avaliacaoServiceSpy.atualizar.and.returnValue(of(updated));
      component.form.patchValue({ diagnosticoFisioterapeutico: 'Gonalgia' });

      component.salvar();

      expect(avaliacaoServiceSpy.atualizar).toHaveBeenCalledWith(
        5,
        jasmine.objectContaining({
          dataAvaliacao: '2026-05-03',
          queixaFuncional: 'Dor no joelho direito',
          escalaDor: 7,
          diagnosticoFisioterapeutico: 'Gonalgia'
        })
      );
      expect(component.avaliacao).toEqual(updated);
      expect(component.sucesso).toBe('Avaliação fisioterapêutica atualizada com sucesso.');
      expect(component.salvando).toBeFalse();
    });

    it('should send the loaded version and explain the concurrent-modification conflict', () => {
      avaliacaoServiceSpy.atualizar.and.returnValue(throwError(() => conflitoConcorrencia()));

      component.salvar();

      expect(avaliacaoServiceSpy.atualizar).toHaveBeenCalledWith(jasmine.any(Number), jasmine.objectContaining({ version: 0 }));
      expect(component.erro).toBe(MENSAGEM_CONFLITO_CONCORRENCIA);
      expect(component.salvando).toBeFalse();
    });

    it('should set erro when update fails', () => {
      avaliacaoServiceSpy.atualizar.and.returnValue(throwError(() => new Error('fail')));

      component.salvar();

      expect(component.erro).toBe('Erro ao salvar avaliação fisioterapêutica.');
      expect(component.salvando).toBeFalse();
    });
  });

  describe('without existing avaliacao', () => {
    beforeEach(async () => setup([]));

    it('should keep form empty when API returns an empty avaliacao list', () => {
      expect(component.paciente).toEqual(mockPaciente);
      expect(component.avaliacao).toBeNull();
      expect(component.form.get('queixaFuncional')?.value).toBe('');
      expect(component.loading).toBeFalse();
      expect(component.erro).toBeNull();
    });

    it('should create a new avaliacao and include pacienteId in payload', () => {
      avaliacaoServiceSpy.criar.and.returnValue(of(mockAvaliacao));
      component.form.patchValue({
        dataAvaliacao: '2026-05-03',
        queixaFuncional: 'Dor no joelho direito',
        escalaDor: 7,
        diagnosticoFisioterapeutico: 'Gonartrose'
      });

      component.salvar();

      expect(avaliacaoServiceSpy.criar).toHaveBeenCalledWith(
        jasmine.objectContaining({
          pacienteId: 1,
          dataAvaliacao: '2026-05-03',
          queixaFuncional: 'Dor no joelho direito',
          escalaDor: 7,
          diagnosticoFisioterapeutico: 'Gonartrose'
        })
      );
      expect(component.avaliacao).toEqual(mockAvaliacao);
      expect(component.sucesso).toBe('Avaliação fisioterapêutica cadastrada com sucesso.');
      expect(component.salvando).toBeFalse();
    });

    it('should not save when required fields are missing', () => {
      component.salvar();

      expect(avaliacaoServiceSpy.criar).not.toHaveBeenCalled();
      expect(component.form.get('dataAvaliacao')?.touched).toBeTrue();
      expect(component.form.get('queixaFuncional')?.touched).toBeTrue();
      expect(component.form.get('escalaDor')?.touched).toBeTrue();
      expect(component.form.get('diagnosticoFisioterapeutico')?.touched).toBeTrue();
    });

    it('should keep required text fields invalid when they contain only whitespace', () => {
      component.form.patchValue({
        dataAvaliacao: '2026-05-03',
        queixaFuncional: '   ',
        escalaDor: 5,
        diagnosticoFisioterapeutico: '   '
      });

      component.salvar();

      expect(avaliacaoServiceSpy.criar).not.toHaveBeenCalled();
      expect(component.form.get('queixaFuncional')?.hasError('pattern')).toBeTrue();
      expect(component.form.get('diagnosticoFisioterapeutico')?.hasError('pattern')).toBeTrue();
    });

    it('should keep escalaDor invalid when value is out of range', () => {
      component.form.patchValue({
        dataAvaliacao: '2026-05-03',
        queixaFuncional: 'Dor no joelho direito',
        escalaDor: 11,
        diagnosticoFisioterapeutico: 'Gonartrose'
      });

      component.salvar();

      expect(avaliacaoServiceSpy.criar).not.toHaveBeenCalled();
      expect(component.form.get('escalaDor')?.hasError('max')).toBeTrue();
    });
  });

  it('should not call services when pacienteId route param is invalid', async () => {
    await setup([], 'abc');

    expect(component.erro).toBe('Identificador inválido.');
    expect(component.parametroInvalido).toBeTrue();
    expect(pacienteServiceSpy.buscar).not.toHaveBeenCalled();
    expect(avaliacaoServiceSpy.listarPorPaciente).not.toHaveBeenCalled();
  });

  it('should set erro when patient loading fails', async () => {
    await setup([mockAvaliacao]);
    pacienteServiceSpy.buscar.and.returnValue(throwError(() => new Error('fail')));

    component.carregar();

    expect(component.erro).toBe('Erro ao carregar avaliação fisioterapêutica do paciente.');
    expect(component.loading).toBeFalse();
  });

  it('should set erro when listarPorPaciente fails', async () => {
    await setup([mockAvaliacao]);
    avaliacaoServiceSpy.listarPorPaciente.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 500 }))
    );

    component.carregar();

    expect(component.erro).toBe('Erro ao carregar avaliação fisioterapêutica do paciente.');
    expect(component.loading).toBeFalse();
  });

  describe('modo embutido (issue #305)', () => {
    async function setupEmbutido(avaliacoes: AvaliacaoFisioterapeuticaResponseDTO[]) {
      pacienteServiceSpy = jasmine.createSpyObj('PacienteService', ['buscar']);
      avaliacaoServiceSpy = jasmine.createSpyObj('AvaliacaoFisioterapeuticaService', ['listarPorPaciente', 'criar', 'atualizar']);
      pacienteServiceSpy.buscar.and.returnValue(of(mockPaciente));
      avaliacaoServiceSpy.listarPorPaciente.and.returnValue(of(avaliacoes));
      await TestBed.configureTestingModule({
        imports: [PacienteAvaliacaoFisioterapeuticaComponent, RouterTestingModule],
        providers: [
          { provide: PacienteService, useValue: pacienteServiceSpy },
          { provide: AvaliacaoFisioterapeuticaService, useValue: avaliacaoServiceSpy },
          { provide: PontoDorService, useValue: criarPontoDorSpy() },
          { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ pacienteId: '1' }) } } }
        ]
      }).compileComponents();
      fixture = TestBed.createComponent(PacienteAvaliacaoFisioterapeuticaComponent);
      component = fixture.componentInstance;
      fixture.componentRef.setInput('embutido', true);
      fixture.detectChanges();
    }

    function el(): HTMLElement {
      return fixture.nativeElement as HTMLElement;
    }

    it('should hide the page header, the Postural shortcut and the exit links', async () => {
      await setupEmbutido([mockAvaliacao]);
      expect(el().querySelector('h1')).toBeNull();
      expect(el().querySelector('app-breadcrumb')).toBeNull();
      expect(el().querySelector('a')).toBeNull();
      expect(el().querySelector('button[type="submit"]')?.textContent?.trim()).toBe('Salvar e continuar');
      expect(component.form.get('diagnosticoFisioterapeutico')?.value).toBe('Gonartrose');
    });

    it('should emit salvo with the updated assessment', async () => {
      await setupEmbutido([mockAvaliacao]);
      const emitidos: AvaliacaoFisioterapeuticaResponseDTO[] = [];
      component.salvo.subscribe(a => emitidos.push(a));
      const atualizada = { ...mockAvaliacao, version: 1 };
      avaliacaoServiceSpy.atualizar.and.returnValue(of(atualizada));

      component.salvar();

      expect(emitidos).toEqual([atualizada]);
    });

    it('should not emit salvo for an invalid form', async () => {
      await setupEmbutido([]);
      const emitido = jasmine.createSpy('salvo');
      component.salvo.subscribe(emitido);

      component.salvar();

      expect(avaliacaoServiceSpy.criar).not.toHaveBeenCalled();
      expect(emitido).not.toHaveBeenCalled();
    });
  });

  describe('mapa de dor (issue #307)', () => {
    const ponto: PontoDor = { vista: 'FRENTE', x: 0.4, y: 0.3, desenhoVersao: 1, intensidade: 6, observacao: null };
    const erro400 = new HttpErrorResponse({ status: 400, error: { detail: 'No máximo 50 pontos por registro.' } });

    function preencherObrigatorios(): void {
      component.form.patchValue({
        dataAvaliacao: '2026-05-03',
        queixaFuncional: 'Dor no joelho direito',
        escalaDor: 7,
        diagnosticoFisioterapeutico: 'Gonartrose'
      });
    }

    function mapa(): MapaCorporalComponent {
      return fixture.debugElement.query(By.directive(MapaCorporalComponent)).componentInstance as MapaCorporalComponent;
    }

    it('should load the points of the existing assessment into its own section', async () => {
      await setup([mockAvaliacao]);
      pontoDorServiceSpy.listar.and.returnValue(of([{ ...ponto, id: 9 }]));
      component.carregar();
      fixture.detectChanges();

      expect(pontoDorServiceSpy.listar).toHaveBeenCalledWith('AVALIACAO', 5);
      expect(component.mapaDor.pontos).toEqual([ponto]);
      expect((fixture.nativeElement as HTMLElement).querySelector('#mapa-dor-titulo')?.textContent).toContain('Mapa de dor');
      expect(mapa().lista).toEqual([ponto]);
    });

    it('should save the points with the id of a newly created assessment, after the POST', async () => {
      await setup([]);
      expect(pontoDorServiceSpy.listar).not.toHaveBeenCalled();
      avaliacaoServiceSpy.criar.and.returnValue(of(mockAvaliacao));
      mapa().pontosChange.emit([ponto]);
      preencherObrigatorios();

      component.salvar();

      expect(pontoDorServiceSpy.salvar).toHaveBeenCalledOnceWith('AVALIACAO', 5, [ponto]);
      expect(avaliacaoServiceSpy.criar).toHaveBeenCalledBefore(pontoDorServiceSpy.salvar);
      expect(component.mapaDor.alterado).toBeFalse();
      expect(component.sucesso).toBe('Avaliação fisioterapêutica cadastrada com sucesso.');
    });

    it('should not call the points endpoint when the map was not changed', async () => {
      await setup([mockAvaliacao]);
      avaliacaoServiceSpy.atualizar.and.returnValue(of(mockAvaliacao));

      component.salvar();

      expect(pontoDorServiceSpy.salvar).not.toHaveBeenCalled();
    });

    it('should keep the saved assessment and show the detail when the points are refused, retrying on the next save', async () => {
      await setup([]);
      avaliacaoServiceSpy.criar.and.returnValue(of(mockAvaliacao));
      pontoDorServiceSpy.salvar.and.returnValue(throwError(() => erro400));
      component.mapaDor.alterar([ponto]);
      preencherObrigatorios();

      component.salvar();

      expect(component.avaliacao).toEqual(mockAvaliacao);
      expect(component.erro).toBe('Avaliação fisioterapêutica salva, mas o mapa de dor não foi gravado: No máximo 50 pontos por registro.');
      expect(component.sucesso).toBeNull();
      expect(component.salvando).toBeFalse();

      avaliacaoServiceSpy.atualizar.and.returnValue(of(mockAvaliacao));
      pontoDorServiceSpy.salvar.and.returnValue(of([{ ...ponto, id: 1 }]));
      component.salvar();

      expect(avaliacaoServiceSpy.atualizar).toHaveBeenCalledTimes(1);
      expect(pontoDorServiceSpy.salvar).toHaveBeenCalledTimes(2);
      expect(component.erro).toBeNull();
    });

    it('should block the map and never send it when loading the points fails', async () => {
      await setup([mockAvaliacao]);
      pontoDorServiceSpy.listar.and.returnValue(throwError(() =>
        new HttpErrorResponse({ status: 403, error: { detail: 'Acesso restrito à equipe clínica.' } })));
      component.carregar();
      fixture.detectChanges();

      expect(component.mapaDor.erroCarga).toBe('Acesso restrito à equipe clínica.');
      expect(fixture.debugElement.query(By.directive(MapaCorporalComponent))).toBeNull();
      component.mapaDor.alterar([ponto]);
      avaliacaoServiceSpy.atualizar.and.returnValue(of(mockAvaliacao));
      component.salvar();
      expect(pontoDorServiceSpy.salvar).not.toHaveBeenCalled();
    });

    it('should save the points before telling the embedding flow, and hold the flow when they fail', async () => {
      pacienteServiceSpy = jasmine.createSpyObj('PacienteService', ['buscar']);
      avaliacaoServiceSpy = jasmine.createSpyObj('AvaliacaoFisioterapeuticaService', ['listarPorPaciente', 'criar', 'atualizar']);
      pacienteServiceSpy.buscar.and.returnValue(of(mockPaciente));
      avaliacaoServiceSpy.listarPorPaciente.and.returnValue(of([mockAvaliacao]));
      await TestBed.configureTestingModule({
        imports: [PacienteAvaliacaoFisioterapeuticaComponent, RouterTestingModule],
        providers: [
          { provide: PacienteService, useValue: pacienteServiceSpy },
          { provide: AvaliacaoFisioterapeuticaService, useValue: avaliacaoServiceSpy },
          { provide: PontoDorService, useValue: criarPontoDorSpy() },
          { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ pacienteId: '1' }) } } }
        ]
      }).compileComponents();
      fixture = TestBed.createComponent(PacienteAvaliacaoFisioterapeuticaComponent);
      component = fixture.componentInstance;
      fixture.componentRef.setInput('embutido', true);
      fixture.detectChanges();

      const salvo = jasmine.createSpy('salvo');
      component.salvo.subscribe(salvo);
      avaliacaoServiceSpy.atualizar.and.returnValue(of(mockAvaliacao));
      component.mapaDor.alterar([ponto]);
      pontoDorServiceSpy.salvar.and.returnValue(throwError(() => erro400));

      component.salvar();
      expect(salvo).not.toHaveBeenCalled();

      pontoDorServiceSpy.salvar.and.returnValue(of([{ ...ponto, id: 1 }]));
      component.salvar();
      expect(pontoDorServiceSpy.salvar).toHaveBeenCalledBefore(salvo);
      expect(salvo).toHaveBeenCalledOnceWith(mockAvaliacao);
    });
  });
});
