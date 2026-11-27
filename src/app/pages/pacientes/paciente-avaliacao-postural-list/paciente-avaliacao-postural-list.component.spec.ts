import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { PacienteAvaliacaoPosturalListComponent } from './paciente-avaliacao-postural-list.component';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { AvaliacaoFisioterapeuticaResponseDTO } from '../../../core/models/avaliacao-fisioterapeutica';
import { AvaliacaoPosturalResponseDTO } from '../../../core/models/avaliacao-postural';
import { ReavaliacaoResponseDTO } from '../../../core/models/reavaliacao';
import { pagina } from '../../../../testing/pagina';

const mockPaciente = { id: 1, nome: 'Maria Souza' } as PacienteResponseDTO;

const mockAvaliacaoFisio = {
  id: 5,
  pacienteId: 1,
  dataAvaliacao: '2026-07-10'
} as AvaliacaoFisioterapeuticaResponseDTO;

const mockReavaliacao = {
  id: 7,
  pacienteId: 1,
  dataReavaliacao: '2026-10-01'
} as ReavaliacaoResponseDTO;

const URL_AVALIACOES = '/api/avaliacoes-fisioterapeuticas/paciente/1?page=0&size=2000';
const URL_REAVALIACOES = '/api/reavaliacoes/paciente/1?page=0&size=2000';

const mockAnaliseFrente: AvaliacaoPosturalResponseDTO = {
  id: 10,
  pacienteId: 1,
  avaliacaoFisioterapeuticaId: 5,
  reavaliacaoId: null,
  vista: 'FRENTE',
  status: 'RASCUNHO',
  linhaPrumoX: null,
  calibracaoCmPorUnidade: null,
  proporcaoImagem: null,
  observacoes: null,
  temFoto: true,
  landmarks: [],
  metricas: null,
  dataCriacao: '2026-07-20T10:00:00',
  dataAtualizacao: null
};

const mockAnaliseSolta: AvaliacaoPosturalResponseDTO = {
  ...mockAnaliseFrente,
  id: 11,
  avaliacaoFisioterapeuticaId: null,
  temFoto: false,
  dataCriacao: '2026-07-19T10:00:00'
};

const mockAnaliseReavaliacao: AvaliacaoPosturalResponseDTO = {
  ...mockAnaliseFrente,
  id: 12,
  avaliacaoFisioterapeuticaId: null,
  reavaliacaoId: 7,
  vista: 'COSTAS',
  dataCriacao: '2026-07-18T10:00:00'
};

function configurarTestBed(pacienteId: string | null) {
  TestBed.configureTestingModule({
    imports: [PacienteAvaliacaoPosturalListComponent, HttpClientTestingModule],
    providers: [
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap(pacienteId ? { pacienteId } : {}) } }
      }
    ]
  });
}

