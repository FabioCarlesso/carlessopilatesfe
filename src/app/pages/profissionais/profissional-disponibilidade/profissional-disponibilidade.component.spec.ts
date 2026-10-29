import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { DisponibilidadeProfissionalResponseDTO } from '../../../core/models/disponibilidade-profissional';
import { DiaSemana } from '../../../core/models/plano';
import { DisponibilidadeProfissionalService } from '../../../core/services/disponibilidade-profissional.service';
import { MENSAGEM_CONFLITO_CONCORRENCIA } from '../../../shared/utils/api-error';
import { MENSAGEM_SOBREPOSICAO } from '../../../shared/utils/disponibilidade';
import { conflitoConcorrencia } from '../../../../testing/conflito';
import { ProfissionalDisponibilidadeComponent } from './profissional-disponibilidade.component';

function faixa(
  id: number,
  diaSemana: DiaSemana,
  horaInicio: string,
  horaFim: string,
  version = 0
): DisponibilidadeProfissionalResponseDTO {
  return {
    id,
    profissionalId: 3,
    diaSemana,
    horaInicio: `${horaInicio}:00`,
    horaFim: `${horaFim}:00`,
    version,
    dataCriacao: '2026-10-28T09:00:00',
    dataAtualizacao: null
  };
}

const manha = faixa(1, 'MONDAY', '07:00', '12:00', 2);
const tarde = faixa(2, 'MONDAY', '14:00', '19:00');

