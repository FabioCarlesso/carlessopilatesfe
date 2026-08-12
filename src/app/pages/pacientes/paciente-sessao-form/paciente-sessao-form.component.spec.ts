import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { SessaoResponseDTO } from '../../../core/models/sessao';
import { BloqueioAgendaResponseDTO } from '../../../core/models/bloqueio-agenda';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { BloqueioAgendaService } from '../../../core/services/bloqueio-agenda.service';
import { SessaoService } from '../../../core/services/sessao.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { PacienteSessaoFormComponent } from './paciente-sessao-form.component';

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
  id: 1,
  pacienteId: 10,
  nomePaciente: 'Ana Silva',
  dataHora: '2026-05-10T10:00',
  tipo: 'PILATES',
  duracao: 60,
  profissionalId: null,
  nomeProfissional: null,
  status: 'AGENDADA',
  observacoes: null,
  dataCriacao: '2026-05-01T09:00:00',
  dataAtualizacao: null
};

const bloqueioDaManha: BloqueioAgendaResponseDTO = {
  id: 1,
  dataInicio: '2026-05-10',
  dataFim: '2026-05-10',
  horaInicio: '08:00:00',
  horaFim: '12:00:00',
  diaInteiro: false,
  motivo: 'Manutenção dos equipamentos',
  dataCriacao: '2026-01-02T09:00:00',
  dataAtualizacao: null
};

