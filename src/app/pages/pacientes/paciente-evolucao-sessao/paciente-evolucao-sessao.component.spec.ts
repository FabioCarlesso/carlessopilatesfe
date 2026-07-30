import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { EvolucaoSessaoResponseDTO } from '../../../core/models/evolucao-sessao';
import { SessaoResponseDTO } from '../../../core/models/sessao';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { EvolucaoSessaoService } from '../../../core/services/evolucao-sessao.service';
import { SessaoService } from '../../../core/services/sessao.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { PacienteEvolucaoSessaoComponent } from './paciente-evolucao-sessao.component';

const mockPaciente: PacienteResponseDTO = {
  id: 10,
  nome: 'Ana Silva',
  email: 'ana@email.com',
  cpf: '123.456.789-00',
  telefone: '(11) 99999-9999',
  dataNascimento: '1990-05-15',
  endereco: null,
  ativo: true
};

const mockSessao: SessaoResponseDTO = {
  id: 5,
  pacienteId: 10,
  nomePaciente: 'Ana Silva',
  dataHora: '2026-05-10T10:00:00',
  tipo: 'PILATES',
  duracao: 60,
  profissionalId: null,
  nomeProfissional: null,
  status: 'REALIZADA',
  observacoes: null,
  dataCriacao: '2026-05-01T09:00:00',
  dataAtualizacao: null
};

const mockEvolucao: EvolucaoSessaoResponseDTO = {
  id: 1,
  sessaoId: 5,
  dataHoraRegistro: '2026-05-10T10:30:00',
  exerciciosRealizados: 'Agachamento, ponte.',
  equipamentosUtilizados: 'Reformer',
  cargasMolas: 'Mola 3',
  dorAntes: 5,
  dorDepois: 2,
  respostaPaciente: 'Boa evolução clínica.',
  intercorrencias: null,
  orientacoes: 'Manter exercícios respiratórios.',
  observacoesFisioterapeuta: 'Paciente relatou melhora da lombalgia.',
  dataCriacao: '2026-05-10T10:30:00',
  dataAtualizacao: null
};

