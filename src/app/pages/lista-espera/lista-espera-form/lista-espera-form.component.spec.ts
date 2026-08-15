import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { Page } from '../../../core/models/common';
import { ListaEsperaResponseDTO } from '../../../core/models/lista-espera';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { ListaEsperaService } from '../../../core/services/lista-espera.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { ListaEsperaFormComponent } from './lista-espera-form.component';

const ana: PacienteResponseDTO = {
  id: 10,
  nome: 'Ana Souza',
  email: 'ana@email.com',
  cpf: '123.456.789-00',
  telefone: '(11) 99999-9999',
  dataNascimento: '1990-05-15',
  endereco: null,
  ativo: true
};

const paginaDePacientes: Page<PacienteResponseDTO> = {
  content: [ana],
  page: { totalElements: 1, totalPages: 1, size: 8, number: 0 }
};

const entradaCriada: ListaEsperaResponseDTO = {
  id: 1,
  pacienteId: 10,
  pacienteNome: 'Ana Souza',
  diaSemana: 'WEDNESDAY',
  horaInicio: '08:00:00',
  horaFim: '09:00:00',
  dataEntrada: '2026-05-20T09:00:00',
  observacao: null
};

describe('ListaEsperaFormComponent', () => {
  let component: ListaEsperaFormComponent;
  let fixture: ComponentFixture<ListaEsperaFormComponent>;
  let serviceSpy: jasmine.SpyObj<ListaEsperaService>;
  let pacienteServiceSpy: jasmine.SpyObj<PacienteService>;
  let navigateSpy: jasmine.Spy;

  async function setup() {
    serviceSpy = jasmine.createSpyObj('ListaEsperaService', ['criar']);
    pacienteServiceSpy = jasmine.createSpyObj('PacienteService', ['listar']);

    serviceSpy.criar.and.returnValue(of(entradaCriada));
    pacienteServiceSpy.listar.and.returnValue(of(paginaDePacientes));

    await TestBed.configureTestingModule({
      imports: [ListaEsperaFormComponent, RouterTestingModule],
      providers: [
        { provide: ListaEsperaService, useValue: serviceSpy },
        { provide: PacienteService, useValue: pacienteServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ListaEsperaFormComponent);
    component = fixture.componentInstance;
    navigateSpy = spyOn(TestBed.inject(Router), 'navigate');
    fixture.detectChanges();
  }

  function texto(seletor: string): string {
    return (fixture.nativeElement as HTMLElement).querySelector(seletor)?.textContent?.trim() ?? '';
  }

  function todos(seletor: string): HTMLElement[] {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll(seletor));
  }

  /** Preenche tudo menos o paciente, que entra pela busca. */
  function preencherHorario(): void {
    component.form.patchValue({ diaSemana: 'WEDNESDAY', horaInicio: '08:00', horaFim: '09:00' });
  }

  function buscar(termo: string): void {
    component.busca.setValue(termo);
    tick(300);
    fixture.detectChanges();
  }

  afterEach(() => TestBed.resetTestingModule());

  it('should create with an empty form', async () => {
    await setup();

    expect(component).toBeTruthy();
    expect(component.form.get('pacienteId')?.value).toBeNull();
    expect(component.form.get('diaSemana')?.value).toBe('');
  });

  describe('busca de paciente', () => {
    // Termos curtos trariam quase a base inteira; os mesmos números da busca
    // global da navbar.
    it('should not search with fewer than two characters', fakeAsync(async () => {
      await setup();

      buscar('a');

      expect(pacienteServiceSpy.listar).not.toHaveBeenCalled();
      expect(component.sugestoes).toEqual([]);
    }));

    it('should search only active patients by name', fakeAsync(async () => {
      await setup();

      buscar('ana');

      expect(pacienteServiceSpy.listar).toHaveBeenCalledWith(0, 8, { nome: 'ana', ativo: true }, 'nome');
      expect(component.sugestoes).toEqual([ana]);
      expect(todos('.sugestao').length).toBe(1);
    }));

    it('should keep the chosen patient and clear the search', fakeAsync(async () => {
      await setup();
      buscar('ana');
      pacienteServiceSpy.listar.calls.reset();

      (todos('.sugestao')[0] as HTMLButtonElement).click();
      tick(300);
      fixture.detectChanges();

      expect(component.form.get('pacienteId')?.value).toBe(10);
      expect(texto('.paciente-selecionado')).toContain('Ana Souza');
      // O termo vazio atravessa o pipe (para não travar o `distinct`), mas é
      // curto demais para custar requisição.
      expect(pacienteServiceSpy.listar).not.toHaveBeenCalled();
    }));

    // Sem emitir a limpeza, `distinctUntilChanged` guardaria "ana" e trocar de
    // paciente digitando o mesmo nome de novo não buscaria nada.
    it('should search again for a name already searched before', fakeAsync(async () => {
      await setup();
      buscar('ana');
      (todos('.sugestao')[0] as HTMLButtonElement).click();
      component.limparPaciente();
      fixture.detectChanges();
      pacienteServiceSpy.listar.calls.reset();

      buscar('ana');

      expect(pacienteServiceSpy.listar).toHaveBeenCalledWith(0, 8, { nome: 'ana', ativo: true }, 'nome');
      expect(component.sugestoes).toEqual([ana]);
    }));

    it('should allow swapping the chosen patient', fakeAsync(async () => {
      await setup();
      buscar('ana');
      (todos('.sugestao')[0] as HTMLButtonElement).click();
      fixture.detectChanges();

      (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.paciente-selecionado button')?.click();
      fixture.detectChanges();

      expect(component.pacienteSelecionado).toBeNull();
      expect(component.form.get('pacienteId')?.value).toBeNull();
      expect(todos('#buscaPaciente').length).toBe(1);
    }));

    // Lista vazia por falha de rede não pode ser lida como "o paciente não
    // existe"; o formulário em si continua válido.
    it('should tell a failed search apart from an empty one', fakeAsync(async () => {
      await setup();
      pacienteServiceSpy.listar.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

      buscar('ana');

      expect(component.buscaFalhou).toBeTrue();
      expect(texto('.sugestao-status')).toBe('Não foi possível buscar agora.');
      expect(component.erro).toBeNull();
    }));
  });

  describe('salvar', () => {
    it('should not submit without a patient', async () => {
      await setup();
      preencherHorario();

      component.salvar();
      fixture.detectChanges();

      expect(serviceSpy.criar).not.toHaveBeenCalled();
      expect(texto('.invalid-feedback[role="alert"]')).toBe('Selecione o paciente interessado.');
    });

    it('should not submit an inverted time range', fakeAsync(async () => {
      await setup();
      buscar('ana');
      (todos('.sugestao')[0] as HTMLButtonElement).click();
      component.form.patchValue({ diaSemana: 'WEDNESDAY', horaInicio: '10:00', horaFim: '09:00' });

      component.salvar();
      fixture.detectChanges();

      expect(serviceSpy.criar).not.toHaveBeenCalled();
      expect(texto('.invalid-feedback[role="alert"]')).toBe('A hora final deve ser posterior à inicial.');
    }));

    it('should post the entry and return to the queue', fakeAsync(async () => {
      await setup();
      buscar('ana');
      (todos('.sugestao')[0] as HTMLButtonElement).click();
      preencherHorario();
      component.form.patchValue({ observacao: '  Prefere aparelho  ' });

      component.salvar();

      expect(serviceSpy.criar).toHaveBeenCalledWith({
        pacienteId: 10,
        diaSemana: 'WEDNESDAY',
        horaInicio: '08:00',
        horaFim: '09:00',
        observacao: 'Prefere aparelho'
      });
      expect(navigateSpy).toHaveBeenCalledWith(['/lista-espera']);
    }));

    // Mandar `""` gravaria uma observação em branco que a listagem exibiria
    // como se existisse.
    it('should send a null observation when the field is blank', fakeAsync(async () => {
      await setup();
      buscar('ana');
      (todos('.sugestao')[0] as HTMLButtonElement).click();
      preencherHorario();
      component.form.patchValue({ observacao: '   ' });

      component.salvar();

      expect(serviceSpy.criar).toHaveBeenCalledWith(jasmine.objectContaining({ observacao: null }));
    }));

    // O 409 da API já diz que o paciente está na fila desse dia e faixa, e é
    // mais específico do que qualquer coisa que o formulário saberia dizer.
    it('should show the API message when the entry is refused', fakeAsync(async () => {
      await setup();
      serviceSpy.criar.and.returnValue(throwError(() => new HttpErrorResponse({
        status: 409,
        error: { erro: 'Paciente já está na lista de espera para esse dia e faixa de horário' }
      })));
      buscar('ana');
      (todos('.sugestao')[0] as HTMLButtonElement).click();
      preencherHorario();

      component.salvar();
      fixture.detectChanges();

      expect(texto('.alert-danger'))
        .toBe('Paciente já está na lista de espera para esse dia e faixa de horário');
      expect(component.salvando).toBeFalse();
      expect(navigateSpy).not.toHaveBeenCalled();
    }));
  });
});