describe('PacienteSessaoFormComponent', () => {
  let component: PacienteSessaoFormComponent;
  let fixture: ComponentFixture<PacienteSessaoFormComponent>;
  let pacienteServiceSpy: jasmine.SpyObj<PacienteService>;
  let sessaoServiceSpy: jasmine.SpyObj<SessaoService>;
  let bloqueioServiceSpy: jasmine.SpyObj<BloqueioAgendaService>;
  let router: Router;

  async function setup(
    params: { pacienteId: string; id?: string } = { pacienteId: '10' },
    sessao: SessaoResponseDTO = mockSessao,
    bloqueios: BloqueioAgendaResponseDTO[] = []
  ) {
    pacienteServiceSpy = jasmine.createSpyObj('PacienteService', ['buscar']);
    sessaoServiceSpy = jasmine.createSpyObj('SessaoService', [
      'listarPorPaciente',
      'buscar',
      'criar',
      'atualizar',
      'realizar',
      'cancelar'
    ]);
    bloqueioServiceSpy = jasmine.createSpyObj('BloqueioAgendaService', ['listarPorPeriodo']);
    bloqueioServiceSpy.listarPorPeriodo.and.returnValue(of(bloqueios));

    pacienteServiceSpy.buscar.and.returnValue(of(mockPaciente));

    if (params.id) {
      sessaoServiceSpy.buscar.and.returnValue(of(sessao));
    }

    await TestBed.configureTestingModule({
      imports: [PacienteSessaoFormComponent, RouterTestingModule],
      providers: [
        { provide: PacienteService, useValue: pacienteServiceSpy },
        { provide: SessaoService, useValue: sessaoServiceSpy },
        { provide: BloqueioAgendaService, useValue: bloqueioServiceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(params) } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PacienteSessaoFormComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  }

  afterEach(() => TestBed.resetTestingModule());

  describe('create mode (no id param)', () => {
    beforeEach(async () => setup({ pacienteId: '10' }));

    it('should create component in create mode', () => {
      expect(component).toBeTruthy();
      expect(component.modoEdicao).toBeFalse();
      expect(component.sessao).toBeNull();
      expect(component.paciente).toEqual(mockPaciente);
    });

    it('should have default values in form', () => {
      expect(component.form.get('tipo')?.value).toBe('PILATES');
      expect(component.form.get('status')?.value).toBe('AGENDADA');
      expect(component.form.get('dataHora')?.value).toBe('');
    });

    it('should keep tipo and profissionalId editable', () => {
      expect(component.form.get('tipo')?.enabled).toBeTrue();
      expect(component.form.get('profissionalId')?.enabled).toBeTrue();
    });

    it('should not submit when required fields are missing', () => {
      component.salvar();

      expect(sessaoServiceSpy.criar).not.toHaveBeenCalled();
      expect(component.form.get('dataHora')?.touched).toBeTrue();
      expect(component.form.get('duracao')?.touched).toBeTrue();
    });

    it('should keep duracao invalid when out of range', () => {
      component.form.patchValue({
        dataHora: '2026-05-10T10:00',
        tipo: 'PILATES',
        duracao: 500
      });

      component.salvar();

      expect(sessaoServiceSpy.criar).not.toHaveBeenCalled();
      expect(component.form.get('duracao')?.hasError('max')).toBeTrue();
    });

    it('should keep profissionalId invalid when it is not a positive integer', () => {
      component.form.patchValue({
        dataHora: '2026-05-10T10:00',
        tipo: 'PILATES',
        duracao: 60,
        profissionalId: -1
      });

      component.salvar();

      expect(sessaoServiceSpy.criar).not.toHaveBeenCalled();
      expect(component.form.get('profissionalId')?.invalid).toBeTrue();
    });

    it('should create without sending status in request body', () => {
      sessaoServiceSpy.criar.and.returnValue(of(mockSessao));
      spyOn(router, 'navigate');
      component.form.patchValue({
        dataHora: '2026-05-10T10:00',
        tipo: 'PILATES',
        duracao: 60,
        status: 'CANCELADA'
      });

      component.salvar();

      expect(sessaoServiceSpy.criar).toHaveBeenCalledWith(jasmine.objectContaining({
        pacienteId: 10,
        dataHora: '2026-05-10T10:00',
        tipo: 'PILATES',
        duracao: 60
      }));
      const dto = sessaoServiceSpy.criar.calls.mostRecent().args[0] as unknown as Record<string, unknown>;
      expect(dto['status']).toBeUndefined();
    });

    it('should navigate to sessoes list after successful create', () => {
      sessaoServiceSpy.criar.and.returnValue(of(mockSessao));
      const navigateSpy = spyOn(router, 'navigate');
      component.form.patchValue({
        dataHora: '2026-05-10T10:00',
        tipo: 'PILATES',
        duracao: 60
      });

      component.salvar();

      expect(navigateSpy).toHaveBeenCalledWith(['/pacientes', 10, 'sessoes']);
    });

    it('should set erro when loading fails', async () => {
      pacienteServiceSpy.buscar.and.returnValue(throwError(() => new Error('fail')));

      component.carregar();

      expect(component.erro).toBe('Erro ao carregar dados da sessão.');
      expect(component.loading).toBeFalse();
    });
  });

  describe('edit mode (with id param)', () => {
    beforeEach(async () => setup({ pacienteId: '10', id: '1' }));

    it('should create component in edit mode and load existing session', () => {
      expect(component).toBeTruthy();
      expect(component.modoEdicao).toBeTrue();
      expect(component.sessao).toEqual(mockSessao);
      expect(sessaoServiceSpy.buscar).toHaveBeenCalledWith(1);
    });

    it('should pre-fill form with existing session data', () => {
      expect(component.form.get('dataHora')?.value).toBe('2026-05-10T10:00');
      expect(component.form.get('tipo')?.value).toBe('PILATES');
      expect(component.form.get('duracao')?.value).toBe(60);
      expect(component.form.get('status')?.value).toBe('AGENDADA');
    });

    it('should disable tipo, profissionalId and status', () => {
      expect(component.form.get('tipo')?.disabled).toBeTrue();
      expect(component.form.get('profissionalId')?.disabled).toBeTrue();
      expect(component.form.get('status')?.disabled).toBeTrue();
      expect(component.form.get('dataHora')?.enabled).toBeTrue();
      expect(component.form.get('duracao')?.enabled).toBeTrue();
      expect(component.form.get('observacoes')?.enabled).toBeTrue();
    });

    it('should render tipo, profissionalId and status as disabled controls', () => {
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector<HTMLSelectElement>('#tipo')?.disabled).toBeTrue();
      expect(el.querySelector<HTMLSelectElement>('#status')?.disabled).toBeTrue();
      expect(el.querySelector<HTMLInputElement>('#profissionalId')?.disabled).toBeTrue();
    });

    it('should call atualizar only with dataHora, duracao and observacoes', () => {
      const updated = { ...mockSessao, duracao: 45 };
      sessaoServiceSpy.atualizar.and.returnValue(of(updated));
      component.form.patchValue({ duracao: 45 });

      component.salvar();

      expect(sessaoServiceSpy.atualizar).toHaveBeenCalledWith(1, {
        dataHora: '2026-05-10T10:00',
        duracao: 45,
        observacoes: null
      });
      expect(component.sucesso).toBe('Sessão atualizada com sucesso.');
      expect(component.salvando).toBeFalse();
    });

    it('should not send tipo, profissionalId or status even if their values change', () => {
      sessaoServiceSpy.atualizar.and.returnValue(of(mockSessao));
      component.form.patchValue({ tipo: 'FISIOTERAPIA', profissionalId: 7, status: 'REALIZADA' });

      component.salvar();

      const dto = sessaoServiceSpy.atualizar.calls.mostRecent().args[1] as unknown as Record<string, unknown>;
      expect(Object.keys(dto).sort()).toEqual(['dataHora', 'duracao', 'observacoes']);
    });

    it('should set erro when update fails', () => {
      sessaoServiceSpy.atualizar.and.returnValue(throwError(() => new Error('fail')));

      component.salvar();

      expect(component.erro).toBe('Erro ao salvar sessão.');
      expect(component.salvando).toBeFalse();
    });
  });

  it('should reject a session that belongs to another patient', async () => {
    await setup({ pacienteId: '10', id: '1' }, { ...mockSessao, pacienteId: 99 });

    expect(component.parametroInvalido).toBeTrue();
    expect(component.erro).toBe('Sessão não pertence ao paciente informado.');
    expect(component.sessao).toBeNull();
  });

  it('should set parametroInvalido and erro when pacienteId is invalid', async () => {
    await setup({ pacienteId: 'abc' });

    expect(component.erro).toBe('Identificador inválido.');
    expect(component.parametroInvalido).toBeTrue();
    expect(pacienteServiceSpy.buscar).not.toHaveBeenCalled();
  });

  it('should set parametroInvalido and erro when sessao id is invalid', async () => {
    await setup({ pacienteId: '10', id: 'abc' });

    expect(component.erro).toBe('Identificador inválido.');
    expect(component.parametroInvalido).toBeTrue();
    expect(pacienteServiceSpy.buscar).not.toHaveBeenCalled();
    expect(sessaoServiceSpy.buscar).not.toHaveBeenCalled();
  });

  // Aviso de estúdio bloqueado (issue #135). O bloqueio é informativo na API:
  // ele avisa, mas não impede o agendamento.
  describe('aviso de bloqueio', () => {
    function aviso(): string {
      return (fixture.nativeElement as HTMLElement)
        .querySelector('.bloqueio-aviso')?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    }

    /**
     * A consulta passa por `debounceTime(250)`: o segmento de ano do
     * `datetime-local` emite um valor completo por dígito digitado, e sem a
     * espera cada um viraria uma requisição.
     */
    async function aguardarDebounce(): Promise<void> {
      await new Promise(resolve => setTimeout(resolve, 320));
    }

    it('should not query the blocks before a date is chosen', async () => {
      await setup({ pacienteId: '10' });

      expect(bloqueioServiceSpy.listarPorPeriodo).not.toHaveBeenCalled();
      expect(component.avisoBloqueio).toBeNull();
    });

    // Só o dia, e não um período: o formulário agenda uma sessão por vez.
    it('should query only the chosen day', async () => {
      await setup({ pacienteId: '10' });

      component.form.patchValue({ dataHora: '2026-05-10T09:00' });
      await aguardarDebounce();

      expect(bloqueioServiceSpy.listarPorPeriodo).toHaveBeenCalledWith('2026-05-10', '2026-05-10');
    });

    // O `distinctUntilChanged` é sobre o dia: trocar só a hora não pode custar
    // uma requisição a cada digitação.
    it('should not query again when only the time changes', async () => {
      await setup({ pacienteId: '10' });
      component.form.patchValue({ dataHora: '2026-05-10T09:00' });
      await aguardarDebounce();
      bloqueioServiceSpy.listarPorPeriodo.calls.reset();

      component.form.patchValue({ dataHora: '2026-05-10T15:00' });
      await aguardarDebounce();

      expect(bloqueioServiceSpy.listarPorPeriodo).not.toHaveBeenCalled();
    });

    // O `debounceTime` cobre o que o `distinct` não alcança: digitar o ano do
    // `datetime-local` emite um dia completo e distinto por dígito.
    it('should collapse the intermediate days typed into the year segment', async () => {
      await setup({ pacienteId: '10' });

      for (const dia of ['0002-05-10', '0020-05-10', '0202-05-10', '2026-05-10']) {
        component.form.patchValue({ dataHora: `${dia}T09:00` });
      }
      await aguardarDebounce();

      expect(bloqueioServiceSpy.listarPorPeriodo).toHaveBeenCalledTimes(1);
      expect(bloqueioServiceSpy.listarPorPeriodo).toHaveBeenCalledWith('2026-05-10', '2026-05-10');
    });

    it('should warn when the chosen time falls inside a block', async () => {
      await setup({ pacienteId: '10' }, mockSessao, [bloqueioDaManha]);

      component.form.patchValue({ dataHora: '2026-05-10T09:00', duracao: 60 });
      await aguardarDebounce();
      fixture.detectChanges();

      expect(component.avisoBloqueio)
        .toBe('Manutenção dos equipamentos — 10/05/2026, das 08:00 às 12:00');
      expect(aviso()).toContain('Estúdio bloqueado neste horário.');
      expect(aviso()).toContain('O agendamento continua permitido');
    });

    it('should not warn when the chosen time is outside the block range', async () => {
      await setup({ pacienteId: '10' }, mockSessao, [bloqueioDaManha]);

      component.form.patchValue({ dataHora: '2026-05-10T14:00', duracao: 60 });
      await aguardarDebounce();
      fixture.detectChanges();

      expect(component.avisoBloqueio).toBeNull();
      expect(aviso()).toBe('');
    });

    // A duração estende a sessão até dentro da faixa; o aviso acompanha sem
    // nova ida à API.
    it('should warn when the duration pushes the session into the block', async () => {
      await setup({ pacienteId: '10' }, mockSessao, [bloqueioDaManha]);
      component.form.patchValue({ dataHora: '2026-05-10T07:00', duracao: 30 });
      await aguardarDebounce();
      fixture.detectChanges();
      expect(component.avisoBloqueio).toBeNull();

      bloqueioServiceSpy.listarPorPeriodo.calls.reset();
      component.form.patchValue({ duracao: 120 });
      fixture.detectChanges();

      expect(component.avisoBloqueio).not.toBeNull();
      expect(bloqueioServiceSpy.listarPorPeriodo).not.toHaveBeenCalled();
    });

    // Impedir o agendamento porque a consulta de feriados caiu seria pior do
    // que não avisar.
    it('should stay silent when the blocks request fails', async () => {
      await setup({ pacienteId: '10' });
      bloqueioServiceSpy.listarPorPeriodo.and.returnValue(throwError(() => new Error('fail')));

      component.form.patchValue({ dataHora: '2026-05-10T09:00', duracao: 60 });
      await aguardarDebounce();
      fixture.detectChanges();

      expect(component.avisoBloqueio).toBeNull();
      expect(component.erro).toBeNull();
    });

    it('should not block saving a session inside a blocked range', async () => {
      await setup({ pacienteId: '10' }, mockSessao, [bloqueioDaManha]);
      sessaoServiceSpy.criar.and.returnValue(of(mockSessao));
      spyOn(router, 'navigate');
      component.form.patchValue({ dataHora: '2026-05-10T09:00', tipo: 'PILATES', duracao: 60 });
      await aguardarDebounce();

      component.salvar();

      expect(sessaoServiceSpy.criar).toHaveBeenCalled();
    });

    // Na edição é o `patchValue` da sessão carregada que dispara a consulta, e a
    // inscrição precisa já existir quando ele acontece.
    it('should evaluate the block of a session opened for editing', async () => {
      await setup({ pacienteId: '10', id: '1' }, mockSessao, [bloqueioDaManha]);
      await aguardarDebounce();
      fixture.detectChanges();

      expect(bloqueioServiceSpy.listarPorPeriodo).toHaveBeenCalledWith('2026-05-10', '2026-05-10');
      expect(component.avisoBloqueio)
        .toBe('Manutenção dos equipamentos — 10/05/2026, das 08:00 às 12:00');
    });
  });
});