describe('PacienteEvolucaoSessaoComponent', () => {
  let component: PacienteEvolucaoSessaoComponent;
  let fixture: ComponentFixture<PacienteEvolucaoSessaoComponent>;
  let pacienteServiceSpy: jasmine.SpyObj<PacienteService>;
  let sessaoServiceSpy: jasmine.SpyObj<SessaoService>;
  let evolucaoSessaoServiceSpy: jasmine.SpyObj<EvolucaoSessaoService>;

  async function setup(
    params: { pacienteId: string; sessaoId: string } = { pacienteId: '10', sessaoId: '5' },
    evolucao: EvolucaoSessaoResponseDTO | null = mockEvolucao,
    sessao: SessaoResponseDTO = mockSessao
  ) {
    pacienteServiceSpy = jasmine.createSpyObj('PacienteService', ['buscar']);
    sessaoServiceSpy = jasmine.createSpyObj('SessaoService', ['buscar']);
    evolucaoSessaoServiceSpy = jasmine.createSpyObj('EvolucaoSessaoService', [
      'buscarPorSessao',
      'criar',
      'atualizar'
    ]);

    pacienteServiceSpy.buscar.and.returnValue(of(mockPaciente));
    sessaoServiceSpy.buscar.and.returnValue(of(sessao));
    evolucaoSessaoServiceSpy.buscarPorSessao.and.returnValue(
      evolucao === null
        ? throwError(() => new HttpErrorResponse({ status: 404 }))
        : of(evolucao)
    );

    await TestBed.configureTestingModule({
      imports: [PacienteEvolucaoSessaoComponent, RouterTestingModule],
      providers: [
        { provide: PacienteService, useValue: pacienteServiceSpy },
        { provide: SessaoService, useValue: sessaoServiceSpy },
        { provide: EvolucaoSessaoService, useValue: evolucaoSessaoServiceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(params) } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PacienteEvolucaoSessaoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => TestBed.resetTestingModule());

  function ordemDosCampos(): (string | null)[] {
    const grupos: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('form .form-group'));
    return grupos.map(grupo => grupo.querySelector('[formControlName]')?.getAttribute('formControlName') ?? null);
  }

  describe('with existing evolucao', () => {
    beforeEach(async () => setup());

    it('should create and load patient, session and evolution', () => {
      expect(component).toBeTruthy();
      expect(pacienteServiceSpy.buscar).toHaveBeenCalledWith(10);
      expect(sessaoServiceSpy.buscar).toHaveBeenCalledWith(5);
      expect(evolucaoSessaoServiceSpy.buscarPorSessao).toHaveBeenCalledWith(5);
      expect(component.paciente).toEqual(mockPaciente);
      expect(component.sessao).toEqual(mockSessao);
      expect(component.evolucao).toEqual(mockEvolucao);
      expect(component.loading).toBeFalse();
    });

    it('should pre-fill form with existing evolution data', () => {
      expect(component.form.get('dataHoraRegistro')?.value).toBe('2026-05-10T10:30');
      expect(component.form.get('exerciciosRealizados')?.value).toBe('Agachamento, ponte.');
      expect(component.form.get('equipamentosUtilizados')?.value).toBe('Reformer');
      expect(component.form.get('cargasMolas')?.value).toBe('Mola 3');
      expect(component.form.get('dorAntes')?.value).toBe(5);
      expect(component.form.get('dorDepois')?.value).toBe(2);
      expect(component.form.get('respostaPaciente')?.value).toBe('Boa evolução clínica.');
      expect(component.form.get('orientacoes')?.value).toBe('Manter exercícios respiratórios.');
      expect(component.form.get('observacoesFisioterapeuta')?.value)
        .toBe('Paciente relatou melhora da lombalgia.');
    });

    it('should render observacoesFisioterapeuta right after dataHoraRegistro and orientacoes last', () => {
      const ordem = ordemDosCampos();

      expect(ordem.slice(0, 3)).toEqual([
        'dataHoraRegistro',
        'observacoesFisioterapeuta',
        'exerciciosRealizados'
      ]);
      expect(ordem[ordem.length - 1]).toBe('orientacoes');
    });

    it('should fill observacoesFisioterapeuta in its new position', () => {
      const textarea: HTMLTextAreaElement =
        fixture.nativeElement.querySelector('#observacoesFisioterapeuta');

      expect(textarea.value).toBe('Paciente relatou melhora da lombalgia.');
      expect(textarea.rows).toBe(3);
    });

    it('should update existing evolution and show success message', () => {
      const updated = { ...mockEvolucao, dorDepois: 1 };
      evolucaoSessaoServiceSpy.atualizar.and.returnValue(of(updated));
      component.form.patchValue({ dorDepois: 1 });

      component.salvar();

      expect(evolucaoSessaoServiceSpy.atualizar).toHaveBeenCalledWith(
        1,
        jasmine.objectContaining({
          dataHoraRegistro: '2026-05-10T10:30',
          dorAntes: 5,
          dorDepois: 1
        })
      );
      expect(component.evolucao).toEqual(updated);
      expect(component.sucesso).toBe('Evolução atualizada com sucesso.');
      expect(component.salvando).toBeFalse();
    });

    it('should set erro when update fails', () => {
      evolucaoSessaoServiceSpy.atualizar.and.returnValue(throwError(() => new Error('fail')));

      component.salvar();

      expect(component.erro).toBe('Erro ao salvar evolução.');
      expect(component.salvando).toBeFalse();
    });
  });

  describe('without existing evolucao (404)', () => {
    beforeEach(async () => setup({ pacienteId: '10', sessaoId: '5' }, null));

    it('should keep optional fields empty when API returns 404 for evolucao', () => {
      expect(component.paciente).toEqual(mockPaciente);
      expect(component.sessao).toEqual(mockSessao);
      expect(component.evolucao).toBeNull();
      expect(component.form.get('dataHoraRegistro')?.value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
      expect(component.form.get('exerciciosRealizados')?.value).toBe('');
      expect(component.loading).toBeFalse();
      expect(component.erro).toBeNull();
    });

    it('should create a new evolucao and include backend contract fields in payload', () => {
      evolucaoSessaoServiceSpy.criar.and.returnValue(of(mockEvolucao));
      component.form.patchValue({
        dataHoraRegistro: '2026-05-10T10:30',
        exerciciosRealizados: 'Reformer, Cadillac',
        equipamentosUtilizados: 'Reformer',
        cargasMolas: 'Mola 3',
        dorAntes: 5,
        dorDepois: 2,
        respostaPaciente: 'Boa evolução',
        intercorrencias: 'Sem intercorrências',
        orientacoes: 'Manter exercícios',
        observacoesFisioterapeuta: 'Progresso notável'
      });

      component.salvar();

      expect(evolucaoSessaoServiceSpy.criar).toHaveBeenCalledWith(
        jasmine.objectContaining({
          sessaoId: 5,
          dataHoraRegistro: '2026-05-10T10:30',
          exerciciosRealizados: 'Reformer, Cadillac',
          equipamentosUtilizados: 'Reformer',
          cargasMolas: 'Mola 3',
          dorAntes: 5,
          dorDepois: 2,
          respostaPaciente: 'Boa evolução',
          intercorrencias: 'Sem intercorrências',
          orientacoes: 'Manter exercícios',
          observacoesFisioterapeuta: 'Progresso notável'
        })
      );
      expect(component.evolucao).toEqual(mockEvolucao);
      expect(component.sucesso).toBe('Evolução cadastrada com sucesso.');
      expect(component.salvando).toBeFalse();
    });

    it('should not save when dataHoraRegistro is missing', () => {
      component.form.patchValue({ dataHoraRegistro: '' });

      component.salvar();

      expect(evolucaoSessaoServiceSpy.criar).not.toHaveBeenCalled();
      expect(component.form.get('dataHoraRegistro')?.touched).toBeTrue();
    });

    it('should reject dorAntes out of range', () => {
      component.form.patchValue({ dorAntes: 15 });

      component.salvar();

      expect(evolucaoSessaoServiceSpy.criar).not.toHaveBeenCalled();
      expect(component.form.get('dorAntes')?.hasError('max')).toBeTrue();
    });

    it('should reject dorDepois out of range', () => {
      component.form.patchValue({ dorDepois: -1 });

      component.salvar();

      expect(evolucaoSessaoServiceSpy.criar).not.toHaveBeenCalled();
      expect(component.form.get('dorDepois')?.hasError('min')).toBeTrue();
    });

    it('should set erro when create returns a validation or conflict error', () => {
      evolucaoSessaoServiceSpy.criar.and.returnValue(
        throwError(() => new HttpErrorResponse({ status: 409 }))
      );
      component.form.patchValue({ dataHoraRegistro: '2026-05-10T10:30' });

      component.salvar();

      expect(component.erro).toBe('Erro ao salvar evolução.');
      expect(component.salvando).toBeFalse();
    });
  });

  it('should reject a session that belongs to another patient without loading evolution', async () => {
    await setup(
      { pacienteId: '10', sessaoId: '5' },
      mockEvolucao,
      { ...mockSessao, pacienteId: 99 }
    );

    expect(component.parametroInvalido).toBeTrue();
    expect(component.erro).toBe('Sessão não pertence ao paciente informado.');
    expect(component.sessao).toBeNull();
    expect(evolucaoSessaoServiceSpy.buscarPorSessao).not.toHaveBeenCalled();
  });

  it('should set parametroInvalido when pacienteId is invalid', async () => {
    await setup({ pacienteId: 'abc', sessaoId: '5' });

    expect(component.erro).toBe('Identificador inválido.');
    expect(component.parametroInvalido).toBeTrue();
    expect(pacienteServiceSpy.buscar).not.toHaveBeenCalled();
  });

  it('should set parametroInvalido when sessaoId is invalid', async () => {
    await setup({ pacienteId: '10', sessaoId: 'xyz' });

    expect(component.erro).toBe('Identificador inválido.');
    expect(component.parametroInvalido).toBeTrue();
    expect(sessaoServiceSpy.buscar).not.toHaveBeenCalled();
  });

  it('should set erro when loading patient or session fails', async () => {
    await setup();
    pacienteServiceSpy.buscar.and.returnValue(throwError(() => new Error('fail')));

    component.carregar();

    expect(component.erro).toBe('Erro ao carregar dados da evolução.');
    expect(component.loading).toBeFalse();
  });

  it('should set erro when buscarPorSessao returns a non-404 error', async () => {
    await setup();
    evolucaoSessaoServiceSpy.buscarPorSessao.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 500 }))
    );

    component.carregar();

    expect(component.erro).toBe('Erro ao carregar dados da evolução.');
    expect(component.loading).toBeFalse();
  });
});
