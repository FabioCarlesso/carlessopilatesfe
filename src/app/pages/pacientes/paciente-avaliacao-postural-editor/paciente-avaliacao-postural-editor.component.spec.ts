import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { PacienteAvaliacaoPosturalEditorComponent } from './paciente-avaliacao-postural-editor.component';
import {
  AvaliacaoPosturalResponseDTO,
  LandmarkDTO,
  MetricasPosturaisDTO
} from '../../../core/models/avaliacao-postural';

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
        linhaPrumoX: 0.48,
        observacoes: ''
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
      expect(req.request.body).toEqual({
        landmarks: [],
        linhaPrumoX: 0.5,
        observacoes: '',
        proporcaoImagem: 0.75
      });
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

  describe('medidas calculadas', () => {
    /** Métricas como a API as devolve para `mockRascunho`. */
    const metricasApi: MetricasPosturaisDTO = {
      inclinacaoCabecaGraus: 7.59,
      desnivelOmbrosGraus: 6.34,
      desnivelQuadrilGraus: null,
      desnivelJoelhosGraus: null,
      desvioPrumoNormalizado: 0.002,
      desvioPrumoCm: null
    };

    /** Marcação completa de uma vista frontal, com ombros desnivelados. */
    const marcacaoCompleta: LandmarkDTO[] = [
      { codigo: 'OLHO_ESQ', x: 0.45, y: 0.12 },
      { codigo: 'OLHO_DIR', x: 0.55, y: 0.13 },
      { codigo: 'OMBRO_ESQ', x: 0.38, y: 0.25 },
      { codigo: 'OMBRO_DIR', x: 0.62, y: 0.27 },
      { codigo: 'QUADRIL_ESQ', x: 0.42, y: 0.5 },
      { codigo: 'QUADRIL_DIR', x: 0.58, y: 0.5 },
      { codigo: 'JOELHO_ESQ', x: 0.43, y: 0.7 },
      { codigo: 'JOELHO_DIR', x: 0.57, y: 0.7 },
      { codigo: 'TORNOZELO_ESQ', x: 0.44, y: 0.92 },
      { codigo: 'TORNOZELO_DIR', x: 0.56, y: 0.92 }
    ];

    /** Análise sem proporção salva e sem métricas, para exercitar a prévia local. */
    const analiseSemProporcao: AvaliacaoPosturalResponseDTO = {
      ...mockRascunho,
      proporcaoImagem: null,
      metricas: null,
      landmarks: [
        { codigo: 'OMBRO_ESQ', x: 0.4, y: 0.2 },
        { codigo: 'OMBRO_DIR', x: 0.6, y: 0.3 }
      ]
    };

    /** Recarrega a tela com a análise acima, sem a foto ter sido medida. */
    function criarSemProporcao(): void {
      component.carregar();
      httpMock.expectOne('/api/avaliacoes-posturais/10').flush(analiseSemProporcao);
      httpMock.expectOne('/api/avaliacoes-posturais/10/foto').flush(new Blob(['b'], { type: 'image/jpeg' }));
    }

    beforeEach(() => {
      criar();
      httpMock.expectOne('/api/avaliacoes-posturais/10').flush(mockRascunho);
      httpMock.expectOne('/api/avaliacoes-posturais/10/foto').flush(new Blob(['b'], { type: 'image/jpeg' }));
    });

    it('mostra as métricas da API enquanto não há alterações pendentes', () => {
      component.analise = { ...mockRascunho, metricas: metricasApi };

      expect(component.exibindoPrevia).toBeFalse();
      expect(component.metricasExibidas?.desnivelOmbrosGraus).toBe(6.34);
    });

    it('troca para a prévia local assim que um ponto é movido', () => {
      component.onImagemMedida(0.75);
      component.onMarcacaoAlterada({
        landmarks: [
          { codigo: 'OMBRO_ESQ', x: 0.38, y: 0.25 },
          { codigo: 'OMBRO_DIR', x: 0.62, y: 0.27 }
        ],
        linhaPrumoX: 0.502
      });

      expect(component.exibindoPrevia).toBeTrue();
      // Mesma trigonometria do backend: conferido contra a resposta da API.
      expect(component.metricasExibidas?.desnivelOmbrosGraus).toBe(6.34);
      expect(component.metricasExibidas?.desvioPrumoNormalizado).toBe(0.002);
    });

    it('só habilita concluir com todos os pontos obrigatórios da vista', () => {
      component.onMarcacaoAlterada({ landmarks: marcacaoCompleta.slice(0, 8), linhaPrumoX: 0.5 });
      expect(component.pontosCompletos).toBeFalse();
      expect(component.podeConcluir).toBeFalse();

      component.onMarcacaoAlterada({ landmarks: marcacaoCompleta, linhaPrumoX: 0.5 });
      expect(component.podeConcluir).toBeTrue();
    });

    it('salva a marcação antes de concluir, para gravar o que está na tela', () => {
      component.onMarcacaoAlterada({ landmarks: marcacaoCompleta, linhaPrumoX: 0.5 });
      component.observacoes = 'Ombro direito mais baixo.';
      component.concluir();

      const put = httpMock.expectOne(
        req => req.url === '/api/avaliacoes-posturais/10' && req.method === 'PUT'
      );
      expect((put.request.body as { observacoes: string }).observacoes).toBe('Ombro direito mais baixo.');
      put.flush({ ...mockRascunho, landmarks: marcacaoCompleta });

      const patch = httpMock.expectOne('/api/avaliacoes-posturais/10/concluir');
      expect(patch.request.method).toBe('PATCH');
      patch.flush({ ...mockRascunho, status: 'CONCLUIDA', landmarks: marcacaoCompleta });

      expect(component.somenteLeitura).toBeTrue();
      expect(component.alteracoesPendentes).toBeFalse();
      expect(component.sucesso).toContain('concluída');
    });

    it('exibe a mensagem do 422 quando a API recusa a conclusão', () => {
      component.onMarcacaoAlterada({ landmarks: marcacaoCompleta, linhaPrumoX: 0.5 });
      component.concluir();

      httpMock.expectOne(req => req.method === 'PUT').flush(mockRascunho);
      httpMock.expectOne('/api/avaliacoes-posturais/10/concluir').flush(
        { erro: 'Pontos obrigatórios não marcados: [JOELHO_DIR]' },
        { status: 422, statusText: 'Unprocessable Entity' }
      );

      expect(component.erro).toBe('Pontos obrigatórios não marcados: [JOELHO_DIR]');
      expect(component.concluindo).toBeFalse();
      expect(component.somenteLeitura).toBeFalse();
    });

    it('não conclui quando o PUT prévio falha', () => {
      component.onMarcacaoAlterada({ landmarks: marcacaoCompleta, linhaPrumoX: 0.5 });
      component.concluir();

      httpMock.expectOne(req => req.method === 'PUT').flush(
        { erro: 'Coordenada fora de [0,1]' },
        { status: 400, statusText: 'Bad Request' }
      );

      httpMock.expectNone('/api/avaliacoes-posturais/10/concluir');
      expect(component.erro).toBe('Coordenada fora de [0,1]');
      expect(component.concluindo).toBeFalse();
    });

    it('avisa quando ajustes feitos durante a conclusão ficaram de fora do prontuário', () => {
      component.onMarcacaoAlterada({ landmarks: marcacaoCompleta, linhaPrumoX: 0.5 });
      component.concluir();

      const put = httpMock.expectOne(req => req.method === 'PUT');
      put.flush({ ...mockRascunho, landmarks: marcacaoCompleta });

      // A fisioterapeuta corrige um ponto entre o PUT e o PATCH: essa edição não
      // entrou no registro e, com a análise imutável, não tem mais como entrar.
      component.onMarcacaoAlterada({
        landmarks: [...marcacaoCompleta.slice(0, 9), { codigo: 'TORNOZELO_DIR', x: 0.51, y: 0.93 }],
        linhaPrumoX: 0.5
      });

      httpMock.expectOne('/api/avaliacoes-posturais/10/concluir').flush({
        ...mockRascunho,
        status: 'CONCLUIDA',
        landmarks: marcacaoCompleta
      });

      // Canal de aviso, e não de erro: a conclusão em si deu certo.
      expect(component.aviso).toContain('não entraram no prontuário');
      expect(component.erro).toBeNull();
      expect(component.sucesso).toBeNull();
    });

    it('descarta o aviso de rascunho salvo ao iniciar a conclusão', () => {
      component.onMarcacaoAlterada({ landmarks: marcacaoCompleta, linhaPrumoX: 0.5 });
      component.salvarRascunho();
      httpMock.expectOne(req => req.method === 'PUT').flush(mockRascunho);
      expect(component.sucesso).toContain('Rascunho salvo');

      // Sem isso, o "Rascunho salvo" ficaria no ar somando-se ao desfecho da conclusão.
      component.concluir();
      expect(component.sucesso).toBeNull();

      httpMock.expectOne(req => req.method === 'PUT').flush(mockRascunho);
      httpMock.expectOne('/api/avaliacoes-posturais/10/concluir')
        .flush({ ...mockRascunho, status: 'CONCLUIDA' });
    });

    it('realinha a marcação exibida com a que foi gravada ao concluir', () => {
      component.onMarcacaoAlterada({ landmarks: marcacaoCompleta, linhaPrumoX: 0.5 });
      component.concluir();

      httpMock.expectOne(req => req.method === 'PUT').flush(mockRascunho);
      // A API é a fonte da verdade: a tela não pode divergir do prontuário.
      const gravados: LandmarkDTO[] = [{ codigo: 'OLHO_ESQ', x: 0.1, y: 0.1 }];
      httpMock.expectOne('/api/avaliacoes-posturais/10/concluir').flush({
        ...mockRascunho,
        status: 'CONCLUIDA',
        linhaPrumoX: 0.47,
        landmarks: gravados
      });

      expect(component.landmarksIniciais).toEqual(gravados);
      expect(component.landmarksAtuais).toEqual(gravados);
      expect(component.prumoInicial).toBe(0.47);
    });

    it('não anuncia prévia só porque as observações foram digitadas', () => {
      component.analise = { ...mockRascunho, metricas: metricasApi };
      component.observacoes = 'Paciente relatou dor lombar.';
      component.onObservacoesAlteradas({
        target: { value: 'Paciente relatou dor lombar.' }
      } as unknown as Event);

      // As medidas não dependem do texto: seguem sendo as confirmadas pela API.
      expect(component.alteracoesPendentes).toBeTrue();
      expect(component.marcacaoPendente).toBeFalse();
      expect(component.exibindoPrevia).toBeFalse();
      expect(component.metricasExibidas).toBe(metricasApi);
    });

    it('recalcula a prévia quando a resposta da API muda a proporção da foto', () => {
      criarSemProporcao();

      // Sem proporção, a prévia assume foto quadrada: atan(0,1/0,2) = 26,57°.
      expect(component.metricasExibidas?.desnivelOmbrosGraus).toBe(26.57);

      // Salva sem tocar na marcação; a API devolve a análise já com a proporção.
      component.salvarRascunho();
      httpMock.expectOne('/api/avaliacoes-posturais/10')
        .flush({ ...analiseSemProporcao, proporcaoImagem: 0.5 });

      // Com proporção 0,5 o Δx real cai pela metade e o ângulo vai a 45°: a
      // prévia memoizada não pode sobreviver à troca da análise.
      expect(component.metricasExibidas?.desnivelOmbrosGraus).toBe(45);
    });

    it('mantém a mesma referência da prévia entre verificações, para não sujar o painel OnPush', () => {
      component.onImagemMedida(0.75);
      component.onMarcacaoAlterada({ landmarks: marcacaoCompleta, linhaPrumoX: 0.5 });

      expect(component.metricasExibidas).toBe(component.metricasExibidas);

      const antes = component.metricasExibidas;
      component.onMarcacaoAlterada({ landmarks: marcacaoCompleta.slice(0, 4), linhaPrumoX: 0.5 });
      expect(component.metricasExibidas).not.toBe(antes);
    });

    it('envia as observações apagadas como texto vazio, que a API grava', () => {
      // `null` seria ignorado pela API e deixaria a observação anterior gravada.
      component.observacoes = '   ';
      component.salvarRascunho();

      const req = httpMock.expectOne('/api/avaliacoes-posturais/10');
      expect((req.request.body as { observacoes: string }).observacoes).toBe('');
      req.flush(mockRascunho);
    });
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
