import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { BloqueioAgendaResponseDTO } from '../../../../core/models/bloqueio-agenda';
import { BloqueioAgendaService } from '../../../../core/services/bloqueio-agenda.service';
import { BloqueioFormComponent } from './bloqueio-form.component';

const natal: BloqueioAgendaResponseDTO = {
  id: 1,
  dataInicio: '2026-12-25',
  dataFim: '2026-12-25',
  horaInicio: null,
  horaFim: null,
  diaInteiro: true,
  motivo: 'Natal',
  dataCriacao: '2026-01-02T09:00:00',
  dataAtualizacao: null
};

const manutencao: BloqueioAgendaResponseDTO = {
  id: 2,
  dataInicio: '2026-06-01',
  dataFim: '2026-06-03',
  horaInicio: '08:00:00',
  horaFim: '12:00:00',
  diaInteiro: false,
  motivo: 'Manutenção dos equipamentos',
  dataCriacao: '2026-01-02T09:00:00',
  dataAtualizacao: null
};

describe('BloqueioFormComponent', () => {
  let component: BloqueioFormComponent;
  let fixture: ComponentFixture<BloqueioFormComponent>;
  let serviceSpy: jasmine.SpyObj<BloqueioAgendaService>;
  let router: Router;

  async function setup(
    params: { id?: string } = {},
    bloqueio: BloqueioAgendaResponseDTO = natal,
    erroBuscar?: HttpErrorResponse
  ) {
    serviceSpy = jasmine.createSpyObj('BloqueioAgendaService', ['buscar', 'criar', 'atualizar']);
    serviceSpy.buscar.and.returnValue(erroBuscar ? throwError(() => erroBuscar) : of(bloqueio));
    serviceSpy.criar.and.returnValue(of(bloqueio));
    serviceSpy.atualizar.and.returnValue(of(bloqueio));

    await TestBed.configureTestingModule({
      imports: [BloqueioFormComponent, RouterTestingModule],
      providers: [
        { provide: BloqueioAgendaService, useValue: serviceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(params) } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BloqueioFormComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  }

  function texto(seletor: string): string {
    return (fixture.nativeElement as HTMLElement).querySelector(seletor)?.textContent?.trim() ?? '';
  }

  function existe(seletor: string): boolean {
    return (fixture.nativeElement as HTMLElement).querySelector(seletor) !== null;
  }

  afterEach(() => TestBed.resetTestingModule());

  describe('cadastro', () => {
    beforeEach(async () => setup());

    it('should open as a full-day block with the time range hidden', () => {
      expect(component.modoEdicao).toBeFalse();
      expect(component.diaInteiro).toBeTrue();
      expect(existe('#horaInicio')).toBeFalse();
      expect(existe('#horaFim')).toBeFalse();
      expect(serviceSpy.buscar).not.toHaveBeenCalled();
    });

    it('should not submit with the required fields missing', () => {
      component.salvar();

      expect(serviceSpy.criar).not.toHaveBeenCalled();
      expect(component.campo('dataInicio')?.touched).toBeTrue();
      expect(component.campo('motivo')?.touched).toBeTrue();
    });

    // As duas horas ausentes é o que a API lê como dia inteiro; mandar só uma
    // volta 400.
    it('should create a full-day block with both hours null', () => {
      spyOn(router, 'navigate');
      component.form.patchValue({ dataInicio: '2026-12-25', dataFim: '2026-12-25', motivo: '  Natal  ' });

      component.salvar();

      expect(serviceSpy.criar).toHaveBeenCalledWith({
        dataInicio: '2026-12-25',
        dataFim: '2026-12-25',
        horaInicio: null,
        horaFim: null,
        motivo: 'Natal'
      });
    });

    it('should navigate back to the list after creating', () => {
      const navigateSpy = spyOn(router, 'navigate');
      component.form.patchValue({ dataInicio: '2026-12-25', dataFim: '2026-12-25', motivo: 'Natal' });

      component.salvar();

      expect(navigateSpy).toHaveBeenCalledWith(['/admin/bloqueios']);
    });

    // Controle desabilitado sai do cálculo de validade: é isso que deixa o
    // `Validators.required` das horas conviver com o bloqueio de dia inteiro.
    it('should require the hours only when the range is enabled', () => {
      expect(component.form.valid).toBeFalse();
      component.form.patchValue({ dataInicio: '2026-12-25', dataFim: '2026-12-25', motivo: 'Natal' });
      expect(component.form.valid).toBeTrue();

      component.form.patchValue({ diaInteiro: false });
      component.aoAlternarDiaInteiro();
      fixture.detectChanges();

      expect(existe('#horaInicio')).toBeTrue();
      expect(component.form.valid).toBeFalse();
      expect(component.campo('horaInicio')?.enabled).toBeTrue();
    });

    it('should create a block with a time range', () => {
      spyOn(router, 'navigate');
      component.form.patchValue({ diaInteiro: false });
      component.aoAlternarDiaInteiro();
      component.form.patchValue({
        dataInicio: '2026-06-01',
        dataFim: '2026-06-03',
        horaInicio: '08:00',
        horaFim: '12:00',
        motivo: 'Manutenção'
      });

      component.salvar();

      expect(serviceSpy.criar).toHaveBeenCalledWith({
        dataInicio: '2026-06-01',
        dataFim: '2026-06-03',
        horaInicio: '08:00',
        horaFim: '12:00',
        motivo: 'Manutenção'
      });
    });

    // Recusar aqui devolve a mensagem na hora e poupa um 400 previsível.
    it('should reject an inverted period without calling the API', () => {
      component.form.patchValue({ dataInicio: '2026-12-25', dataFim: '2026-12-24', motivo: 'Natal' });

      component.salvar();
      fixture.detectChanges();

      expect(serviceSpy.criar).not.toHaveBeenCalled();
      expect(component.form.hasError('periodoInvertido')).toBeTrue();
      expect(texto('.invalid-feedback[role="alert"]')).toBe('A data final não pode ser anterior à inicial.');
    });

    it('should reject an inverted time range without calling the API', () => {
      component.form.patchValue({ diaInteiro: false });
      component.aoAlternarDiaInteiro();
      component.form.patchValue({
        dataInicio: '2026-06-01',
        dataFim: '2026-06-01',
        horaInicio: '12:00',
        horaFim: '08:00',
        motivo: 'Manutenção'
      });

      component.salvar();
      fixture.detectChanges();

      expect(serviceSpy.criar).not.toHaveBeenCalled();
      expect(component.form.hasError('faixaInvertida')).toBeTrue();
      expect(texto('.invalid-feedback[role="alert"]')).toBe('A hora final deve ser posterior à inicial.');
    });

    it('should reject a range that starts and ends at the same time', () => {
      component.form.patchValue({ diaInteiro: false });
      component.aoAlternarDiaInteiro();
      component.form.patchValue({
        dataInicio: '2026-06-01',
        dataFim: '2026-06-01',
        horaInicio: '08:00',
        horaFim: '08:00',
        motivo: 'Manutenção'
      });

      component.salvar();

      expect(serviceSpy.criar).not.toHaveBeenCalled();
      expect(component.form.hasError('faixaInvertida')).toBeTrue();
    });

    it('should show the API message when saving fails', () => {
      serviceSpy.criar.and.returnValue(throwError(() => new HttpErrorResponse({
        status: 400,
        error: { erro: 'motivo é obrigatório' }
      })));
      component.form.patchValue({ dataInicio: '2026-12-25', dataFim: '2026-12-25', motivo: 'Natal' });

      component.salvar();
      fixture.detectChanges();

      expect(texto('.alert-danger')).toBe('motivo é obrigatório');
      expect(component.salvando).toBeFalse();
    });
  });

  describe('edição', () => {
    it('should load a full-day block with the checkbox marked', async () => {
      await setup({ id: '1' });

      expect(serviceSpy.buscar).toHaveBeenCalledWith(1);
      expect(component.modoEdicao).toBeTrue();
      expect(component.diaInteiro).toBeTrue();
      expect(component.form.getRawValue()).toEqual(jasmine.objectContaining({
        dataInicio: '2026-12-25',
        dataFim: '2026-12-25',
        motivo: 'Natal'
      }));
    });

    // O `<input type="time">` só aceita `HH:mm`; a API manda os segundos quando
    // eles não são zero.
    it('should load a ranged block with the hours normalized to HH:mm', async () => {
      await setup({ id: '2' }, manutencao);
      fixture.detectChanges();

      expect(component.diaInteiro).toBeFalse();
      expect(existe('#horaInicio')).toBeTrue();
      expect(component.campo('horaInicio')?.value).toBe('08:00');
      expect(component.campo('horaFim')?.value).toBe('12:00');
    });

    it('should update sending the whole payload', async () => {
      await setup({ id: '2' }, manutencao);
      spyOn(router, 'navigate');

      component.form.patchValue({ horaFim: '13:00' });
      component.salvar();

      expect(serviceSpy.atualizar).toHaveBeenCalledWith(2, {
        dataInicio: '2026-06-01',
        dataFim: '2026-06-03',
        horaInicio: '08:00',
        horaFim: '13:00',
        motivo: 'Manutenção dos equipamentos'
      });
    });

    // O PUT é substituição completa: as horas nulas são o que devolve o
    // bloqueio para dia inteiro.
    it('should clear the range when switching back to a full-day block', async () => {
      await setup({ id: '2' }, manutencao);
      spyOn(router, 'navigate');

      component.form.patchValue({ diaInteiro: true });
      component.aoAlternarDiaInteiro();
      component.salvar();

      expect(serviceSpy.atualizar).toHaveBeenCalledWith(2, {
        dataInicio: '2026-06-01',
        dataFim: '2026-06-03',
        horaInicio: null,
        horaFim: null,
        motivo: 'Manutenção dos equipamentos'
      });
    });

    it('should show a dedicated message when the block does not exist', async () => {
      await setup({ id: '9' }, natal, new HttpErrorResponse({ status: 404 }));

      expect(texto('.alert-danger')).toBe('Bloqueio não encontrado.');
      expect(component.loading).toBeFalse();
    });

    it('should not call the API when the route id is invalid', async () => {
      await setup({ id: 'abc' });

      expect(component.parametroInvalido).toBeTrue();
      expect(texto('.alert-danger')).toBe('Identificador inválido.');
      expect(serviceSpy.buscar).not.toHaveBeenCalled();
      expect(existe('form')).toBeFalse();
    });
  });
});
