import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { PacienteAvaliacaoPosturalListComponent } from './paciente-avaliacao-postural-list.component';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { AvaliacaoFisioterapeuticaResponseDTO } from '../../../core/models/avaliacao-fisioterapeutica';
import { AvaliacaoPosturalResponseDTO } from '../../../core/models/avaliacao-postural';

const mockPaciente = { id: 1, nome: 'Maria Souza' } as PacienteResponseDTO;

const mockAvaliacaoFisio = {
  id: 5,
  pacienteId: 1
} as AvaliacaoFisioterapeuticaResponseDTO;

const mockAnaliseFrente: AvaliacaoPosturalResponseDTO = {
  id: 10,
  avaliacaoFisioterapeuticaId: 5,
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

  it('should load paciente, avaliação fisioterapêutica and postural analyses', () => {
    criarComponente();
    fixture.detectChanges();

    httpMock.expectOne('/api/pacientes/1').flush(mockPaciente);
    httpMock.expectOne('/api/avaliacoes-fisioterapeuticas/paciente/1').flush([mockAvaliacaoFisio]);
    httpMock.expectOne('/api/avaliacoes-posturais/avaliacao-fisioterapeutica/5').flush([mockAnaliseFrente]);

    expect(component.paciente).toEqual(mockPaciente);
    expect(component.avaliacaoFisioterapeuticaId).toBe(5);
    expect(component.analises).toEqual([mockAnaliseFrente]);
    expect(component.loading).toBe(false);
  });

  it('should not call the postural endpoint when there is no avaliação fisioterapêutica', () => {
    criarComponente();
    fixture.detectChanges();

    httpMock.expectOne('/api/pacientes/1').flush(mockPaciente);
    httpMock.expectOne('/api/avaliacoes-fisioterapeuticas/paciente/1').flush([]);

    expect(component.avaliacaoFisioterapeuticaId).toBeNull();
    expect(component.loading).toBe(false);
    httpMock.expectNone('/api/avaliacoes-posturais/avaliacao-fisioterapeutica/5');
  });

  it('should show an error message when loading paciente/avaliação fails', () => {
    criarComponente();
    fixture.detectChanges();

    httpMock.expectOne('/api/pacientes/1').flush('erro', { status: 500, statusText: 'Erro' });

    expect(component.erro).toBe('Erro ao carregar dados do paciente.');
    expect(component.loading).toBe(false);
  });

  it('should show an error message when loading postural analyses fails', () => {
    criarComponente();
    fixture.detectChanges();

    httpMock.expectOne('/api/pacientes/1').flush(mockPaciente);
    httpMock.expectOne('/api/avaliacoes-fisioterapeuticas/paciente/1').flush([mockAvaliacaoFisio]);
    httpMock.expectOne('/api/avaliacoes-posturais/avaliacao-fisioterapeutica/5').flush('erro', { status: 500, statusText: 'Erro' });

    expect(component.erro).toBe('Erro ao carregar análises posturais.');
    expect(component.loading).toBe(false);
  });

  it('should download and cache the photo as an object URL when toggled open', () => {
    criarComponente();
    fixture.detectChanges();
    httpMock.expectOne('/api/pacientes/1').flush(mockPaciente);
    httpMock.expectOne('/api/avaliacoes-fisioterapeuticas/paciente/1').flush([mockAvaliacaoFisio]);
    httpMock.expectOne('/api/avaliacoes-posturais/avaliacao-fisioterapeutica/5').flush([mockAnaliseFrente]);

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
    fixture.detectChanges();
    httpMock.expectOne('/api/pacientes/1').flush(mockPaciente);
    httpMock.expectOne('/api/avaliacoes-fisioterapeuticas/paciente/1').flush([mockAvaliacaoFisio]);
    httpMock.expectOne('/api/avaliacoes-posturais/avaliacao-fisioterapeutica/5').flush([mockAnaliseFrente]);

    component.alternarFoto(mockAnaliseFrente);
    httpMock.expectOne('/api/avaliacoes-posturais/10/foto').flush(new Blob(['erro']), { status: 500, statusText: 'Erro' });

    expect(component.erro).toBeTruthy();
    expect(component.fotoAbertaId).toBeNull();
  });
});