describe('PacienteAvaliacaoPosturalListComponent', () => {
  let component: PacienteAvaliacaoPosturalListComponent;
  let fixture: ComponentFixture<PacienteAvaliacaoPosturalListComponent>;
  let httpMock: HttpTestingController;

  afterEach(() => httpMock.verify({ ignoreCancelled: true }));

  function criarComponente(pacienteId: string | null = '1') {
    configurarTestBed(pacienteId);
    fixture = TestBed.createComponent(PacienteAvaliacaoPosturalListComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  }

  function carregarComAnalises(
    analises: AvaliacaoPosturalResponseDTO[] = [mockAnaliseFrente],
    avaliacoes: AvaliacaoFisioterapeuticaResponseDTO[] = [mockAvaliacaoFisio],
    reavaliacoes: ReavaliacaoResponseDTO[] = [mockReavaliacao]
  ): void {
    fixture.detectChanges();
    httpMock.expectOne('/api/pacientes/1').flush(mockPaciente);
    httpMock.expectOne('/api/avaliacoes-posturais/paciente/1').flush(analises);
    httpMock.expectOne(URL_AVALIACOES).flush(pagina(avaliacoes));
    httpMock.expectOne(URL_REAVALIACOES).flush(pagina(reavaliacoes));
  }

  it('should be created', () => {
    criarComponente();
    expect(component).toBeTruthy();
  });

  it('should show "Identificador inválido." for a non-numeric pacienteId', () => {
    criarComponente('abc');
    fixture.detectChanges();

    expect(component.parametroInvalido).toBe(true);
    expect(component.erro).toBe('Identificador inválido.');
  });

  it('should load the patient analyses — loose and linked — with no avaliação prerequisite', () => {
    criarComponente();
    carregarComAnalises([mockAnaliseFrente, mockAnaliseSolta, mockAnaliseReavaliacao]);

    expect(component.paciente).toEqual(mockPaciente);
    expect(component.analises.length).toBe(3);
    expect(component.loading).toBe(false);
    httpMock.expectNone('/api/avaliacoes-posturais/avaliacao-fisioterapeutica/5');

    fixture.detectChanges();
    const itens = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.analise-item'));
    expect(itens.length).toBe(3);
    expect(itens[0].querySelector('.vinculo')?.textContent?.trim()).toBe('Avaliação de 10/07/2026');
    expect(itens[1].querySelector('.analise-info .badge:not(.badge--success):not(.badge--warning)')?.textContent?.trim())
      .toBe('Solta');
    expect(itens[1].querySelector('.vinculo')).toBeNull();
    expect(itens[2].querySelector('.vinculo')?.textContent?.trim()).toBe('Reavaliação de 01/10/2026');
    const textosAcoes = (item: Element) =>
      Array.from(item.querySelectorAll('.analise-acoes button')).map(b => b.textContent?.trim());
    expect(textosAcoes(itens[1])).toContain('Vincular');
    expect(textosAcoes(itens[0])).toContain('Alterar vínculo');
  });

  it('should list a patient without avaliação and offer the new-analysis CTA instead of a block', () => {
    criarComponente();
    carregarComAnalises([mockAnaliseSolta], [], []);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).not.toContain('É necessário cadastrar a avaliação fisioterapêutica');
    expect(el.querySelectorAll('.analise-item').length).toBe(1);
    const cta = el.querySelector('.lista-header a');
    expect(cta?.getAttribute('href')).toBe('/pacientes/1/avaliacao-fisioterapeutica/postural/nova');
  });

  it('should show the generic link label when the avaliações/reavaliações lookup fails', () => {
    criarComponente();
    fixture.detectChanges();
    httpMock.expectOne('/api/pacientes/1').flush(mockPaciente);
    httpMock.expectOne('/api/avaliacoes-posturais/paciente/1').flush([mockAnaliseFrente, mockAnaliseReavaliacao]);
    httpMock.expectOne(URL_AVALIACOES).flush('erro', { status: 500, statusText: 'Erro' });
    httpMock.expectOne(URL_REAVALIACOES).flush('erro', { status: 500, statusText: 'Erro' });

    expect(component.erro).toBeNull();
    expect(component.opcoesVinculoIncompletas).toBe(true);
    expect(component.rotuloVinculo(mockAnaliseFrente)).toBe('Avaliação fisioterapêutica');
    expect(component.rotuloVinculo(mockAnaliseReavaliacao)).toBe('Reavaliação');
  });

  it('should show an error message when loading the analyses fails', () => {
    criarComponente();
    fixture.detectChanges();

    httpMock.expectOne('/api/pacientes/1').flush(mockPaciente);
    httpMock.expectOne(URL_AVALIACOES).flush(pagina([]));
    httpMock.expectOne(URL_REAVALIACOES).flush(pagina([]));
    httpMock.expectOne('/api/avaliacoes-posturais/paciente/1').flush('erro', { status: 500, statusText: 'Erro' });

    expect(component.erro).toBe('Erro ao carregar as análises posturais do paciente.');
    expect(component.loading).toBe(false);
  });

  it('should go back to the clinical tab of the patient detail', () => {
    criarComponente();
    carregarComAnalises([]);
    fixture.detectChanges();

    const voltar = (fixture.nativeElement as HTMLElement).querySelector('.page-header .acoes a');
    expect(voltar?.getAttribute('href')).toBe('/pacientes/1?aba=clinico');
  });

  describe('vínculo', () => {
    beforeEach(() => {
      criarComponente();
      carregarComAnalises([mockAnaliseFrente, mockAnaliseSolta, mockAnaliseReavaliacao]);
    });

    it('should open the dialog for a loose analysis with "sem vínculo" selected and confirm disabled', () => {
      component.abrirVinculo(mockAnaliseSolta);
      fixture.detectChanges();

      expect(component.vinculoSelecionado).toBe('');
      expect(component.vinculoInalterado()).toBe(true);
      const dialog = document.querySelector('.dialog') as HTMLElement;
      expect(dialog.querySelector('.dialog-title')?.textContent?.trim()).toBe('Vincular análise');
      const opcoes = Array.from(dialog.querySelectorAll('#vinculoAnalise option')).map(o => o.textContent?.trim());
      // A solta é Frente, e a avaliação de 10/07 já tem a análise Frente (id 10): a opção fica desabilitada.
      expect(opcoes).toEqual([
        'Sem vínculo (análise solta)',
        'Reavaliação de 01/10/2026',
        'Avaliação de 10/07/2026 (já tem análise desta vista)'
      ]);
      const confirmar = dialog.querySelector('.dialog-actions .btn-primary') as HTMLButtonElement;
      expect(confirmar.disabled).toBe(true);
    });

    it('should link a loose analysis to an avaliação', () => {
      component.abrirVinculo(mockAnaliseSolta);
      component.vinculoSelecionado = 'avaliacao:5';
      component.salvarVinculo();

      expect(component.salvandoVinculo).toBe(true);
      const req = httpMock.expectOne('/api/avaliacoes-posturais/11/vinculo');
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ avaliacaoFisioterapeuticaId: 5, reavaliacaoId: null });
      req.flush({ ...mockAnaliseSolta, avaliacaoFisioterapeuticaId: 5 });

      expect(component.analiseEmVinculo).toBeNull();
      expect(component.analises[1].avaliacaoFisioterapeuticaId).toBe(5);
      expect(component.rotuloVinculo(component.analises[1])).toBe('Avaliação de 10/07/2026');
      expect(component.sucesso).toBe('Vínculo da análise atualizado.');
    });

    it('should switch the link from an avaliação to a reavaliação', () => {
      component.abrirVinculo(mockAnaliseFrente);
      expect(component.vinculoSelecionado).toBe('avaliacao:5');
      fixture.detectChanges();
      expect(document.querySelector('.dialog-title')?.textContent?.trim()).toBe('Alterar vínculo');

      component.vinculoSelecionado = 'reavaliacao:7';
      component.salvarVinculo();

      const req = httpMock.expectOne('/api/avaliacoes-posturais/10/vinculo');
      expect(req.request.body).toEqual({ avaliacaoFisioterapeuticaId: null, reavaliacaoId: 7 });
      req.flush({ ...mockAnaliseFrente, avaliacaoFisioterapeuticaId: null, reavaliacaoId: 7 });

      expect(component.analises[0].reavaliacaoId).toBe(7);
    });

    it('should remove the link, leaving the analysis loose', () => {
      component.abrirVinculo(mockAnaliseReavaliacao);
      component.vinculoSelecionado = '';
      component.salvarVinculo();

      const req = httpMock.expectOne('/api/avaliacoes-posturais/12/vinculo');
      expect(req.request.body).toEqual({ avaliacaoFisioterapeuticaId: null, reavaliacaoId: null });
      req.flush({ ...mockAnaliseReavaliacao, reavaliacaoId: null });

      expect(component.ehSolta(component.analises[2])).toBe(true);
      expect(component.sucesso).toBe('Vínculo removido: a análise ficou solta.');
    });

    it('should keep the dialog open with the API detail on 422', () => {
      component.abrirVinculo(mockAnaliseSolta);
      component.vinculoSelecionado = 'avaliacao:5';
      component.salvarVinculo();

      httpMock.expectOne('/api/avaliacoes-posturais/11/vinculo').flush(
        { detail: 'A avaliação informada é de outro paciente.' },
        { status: 422, statusText: 'Unprocessable Entity' }
      );
      fixture.detectChanges();

      expect(component.analiseEmVinculo).toBe(mockAnaliseSolta);
      expect(component.salvandoVinculo).toBe(false);
      expect(component.vinculoErro).toBe('A avaliação informada é de outro paciente.');
      expect(document.querySelector('.dialog .alert-danger')?.textContent?.trim())
        .toBe('A avaliação informada é de outro paciente.');
      expect(component.analises[1]).toEqual(mockAnaliseSolta);
    });

    it('should show the API detail on 400', () => {
      component.abrirVinculo(mockAnaliseSolta);
      component.vinculoSelecionado = 'reavaliacao:7';
      component.salvarVinculo();

      httpMock.expectOne('/api/avaliacoes-posturais/11/vinculo').flush(
        { detail: 'Informe apenas um vínculo.' },
        { status: 400, statusText: 'Bad Request' }
      );

      expect(component.vinculoErro).toBe('Informe apenas um vínculo.');
    });

    it('should not call the API when the link did not change', () => {
      component.abrirVinculo(mockAnaliseFrente);
      component.salvarVinculo();

      expect(component.salvandoVinculo).toBe(false);
      httpMock.expectNone('/api/avaliacoes-posturais/10/vinculo');
    });

    it('should disable the option whose avaliação already has an analysis of the same view', () => {
      const outraFrente = { ...mockAnaliseSolta, id: 13 };
      component.analises = [...component.analises, outraFrente];
      component.abrirVinculo(outraFrente);
      fixture.detectChanges();

      expect(component.vistaOcupadaNoVinculo('avaliacao:5')).toBe(true);
      expect(component.vistaOcupadaNoVinculo('reavaliacao:7')).toBe(false);
      expect(component.vistaOcupadaNoVinculo('')).toBe(false);
      const opcao = Array.from(document.querySelectorAll<HTMLOptionElement>('#vinculoAnalise option'))
        .find(o => o.textContent?.includes('Avaliação de 10/07/2026'));
      expect(opcao?.disabled).toBe(true);
      expect(opcao?.textContent).toContain('já tem análise desta vista');
    });

    it('should not close the dialog while saving and close it on cancel', () => {
      component.abrirVinculo(mockAnaliseSolta);
      component.vinculoSelecionado = 'avaliacao:5';
      component.salvarVinculo();
      component.fecharVinculo();
      expect(component.analiseEmVinculo).toBe(mockAnaliseSolta);

      httpMock.expectOne('/api/avaliacoes-posturais/11/vinculo').flush(null, { status: 500, statusText: 'Erro' });
      expect(component.vinculoErro).toBe('Erro ao atualizar o vínculo da análise.');

      component.fecharVinculo();
      expect(component.analiseEmVinculo).toBeNull();
      expect(component.vinculoErro).toBeNull();
    });

    it('should hint that the patient has nothing to link to', () => {
      component.opcoesVinculo = [];
      component.abrirVinculo(mockAnaliseSolta);
      fixture.detectChanges();

      expect(document.querySelector('#vinculoAnaliseDica')?.textContent)
        .toContain('O paciente ainda não tem avaliação nem reavaliação');
    });
  });

  it('should download and cache the photo as an object URL when toggled open', () => {
    criarComponente();
    carregarComAnalises();

    const createObjectURLSpy = spyOn(URL, 'createObjectURL').and.returnValue('blob:foto-10');
    component.alternarFoto(mockAnaliseFrente);

    expect(component.fotoAbertaId).toBe(10);
    httpMock.expectOne('/api/avaliacoes-posturais/10/foto').flush(new Blob(['img']));

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(component.fotoUrl(10)).toBe('blob:foto-10');

    component.alternarFoto(mockAnaliseFrente);
    expect(component.fotoAbertaId).toBeNull();
  });

  it('should show an error message when downloading the photo fails', () => {
    criarComponente();
    carregarComAnalises();

    component.alternarFoto(mockAnaliseFrente);
    httpMock.expectOne('/api/avaliacoes-posturais/10/foto').flush(new Blob(['erro']), { status: 500, statusText: 'Erro' });

    expect(component.erro).toBeTruthy();
    expect(component.fotoAbertaId).toBeNull();
  });

  it('should open the cancel confirmation for an analysis', () => {
    criarComponente();
    carregarComAnalises();

    component.confirmarCancelar(10);

    expect(component.confirmarCancelarId).toBe(10);
    expect(component.vistaEmConfirmacao()).toBe('Frente');
  });

  it('should close the cancel confirmation without calling the API', () => {
    criarComponente();
    carregarComAnalises();

    component.confirmarCancelar(10);
    component.fecharConfirmacaoCancelar();

    expect(component.confirmarCancelarId).toBeNull();
    httpMock.expectNone('/api/avaliacoes-posturais/10/cancelar');
  });

  it('should cancel the analysis, remove it from the list and show a success message', () => {
    criarComponente();
    carregarComAnalises();

    component.confirmarCancelar(10);
    component.executarCancelamento();

    expect(component.confirmarCancelarId).toBeNull();
    expect(component.acaoEmAndamentoId).toBe(10);

    const req = httpMock.expectOne('/api/avaliacoes-posturais/10/cancelar');
    expect(req.request.method).toBe('PATCH');
    req.flush({ ...mockAnaliseFrente, status: 'RASCUNHO' });

    expect(component.analises).toEqual([]);
    expect(component.acaoEmAndamentoId).toBeNull();
    expect(component.sucesso).toBe('Análise cancelada com sucesso.');
  });

  it('should revoke the cached photo object URL of a cancelled analysis', () => {
    criarComponente();
    carregarComAnalises();

    spyOn(URL, 'createObjectURL').and.returnValue('blob:foto-10');
    const revokeSpy = spyOn(URL, 'revokeObjectURL');
    component.alternarFoto(mockAnaliseFrente);
    httpMock.expectOne('/api/avaliacoes-posturais/10/foto').flush(new Blob(['img']));
    expect(component.fotoUrl(10)).toBe('blob:foto-10');

    component.confirmarCancelar(10);
    component.executarCancelamento();
    httpMock.expectOne('/api/avaliacoes-posturais/10/cancelar').flush({ ...mockAnaliseFrente, status: 'RASCUNHO' });

    expect(revokeSpy).toHaveBeenCalledWith('blob:foto-10');
    expect(component.fotoUrl(10)).toBeNull();
    expect(component.fotoAbertaId).toBeNull();
  });

  it('should disable every cancel button while an action is in progress', () => {
    criarComponente();
    carregarComAnalises();

    fixture.detectChanges();
    const botaoCancelar = (): HTMLButtonElement =>
      fixture.nativeElement.querySelector('.analise-acoes .btn-danger');
    expect(botaoCancelar().disabled).toBe(false);

    component.confirmarCancelar(10);
    component.executarCancelamento();
    fixture.detectChanges();

    expect(botaoCancelar().disabled).toBe(true);

    httpMock.expectOne('/api/avaliacoes-posturais/10/cancelar').flush({ ...mockAnaliseFrente, status: 'RASCUNHO' });
  });

  it('should show an error message when cancelling fails and keep the analysis in the list', () => {
    criarComponente();
    carregarComAnalises();

    component.confirmarCancelar(10);
    component.executarCancelamento();

    httpMock.expectOne('/api/avaliacoes-posturais/10/cancelar').flush('erro', { status: 500, statusText: 'Erro' });

    expect(component.erro).toBeTruthy();
    expect(component.analises).toEqual([mockAnaliseFrente]);
    expect(component.acaoEmAndamentoId).toBeNull();
  });

  it('should not open a second confirmation while an action is in progress', () => {
    criarComponente();
    carregarComAnalises();

    component.confirmarCancelar(10);
    component.executarCancelamento();
    component.confirmarCancelar(10);

    expect(component.confirmarCancelarId).toBeNull();

    httpMock.expectOne('/api/avaliacoes-posturais/10/cancelar').flush({ ...mockAnaliseFrente, status: 'RASCUNHO' });
  });

  it('should offer the new-analysis CTA in the empty state (issue #146)', () => {
    criarComponente();
    carregarComAnalises([]);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.empty-state__mensagem')?.textContent?.trim()).toBe('Nenhuma análise postural registrada ainda.');
    const cta = el.querySelector('.empty-state__acoes a');
    expect(cta?.textContent?.trim()).toBe('+ Nova análise');
    expect(cta?.getAttribute('href')).toBe('/pacientes/1/avaliacao-fisioterapeutica/postural/nova');
  });
});
