import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { PacienteAvaliacaoPosturalFormComponent } from './paciente-avaliacao-postural-form.component';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { AvaliacaoFisioterapeuticaResponseDTO } from '../../../core/models/avaliacao-fisioterapeutica';
import { AvaliacaoPosturalResponseDTO } from '../../../core/models/avaliacao-postural';
import { ReavaliacaoResponseDTO } from '../../../core/models/reavaliacao';
import { ImageCompressorService } from '../../../shared/services/image-compressor.service';
import { pagina } from '../../../../testing/pagina';

function criarArquivoOriginal(nome = 'foto.png'): File {
  return new File(['conteudo-original'], nome, { type: 'image/png' });
}

function criarArquivoComprimidoFake(): File {
  return new File(['conteudo-comprimido'], 'foto.jpg', { type: 'image/jpeg' });
}

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

  function criarComponente(pacienteId: string | null = '1', query: Record<string, string> = {}) {
    compressorSpy = jasmine.createSpyObj('ImageCompressorService', ['comprimir']);
    TestBed.configureTestingModule({
      imports: [PacienteAvaliacaoPosturalFormComponent, HttpClientTestingModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap(pacienteId ? { pacienteId } : {}),
              queryParamMap: convertToParamMap(query)
            }
          }
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

  function carregarComAnalisesExistentes(
    analises: AvaliacaoPosturalResponseDTO[] = [],
    avaliacoes: AvaliacaoFisioterapeuticaResponseDTO[] = [mockAvaliacaoFisio],
    reavaliacoes: ReavaliacaoResponseDTO[] = [mockReavaliacao]
  ) {
    fixture.detectChanges();
    httpMock.expectOne('/api/pacientes/1').flush(mockPaciente);
    httpMock.expectOne('/api/avaliacoes-posturais/paciente/1').flush(analises);
    httpMock.expectOne(URL_AVALIACOES).flush(pagina(avaliacoes));
    httpMock.expectOne(URL_REAVALIACOES).flush(pagina(reavaliacoes));
  }

  async function prepararEnvio(vista: 'FRENTE' | 'COSTAS' = 'FRENTE'): Promise<void> {
    mockarCompressao();
    component.selecionarVista(vista);
    await component.processarArquivo(criarArquivoOriginal());
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

  it('should open the form for a patient without avaliação and create a loose analysis', async () => {
    criarComponente();
    carregarComAnalisesExistentes([], [], []);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).not.toContain('É necessário cadastrar a avaliação fisioterapêutica');
    expect(el.querySelector('form')).not.toBeNull();
    expect(Array.from(el.querySelectorAll('#vinculo option')).map(o => o.textContent?.trim()))
      .toEqual(['Sem vínculo (análise solta)']);
    expect(el.querySelector('#vinculoDica')?.textContent).toContain('O paciente ainda não tem avaliação nem reavaliação');

    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
    await prepararEnvio();
    component.continuar();

    const criarReq = httpMock.expectOne('/api/avaliacoes-posturais');
    expect(criarReq.request.body).toEqual({ pacienteId: 1, avaliacaoFisioterapeuticaId: null, reavaliacaoId: null, vista: 'FRENTE' });
    criarReq.flush({ ...mockAnaliseFrente, avaliacaoFisioterapeuticaId: null });
    httpMock.expectOne('/api/avaliacoes-posturais/10/foto').flush(mockFoto);

    expect(navigateSpy).toHaveBeenCalledWith(['/pacientes', 1, 'avaliacao-fisioterapeutica', 'postural']);
  });

  it('should list avaliações and reavaliações in the link selector, newest first', () => {
    criarComponente();
    carregarComAnalisesExistentes();
    fixture.detectChanges();

    const opcoes = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('#vinculo option'))
      .map(o => o.textContent?.trim());
    expect(opcoes).toEqual(['Sem vínculo (análise solta)', 'Reavaliação de 01/10/2026', 'Avaliação de 10/07/2026']);
    expect(component.campo('vinculo')?.value).toBe('');
  });

  it('should create the analysis linked to the chosen reavaliação', async () => {
    criarComponente();
    carregarComAnalisesExistentes();
    spyOn(router, 'navigate').and.resolveTo(true);

    component.form.patchValue({ vinculo: 'reavaliacao:7' });
    await prepararEnvio();
    component.continuar();

    const criarReq = httpMock.expectOne('/api/avaliacoes-posturais');
    expect(criarReq.request.body).toEqual({ pacienteId: 1, avaliacaoFisioterapeuticaId: null, reavaliacaoId: 7, vista: 'FRENTE' });
    criarReq.flush({ ...mockAnaliseFrente, avaliacaoFisioterapeuticaId: null, reavaliacaoId: 7 });

    expect(component.campo('vinculo')?.disabled).toBe(true);
    httpMock.expectOne('/api/avaliacoes-posturais/10/foto').flush(mockFoto);
  });

  it('should pre-select the avaliação passed in the query string', async () => {
    criarComponente('1', { avaliacaoFisioterapeuticaId: '5' });
    carregarComAnalisesExistentes();
    spyOn(router, 'navigate').and.resolveTo(true);

    expect(component.campo('vinculo')?.value).toBe('avaliacao:5');

    await prepararEnvio('COSTAS');
    component.continuar();
    const criarReq = httpMock.expectOne('/api/avaliacoes-posturais');
    expect(criarReq.request.body).toEqual({ pacienteId: 1, avaliacaoFisioterapeuticaId: 5, reavaliacaoId: null, vista: 'COSTAS' });
    criarReq.flush(mockAnaliseFrente);
    httpMock.expectOne('/api/avaliacoes-posturais/10/foto').flush(mockFoto);
  });

  it('should pre-select the reavaliação passed in the query string', () => {
    criarComponente('1', { reavaliacaoId: '7' });
    carregarComAnalisesExistentes();

    expect(component.campo('vinculo')?.value).toBe('reavaliacao:7');
  });

  it('should ignore a query-string link that is not one of the patient records', () => {
    criarComponente('1', { avaliacaoFisioterapeuticaId: '99', reavaliacaoId: 'abc' });
    carregarComAnalisesExistentes();

    expect(component.campo('vinculo')?.value).toBe('');
    expect(component.opcoesVinculo.length).toBe(2);
  });

  it('should keep the query-string link with a generic label when the lookups fail', () => {
    criarComponente('1', { avaliacaoFisioterapeuticaId: '5' });
    fixture.detectChanges();
    httpMock.expectOne('/api/pacientes/1').flush(mockPaciente);
    httpMock.expectOne('/api/avaliacoes-posturais/paciente/1').flush([]);
    httpMock.expectOne(URL_AVALIACOES).flush('erro', { status: 500, statusText: 'Erro' });
    httpMock.expectOne(URL_REAVALIACOES).flush(pagina([mockReavaliacao]));
    fixture.detectChanges();

    expect(component.erro).toBeNull();
    expect(component.opcoesVinculoIncompletas).toBe(true);
    expect(component.campo('vinculo')?.value).toBe('avaliacao:5');
    expect(component.opcoesVinculo[0].label).toBe('Avaliação fisioterapêutica');
    expect((fixture.nativeElement as HTMLElement).querySelector('#vinculoDica')?.textContent)
      .toContain('Não foi possível carregar todas as avaliações e reavaliações');
  });

  it('should show an error when loading the patient data fails', () => {
    criarComponente();
    fixture.detectChanges();
    httpMock.expectOne('/api/avaliacoes-posturais/paciente/1').flush([]);
    httpMock.expectOne(URL_AVALIACOES).flush(pagina([]));
    httpMock.expectOne(URL_REAVALIACOES).flush(pagina([]));
    httpMock.expectOne('/api/pacientes/1').flush('erro', { status: 500, statusText: 'Erro' });

    expect(component.erro).toBe('Erro ao carregar dados do paciente.');
    expect(component.loading).toBe(false);
  });

  it('should show the API detail on a 422 when creating the analysis', async () => {
    criarComponente();
    carregarComAnalisesExistentes();
    component.form.patchValue({ vinculo: 'avaliacao:5' });
    await prepararEnvio('COSTAS');
    component.continuar();

    httpMock.expectOne('/api/avaliacoes-posturais').flush(
      { detail: 'A avaliação informada é de outro paciente.' },
      { status: 422, statusText: 'Unprocessable Entity' }
    );

    expect(component.erro).toBe('A avaliação informada é de outro paciente.');
    expect(component.analiseCriadaId).toBeNull();
    expect(component.campo('vinculo')?.disabled).toBe(false);
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

  it('should process a file chosen via the file input and reset its value', async () => {
    criarComponente();
    carregarComAnalisesExistentes();
    mockarCompressao();

    const inputArquivo = { value: 'C:\\fakepath\\foto.png', files: [criarArquivoOriginal()] } as unknown as HTMLInputElement;
    const changeEvent = { target: inputArquivo } as unknown as Event;

    await component.onArquivoSelecionado(changeEvent);

    expect(component.arquivoComprimido).toBeTruthy();
    expect(inputArquivo.value).toBe('');
  });

  it('should do nothing when the file input change fires without a selected file', async () => {
    criarComponente();
    carregarComAnalisesExistentes();
    mockarCompressao();

    const inputArquivo = { value: '', files: null } as unknown as HTMLInputElement;
    const changeEvent = { target: inputArquivo } as unknown as Event;

    await component.onArquivoSelecionado(changeEvent);

    expect(component.arquivoComprimido).toBeNull();
    expect(compressorSpy.comprimir).not.toHaveBeenCalled();
  });

  it('should allow replacing the photo after a failed upload without recreating the analysis', async () => {
    criarComponente();
    carregarComAnalisesExistentes();
    mockarCompressao();

    component.selecionarVista('FRENTE');
    await component.processarArquivo(criarArquivoOriginal());

    component.continuar();
    httpMock.expectOne('/api/avaliacoes-posturais').flush(mockAnaliseFrente);
    httpMock.expectOne('/api/avaliacoes-posturais/10/foto').flush('erro', { status: 500, statusText: 'Erro' });

    expect(component.analiseCriadaId).toBe(10);

    component.removerFoto();
    expect(component.arquivoComprimido).toBeNull();

    await component.processarArquivo(criarArquivoOriginal('outra-foto.png'));
    component.continuar();

    httpMock.expectNone('/api/avaliacoes-posturais');
    httpMock.expectOne('/api/avaliacoes-posturais/10/foto').flush(mockFoto);

    expect(component.enviando).toBe(false);
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
    expect(criarReq.request.body).toEqual({ pacienteId: 1, avaliacaoFisioterapeuticaId: null, reavaliacaoId: null, vista: 'FRENTE' });
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
