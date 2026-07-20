import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { PacienteAvaliacaoPosturalFormComponent } from './paciente-avaliacao-postural-form.component';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { AvaliacaoFisioterapeuticaResponseDTO } from '../../../core/models/avaliacao-fisioterapeutica';
import { AvaliacaoPosturalResponseDTO } from '../../../core/models/avaliacao-postural';
import { ImageCompressorService } from '../../../shared/services/image-compressor.service';

function criarArquivoOriginal(nome = 'foto.png'): File {
  return new File(['conteudo-original'], nome, { type: 'image/png' });
}

function criarArquivoComprimidoFake(): File {
  return new File(['conteudo-comprimido'], 'foto.jpg', { type: 'image/jpeg' });
}

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
  temFoto: false,
  landmarks: [],
  metricas: null,
  dataCriacao: '2026-07-20T10:00:00',
  dataAtualizacao: null
};

const mockFoto = {
  avaliacaoPosturalId: 10,
  contentType: 'image/jpeg',
  tamanhoBytes: 1000,
  larguraPx: 1,
  alturaPx: 1,
  dataCriacao: '2026-07-20T10:01:00'
};

describe('PacienteAvaliacaoPosturalFormComponent', () => {
  let component: PacienteAvaliacaoPosturalFormComponent;
  let fixture: ComponentFixture<PacienteAvaliacaoPosturalFormComponent>;
  let httpMock: HttpTestingController;
  let router: Router;
  let compressorSpy: jasmine.SpyObj<ImageCompressorService>;

  function criarComponente(pacienteId: string | null = '1') {
    compressorSpy = jasmine.createSpyObj('ImageCompressorService', ['comprimir']);
    TestBed.configureTestingModule({
      imports: [PacienteAvaliacaoPosturalFormComponent, HttpClientTestingModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(pacienteId ? { pacienteId } : {}) } }
        },
        { provide: ImageCompressorService, useValue: compressorSpy }
      ]
    });
    fixture = TestBed.createComponent(PacienteAvaliacaoPosturalFormComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  }

  function mockarCompressao(): void {
    compressorSpy.comprimir.and.resolveTo(criarArquivoComprimidoFake());
  }

  function carregarComAnalisesExistentes(analises: AvaliacaoPosturalResponseDTO[] = []) {
    fixture.detectChanges();
    httpMock.expectOne('/api/pacientes/1').flush(mockPaciente);
    httpMock.expectOne('/api/avaliacoes-fisioterapeuticas/paciente/1').flush([mockAvaliacaoFisio]);
    httpMock.expectOne('/api/avaliacoes-posturais/avaliacao-fisioterapeutica/5').flush(analises);
  }

  afterEach(() => httpMock.verify());

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

  it('should show a message when there is no avaliação fisioterapêutica yet', () => {
    criarComponente();
    fixture.detectChanges();
    httpMock.expectOne('/api/pacientes/1').flush(mockPaciente);
    httpMock.expectOne('/api/avaliacoes-fisioterapeuticas/paciente/1').flush([]);

    expect(component.avaliacaoFisioterapeuticaId).toBeNull();
    httpMock.expectNone('/api/avaliacoes-posturais/avaliacao-fisioterapeutica/5');
  });

  it('should mark existing vistas as unavailable', () => {
    criarComponente();
    carregarComAnalisesExistentes([mockAnaliseFrente]);

    expect(component.vistaIndisponivel('FRENTE')).toBe(true);
    expect(component.vistaIndisponivel('COSTAS')).toBe(false);
  });

  it('should not select an unavailable vista', () => {
    criarComponente();
    carregarComAnalisesExistentes([mockAnaliseFrente]);

    component.selecionarVista('FRENTE');
    expect(component.campo('vista')?.value).toBeNull();

    component.selecionarVista('COSTAS');
    expect(component.campo('vista')?.value).toBe('COSTAS');
  });

  it('should compress the selected file and generate a preview', async () => {
    criarComponente();
    carregarComAnalisesExistentes();
    mockarCompressao();

    const arquivoOriginal = criarArquivoOriginal();
    await component.processarArquivo(arquivoOriginal);

    expect(compressorSpy.comprimir).toHaveBeenCalledWith(arquivoOriginal);
    expect(component.comprimindo).toBe(false);
    expect(component.arquivoComprimido).toBeTruthy();
    expect(component.arquivoComprimido?.type).toBe('image/jpeg');
    expect(component.previewUrl).toBeTruthy();
    expect(component.tamanhoComprimidoKb).not.toBeNull();
  });

  it('should reject non-image files without compressing', () => {
    criarComponente();
    carregarComAnalisesExistentes();
    mockarCompressao();

    component.processarArquivo(new File(['x'], 'documento.pdf', { type: 'application/pdf' }));

    expect(component.erro).toBe('Selecione um arquivo de imagem.');
    expect(component.arquivoComprimido).toBeNull();
    expect(compressorSpy.comprimir).not.toHaveBeenCalled();
  });

  it('should show an error message when compression fails', async () => {
    criarComponente();
    carregarComAnalisesExistentes();
    compressorSpy.comprimir.and.rejectWith(new Error('falha no canvas'));

    await component.processarArquivo(criarArquivoOriginal());

    expect(component.erro).toBe('Não foi possível processar a foto selecionada.');
    expect(component.comprimindo).toBe(false);
    expect(component.arquivoComprimido).toBeNull();
  });

  it('should process a file dropped onto the dropzone', async () => {
    criarComponente();
    carregarComAnalisesExistentes();
    mockarCompressao();

    const dropEvent = {
      preventDefault: jasmine.createSpy('preventDefault'),
      dataTransfer: { files: [criarArquivoOriginal()] }
    } as unknown as DragEvent;

    await component.onDrop(dropEvent);

    expect(dropEvent.preventDefault).toHaveBeenCalled();
    expect(component.arquivoComprimido).toBeTruthy();
  });

  it('should require a vista before continuing', () => {
    criarComponente();
    carregarComAnalisesExistentes();

    component.continuar();

    expect(component.campo('vista')?.touched).toBe(true);
    httpMock.expectNone('/api/avaliacoes-posturais');
  });

  it('should require a photo before continuing', () => {
    criarComponente();
    carregarComAnalisesExistentes();

    component.selecionarVista('FRENTE');
    component.continuar();

    expect(component.erro).toBe('Selecione ou tire uma foto antes de continuar.');
    httpMock.expectNone('/api/avaliacoes-posturais');
  });

  it('should create the analysis, upload the photo and navigate to the postural list on success', async () => {
    criarComponente();
    carregarComAnalisesExistentes();
    mockarCompressao();
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

    component.selecionarVista('FRENTE');
    await component.processarArquivo(criarArquivoOriginal());

    component.continuar();

    const criarReq = httpMock.expectOne('/api/avaliacoes-posturais');
    expect(criarReq.request.method).toBe('POST');
    expect(criarReq.request.body).toEqual({ avaliacaoFisioterapeuticaId: 5, vista: 'FRENTE' });
    criarReq.flush(mockAnaliseFrente);

    const fotoReq = httpMock.expectOne('/api/avaliacoes-posturais/10/foto');
    expect(fotoReq.request.method).toBe('PUT');
    fotoReq.flush(mockFoto);

    expect(component.enviando).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith(['/pacientes', 1, 'avaliacao-fisioterapeutica', 'postural']);
  });

  it('should show the backend message on a 409 conflict when creating the analysis', async () => {
    criarComponente();
    carregarComAnalisesExistentes();
    mockarCompressao();

    component.selecionarVista('FRENTE');
    await component.processarArquivo(criarArquivoOriginal());

    component.continuar();

    httpMock.expectOne('/api/avaliacoes-posturais').flush(
      { erro: 'Avaliação já possui análise postural ativa da vista FRENTE' },
      { status: 409, statusText: 'Conflict' }
    );

    expect(component.erro).toBe('Avaliação já possui análise postural ativa da vista FRENTE');
    expect(component.enviando).toBe(false);
    expect(component.analiseCriadaId).toBeNull();
  });

  it('should keep the created analysis id and retry only the photo upload when it fails', async () => {
    criarComponente();
    carregarComAnalisesExistentes();
    mockarCompressao();

    component.selecionarVista('FRENTE');
    await component.processarArquivo(criarArquivoOriginal());

    component.continuar();
    httpMock.expectOne('/api/avaliacoes-posturais').flush(mockAnaliseFrente);
    httpMock.expectOne('/api/avaliacoes-posturais/10/foto').flush('erro', { status: 500, statusText: 'Erro' });

    expect(component.analiseCriadaId).toBe(10);
    expect(component.erro).toBeTruthy();

    component.continuar();
    httpMock.expectNone('/api/avaliacoes-posturais');
    httpMock.expectOne('/api/avaliacoes-posturais/10/foto').flush(mockFoto);

    expect(component.enviando).toBe(false);
  });
});