describe('ProfissionalDisponibilidadeComponent', () => {
  let component: ProfissionalDisponibilidadeComponent;
  let fixture: ComponentFixture<ProfissionalDisponibilidadeComponent>;
  let serviceSpy: jasmine.SpyObj<DisponibilidadeProfissionalService>;

  async function setup(faixas: DisponibilidadeProfissionalResponseDTO[] = [manha, tarde], ativo = true) {
    serviceSpy = jasmine.createSpyObj('DisponibilidadeProfissionalService', ['listar', 'criar', 'atualizar', 'excluir']);
    serviceSpy.listar.and.returnValue(of(faixas));

    await TestBed.configureTestingModule({
      imports: [ProfissionalDisponibilidadeComponent],
      providers: [{ provide: DisponibilidadeProfissionalService, useValue: serviceSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(ProfissionalDisponibilidadeComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('profissionalId', 3);
    fixture.componentRef.setInput('ativo', ativo);
    fixture.detectChanges();
  }

  function el(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function texto(seletor: string): string {
    return el().querySelector(seletor)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  }

  function preencher(diaSemana: DiaSemana | '', horaInicio: string, horaFim: string): void {
    component.form.setValue({ diaSemana, horaInicio, horaFim });
    component.form.markAllAsTouched();
    fixture.detectChanges();
  }

  afterEach(() => TestBed.resetTestingModule());

  describe('grade semanal', () => {
    it('should load the ranges of the professional', async () => {
      await setup();

      expect(serviceSpy.listar).toHaveBeenCalledWith(3);
      expect(component.faixas).toEqual([manha, tarde]);
    });

    it('should render the seven days from Monday to Sunday', async () => {
      await setup();

      const titulos = Array.from(el().querySelectorAll('.grade-dia-titulo')).map(t => t.textContent?.trim());
      expect(titulos).toEqual(['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']);
    });

    it('should list each range of the day without seconds', async () => {
      await setup();

      const segunda = el().querySelector('[data-dia="MONDAY"]')!;
      const horarios = Array.from(segunda.querySelectorAll('.grade-faixa-horario')).map(h => h.textContent?.trim());
      expect(horarios).toEqual(['07:00–12:00', '14:00–19:00']);
      expect(el().querySelector('[data-dia="TUESDAY"] .grade-vazia')?.textContent?.trim()).toBe('Sem atendimento');
    });

    it('should show the error and retry when loading fails', async () => {
      await setup();
      serviceSpy.listar.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      component.carregar();
      fixture.detectChanges();

      expect(texto('.alert-danger')).toContain('Erro ao carregar a disponibilidade');
      expect(el().querySelector('.grade-semanal')).toBeNull();

      serviceSpy.listar.and.returnValue(of([manha]));
      (el().querySelector('.tentar-novamente') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(component.erroCarga).toBeNull();
      expect(el().querySelectorAll('.grade-faixa').length).toBe(1);
    });

    it('should use the shared loading state', async () => {
      await setup();
      component.loading = true;
      fixture.detectChanges();

      expect(el().querySelector('app-carregando')).not.toBeNull();
    });
  });

  describe('cadastro', () => {
    it('should create a range and add it to the grid', async () => {
      await setup();
      const nova = faixa(3, 'TUESDAY', '08:00', '10:00');
      serviceSpy.criar.and.returnValue(of(nova));
      preencher('TUESDAY', '08:00', '10:00');

      component.salvar();
      fixture.detectChanges();

      expect(serviceSpy.criar).toHaveBeenCalledWith(3, { diaSemana: 'TUESDAY', horaInicio: '08:00', horaFim: '10:00' });
      expect(component.grade[1].faixas).toEqual([nova]);
      expect(texto('.alert-success')).toBe('Faixa cadastrada.');
      expect(component.form.value).toEqual({ diaSemana: '', horaInicio: '', horaFim: '' });
    });

    it('should require every field', async () => {
      await setup();
      preencher('', '', '');

      component.salvar();
      fixture.detectChanges();

      expect(serviceSpy.criar).not.toHaveBeenCalled();
      expect(el().querySelectorAll('.invalid-feedback').length).toBe(3);
    });

    it('should refuse a start that is not before the end', async () => {
      await setup();
      preencher('TUESDAY', '10:00', '10:00');

      component.salvar();
      fixture.detectChanges();

      expect(serviceSpy.criar).not.toHaveBeenCalled();
      expect(texto('.faixa-erro')).toBe('O início precisa ser anterior ao fim.');
    });

    it('should point out an overlap with a range of the same day before calling the API', async () => {
      await setup();
      preencher('MONDAY', '11:00', '13:00');

      component.salvar();
      fixture.detectChanges();

      expect(serviceSpy.criar).not.toHaveBeenCalled();
      expect(texto('.faixa-erro')).toContain('se sobrepõe a 07:00–12:00');
    });

    it('should accept a range that only touches another one', async () => {
      await setup();
      serviceSpy.criar.and.returnValue(of(faixa(3, 'MONDAY', '12:00', '14:00')));
      preencher('MONDAY', '12:00', '14:00');

      component.salvar();

      expect(serviceSpy.criar).toHaveBeenCalled();
    });

    // A grade local pode estar velha: outra pessoa cadastrou a faixa que cruza.
    it('should explain the overlap conflict answered by the API', async () => {
      await setup();
      serviceSpy.criar.and.returnValue(throwError(() => new HttpErrorResponse({
        status: 409,
        error: { type: 'https://carlessopilates.com.br/problemas/conflict', detail: 'A faixa WEDNESDAY 08:00–09:00 se sobrepõe' }
      })));
      preencher('WEDNESDAY', '08:00', '09:00');

      component.salvar();
      fixture.detectChanges();

      expect(texto('.alert-danger')).toBe(MENSAGEM_SOBREPOSICAO);
      expect(component.salvando).toBeFalse();
    });

    it('should show the business rule answered by the API', async () => {
      await setup();
      serviceSpy.criar.and.returnValue(throwError(() => new HttpErrorResponse({
        status: 422,
        error: { detail: 'Profissional inativo não pode ter disponibilidade cadastrada ou alterada: 3' }
      })));
      preencher('WEDNESDAY', '08:00', '09:00');

      component.salvar();
      fixture.detectChanges();

      expect(texto('.alert-danger')).toContain('Profissional inativo');
    });
  });

  describe('edição', () => {
    it('should fill the form with the range being edited', async () => {
      await setup();

      component.editar(manha);
      fixture.detectChanges();

      expect(component.form.value).toEqual({ diaSemana: 'MONDAY', horaInicio: '07:00', horaFim: '12:00' });
      expect(texto('.faixa-form-titulo')).toBe('Editar faixa de Segunda, 07:00–12:00');
      expect(el().querySelector('.grade-faixa.em-edicao .grade-faixa-horario')?.textContent?.trim()).toBe('07:00–12:00');
    });

    it('should update the range sending its version, without counting it as overlap', async () => {
      await setup();
      const atualizada = faixa(1, 'MONDAY', '08:00', '12:00', 3);
      serviceSpy.atualizar.and.returnValue(of(atualizada));
      component.editar(manha);
      component.form.patchValue({ horaInicio: '08:00' });

      component.salvar();
      fixture.detectChanges();

      expect(serviceSpy.atualizar).toHaveBeenCalledWith(1, {
        diaSemana: 'MONDAY',
        horaInicio: '08:00',
        horaFim: '12:00',
        version: 2
      });
      expect(component.grade[0].faixas).toEqual([atualizada, tarde]);
      expect(component.editando).toBeNull();
      expect(texto('.alert-success')).toBe('Faixa atualizada.');
    });

    it('should explain the concurrent modification conflict', async () => {
      await setup();
      serviceSpy.atualizar.and.returnValue(throwError(() => conflitoConcorrencia()));
      component.editar(manha);

      component.salvar();
      fixture.detectChanges();

      expect(texto('.alert-danger')).toBe(MENSAGEM_CONFLITO_CONCORRENCIA);
    });

    it('should cancel the edition', async () => {
      await setup();
      component.editar(manha);

      component.cancelarEdicao();
      fixture.detectChanges();

      expect(component.editando).toBeNull();
      expect(texto('.faixa-form-titulo')).toBe('Nova faixa');
    });
  });

  describe('exclusão', () => {
    it('should delete a range after confirmation', async () => {
      await setup();
      serviceSpy.excluir.and.returnValue(of(void 0));

      (el().querySelector('[aria-label="Excluir faixa de Segunda, 07:00–12:00"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(el().querySelector('app-confirmar-dialog')).not.toBeNull();

      component.excluir();
      fixture.detectChanges();

      expect(serviceSpy.excluir).toHaveBeenCalledWith(1);
      expect(component.faixas).toEqual([tarde]);
      expect(component.aExcluir).toBeNull();
      expect(texto('.alert-success')).toBe('Faixa excluída.');
    });

    it('should leave the edition when the edited range is deleted', async () => {
      await setup();
      serviceSpy.excluir.and.returnValue(of(void 0));
      component.editar(manha);
      component.confirmarExclusao(manha);

      component.excluir();

      expect(component.editando).toBeNull();
    });

    it('should show the error when deleting fails', async () => {
      await setup();
      serviceSpy.excluir.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
      component.confirmarExclusao(manha);

      component.excluir();
      fixture.detectChanges();

      expect(component.faixas).toEqual([manha, tarde]);
      expect(texto('.alert-danger')).toContain('não encontrado');
    });
  });

  // A API recusa faixa nova ou alterada de profissional inativo (`422`), mas
  // libera leitura e exclusão para limpar a grade de quem saiu.
  describe('profissional inativo', () => {
    beforeEach(async () => setup([manha], false));

    it('should hide the form and the edit buttons, keeping deletion', () => {
      expect(el().querySelector('form')).toBeNull();
      expect(el().querySelector('[aria-label^="Editar faixa"]')).toBeNull();
      expect(el().querySelector('[aria-label^="Excluir faixa"]')).not.toBeNull();
      expect(texto('.alert-warning')).toContain('Profissional inativo');
    });

    it('should not save', () => {
      component.form.setValue({ diaSemana: 'TUESDAY', horaInicio: '08:00', horaFim: '09:00' });

      component.salvar();

      expect(serviceSpy.criar).not.toHaveBeenCalled();
    });
  });
});
