import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { PacienteAvaliacaoPosturalEditorComponent } from './paciente-avaliacao-postural-editor.component';
import { AvaliacaoPosturalResponseDTO } from '../../../core/models/avaliacao-postural';

const mockRascunho: AvaliacaoPosturalResponseDTO = {
  id: 10,
  avaliacaoFisioterapeuticaId: 5,
  vista: 'FRENTE',
  status: 'RASCUNHO',
  linhaPrumoX: 0.502,
  calibracaoCmPorUnidade: null,
  proporcaoImagem: 0.75,
  observacoes: null,
  temFoto: true,
  landmarks: [
    { codigo: 'OLHO_ESQ', x: 0.45, y: 0.12 },
    { codigo: 'OLHO_DIR', x: 0.55, y: 0.13 }
  ],
  metricas: null,
  dataCriacao: '2026-07-20T10:00:00',
  dataAtualizacao: null
};

function configurarTestBed(params: Record<string, string>) {
  TestBed.configureTestingModule({
    imports: [PacienteAvaliacaoPosturalEditorComponent, HttpClientTestingModule],
    providers: [
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap(params) } }
      }
    ]
  });
}

describe('PacienteAvaliacaoPosturalEditorComponent', () => {
  let fixture: ComponentFixture<PacienteAvaliacaoPosturalEditorComponent>;
  let component: PacienteAvaliacaoPosturalEditorComponent;
  let httpMock: HttpTestingController;

  function criar(params: Record<string, string> = { pacienteId: '1', id: '10' }) {
    configurarTestBed(params);
    fixture = TestBed.createComponent(PacienteAvaliacaoPosturalEditorComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  }

  afterEach(() => {
    httpMock?.verify();
  });

  it('carrega a análise e a foto como Blob autenticado', () => {
    criar();

    const reqAnalise = httpMock.expectOne('/api/avaliacoes-posturais/10');
    expect(reqAnalise.request.method).toBe('GET');
    reqAnalise.flush(mockRascunho);

    const reqFoto = httpMock.expectOne('/api/avaliacoes-posturais/10/foto');
    expect(reqFoto.request.method).toBe('GET');
    expect(reqFoto.request.responseType).toBe('blob');
    reqFoto.flush(new Blob(['binario'], { type: 'image/jpeg' }));

    expect(component.analise).toEqual(mockRascunho);
    expect(component.fotoUrl).toContain('blob:');
    expect(component.loading).toBeFalse();
  });

  it('rejeita identificador de rota inválido sem chamar a API', () => {
    criar({ pacienteId: 'abc', id: '10' });

    expect(component.parametroInvalido).toBeTrue();
    expect(component.erro).toBe('Identificador inválido.');
  });

  it('avisa quando a análise ainda não tem foto', () => {
    criar();

    httpMock.expectOne('/api/avaliacoes-posturais/10').flush({ ...mockRascunho, temFoto: false });

    expect(component.erro).toContain('não tem foto');
    expect(component.loading).toBeFalse();
  });

  it('trata erro ao carregar a análise', () => {
    criar();

    httpMock.expectOne('/api/avaliacoes-posturais/10').flush(
      { erro: 'Análise não encontrada' },
      { status: 404, statusText: 'Not Found' }
    );

    expect(component.erro).toBe('Análise não encontrada');
    expect(component.loading).toBeFalse();
  });

  describe('salvamento do rascunho', () => {
    beforeEach(() => {
      criar();
      httpMock.expectOne('/api/avaliacoes-posturais/10').flush(mockRascunho);
      httpMock.expectOne('/api/avaliacoes-posturais/10/foto').flush(new Blob(['b'], { type: 'image/jpeg' }));
    });

    it('faz PUT com landmarks parciais e linha de prumo normalizados', () => {
      component.onMarcacaoAlterada({
        landmarks: [{ codigo: 'OLHO_ESQ', x: 0.45, y: 0.12 }],
        linhaPrumoX: 0.48
      });
      expect(component.alteracoesPendentes).toBeTrue();

      component.salvarRascunho();

      const req = httpMock.expectOne('/api/avaliacoes-posturais/10');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({
        landmarks: [{ codigo: 'OLHO_ESQ', x: 0.45, y: 0.12 }],
        linhaPrumoX: 0.48
      });
      req.flush({ ...mockRascunho, linhaPrumoX: 0.48 });

      expect(component.alteracoesPendentes).toBeFalse();
      expect(component.sucesso).toContain('salvo');
    });

    it('nunca envia métricas no corpo — a API as recalcula', () => {
      component.onMarcacaoAlterada({ landmarks: [], linhaPrumoX: 0.5 });
      component.salvarRascunho();

      const req = httpMock.expectOne('/api/avaliacoes-posturais/10');
      expect(Object.keys(req.request.body as object)).not.toContain('metricas');
      req.flush(mockRascunho);
    });

    it('trata erro de salvamento sem perder as alterações pendentes', () => {
      component.onMarcacaoAlterada({ landmarks: [], linhaPrumoX: 0.5 });
      component.salvarRascunho();

      httpMock.expectOne('/api/avaliacoes-posturais/10').flush(
        { erro: 'Coordenada fora de [0,1]' },
        { status: 400, statusText: 'Bad Request' }
      );

      expect(component.erro).toBe('Coordenada fora de [0,1]');
      expect(component.salvando).toBeFalse();
      expect(component.alteracoesPendentes).toBeTrue();
    });

    it('inclui a proporção da imagem depois que o editor mede a foto', () => {
      component.onImagemMedida(0.75);
      component.onMarcacaoAlterada({ landmarks: [], linhaPrumoX: 0.5 });
      component.salvarRascunho();

      const req = httpMock.expectOne('/api/avaliacoes-posturais/10');
      expect(req.request.body).toEqual({ landmarks: [], linhaPrumoX: 0.5, proporcaoImagem: 0.75 });
      req.flush(mockRascunho);
    });

    it('preserva marcações feitas enquanto o PUT está em voo', () => {
      component.onMarcacaoAlterada({ landmarks: [], linhaPrumoX: 0.5 });
      component.salvarRascunho();

      const req = httpMock.expectOne('/api/avaliacoes-posturais/10');
      // A fisioterapeuta continua marcando antes de a resposta chegar.
      component.onMarcacaoAlterada({
        landmarks: [{ codigo: 'OLHO_ESQ', x: 0.4, y: 0.1 }],
        linhaPrumoX: 0.5
      });
      req.flush(mockRascunho);

      expect(component.alteracoesPendentes).toBeTrue();
    });

    it('não realimenta o editor com a resposta do salvamento', () => {
      const iniciais = component.landmarksIniciais;

      component.onMarcacaoAlterada({ landmarks: [], linhaPrumoX: 0.5 });
      component.salvarRascunho();
      httpMock.expectOne('/api/avaliacoes-posturais/10').flush({
        ...mockRascunho,
        landmarks: [{ codigo: 'TORNOZELO_DIR', x: 0.9, y: 0.9 }]
      });

      expect(component.landmarksIniciais).toBe(iniciais);
    });

    it('ignora salvamentos concorrentes enquanto um PUT está em andamento', () => {
      component.onMarcacaoAlterada({ landmarks: [], linhaPrumoX: 0.5 });
      component.salvarRascunho();
      component.salvarRascunho();

      const req = httpMock.expectOne('/api/avaliacoes-posturais/10');
      req.flush(mockRascunho);
    });
  });

  it('salva a linha de prumo centralizada que a tela mostra quando a análise não tem uma salva', () => {
    criar();
    httpMock.expectOne('/api/avaliacoes-posturais/10').flush({ ...mockRascunho, linhaPrumoX: null });
    httpMock.expectOne('/api/avaliacoes-posturais/10/foto').flush(new Blob(['b'], { type: 'image/jpeg' }));

    // Sem tocar em nada: o editor exibe o prumo no centro, e é isso que precisa ser gravado.
    component.salvarRascunho();

    const req = httpMock.expectOne('/api/avaliacoes-posturais/10');
    expect((req.request.body as { linhaPrumoX: number }).linhaPrumoX).toBe(0.5);
    req.flush(mockRascunho);
  });

  describe('análise concluída', () => {
    beforeEach(() => {
      criar();
      httpMock.expectOne('/api/avaliacoes-posturais/10').flush({ ...mockRascunho, status: 'CONCLUIDA' });
      httpMock.expectOne('/api/avaliacoes-posturais/10/foto').flush(new Blob(['b'], { type: 'image/jpeg' }));
    });

    it('abre em modo somente leitura', () => {
      expect(component.somenteLeitura).toBeTrue();
    });

    it('não salva rascunho de análise imutável', () => {
      component.salvarRascunho();
      httpMock.expectNone('/api/avaliacoes-posturais/10');
    });
  });

  it('libera o object URL da foto ao destruir o componente', () => {
    criar();
    httpMock.expectOne('/api/avaliacoes-posturais/10').flush(mockRascunho);
    httpMock.expectOne('/api/avaliacoes-posturais/10/foto').flush(new Blob(['b'], { type: 'image/jpeg' }));

    const revoke = spyOn(URL, 'revokeObjectURL');
    const url = component.fotoUrl;

    fixture.destroy();

    expect(revoke).toHaveBeenCalledWith(url!);
  });
});
