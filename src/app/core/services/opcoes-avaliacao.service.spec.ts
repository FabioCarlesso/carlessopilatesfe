import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CatalogoOpcoesAvaliacao } from '../models/opcoes-avaliacao';
import { OpcoesAvaliacaoService } from './opcoes-avaliacao.service';

const catalogo: CatalogoOpcoesAvaliacao = {
  campos: [{
    campo: 'regioesDor', rotulo: 'Regiões de dor/queixa', selecao: 'MULTIPLA', comResultado: false,
    campoComplemento: 'regioesDorComplemento',
    opcoes: [{ valor: 'CERVICAL', rotulo: 'Cervical', ativa: true }]
  }]
};

describe('OpcoesAvaliacaoService', () => {
  let service: OpcoesAvaliacaoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(OpcoesAvaliacaoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('busca o catálogo em GET /api/avaliacoes/opcoes', () => {
    let recebido: CatalogoOpcoesAvaliacao | undefined;
    service.catalogo().subscribe(c => (recebido = c));

    const req = httpMock.expectOne('/api/avaliacoes/opcoes');
    expect(req.request.method).toBe('GET');
    req.flush(catalogo);
    expect(recebido).toEqual(catalogo);
  });

  it('reaproveita o catálogo carregado, sem novo pedido', () => {
    service.catalogo().subscribe();
    httpMock.expectOne('/api/avaliacoes/opcoes').flush(catalogo);

    let segundo: CatalogoOpcoesAvaliacao | undefined;
    service.catalogo().subscribe(c => (segundo = c));
    httpMock.expectNone('/api/avaliacoes/opcoes');
    expect(segundo).toEqual(catalogo);
  });

  it('compartilha o pedido em andamento entre assinantes', () => {
    const recebidos: CatalogoOpcoesAvaliacao[] = [];
    service.catalogo().subscribe(c => recebidos.push(c));
    service.catalogo().subscribe(c => recebidos.push(c));

    httpMock.expectOne('/api/avaliacoes/opcoes').flush(catalogo);
    expect(recebidos.length).toBe(2);
  });

  it('não guarda a falha: o próximo pedido tenta de novo', () => {
    let erro: unknown;
    service.catalogo().subscribe({ error: e => (erro = e) });
    httpMock.expectOne('/api/avaliacoes/opcoes').flush('falha', { status: 500, statusText: 'Erro' });
    expect(erro).toBeTruthy();

    let recebido: CatalogoOpcoesAvaliacao | undefined;
    service.catalogo().subscribe(c => (recebido = c));
    httpMock.expectOne('/api/avaliacoes/opcoes').flush(catalogo);
    expect(recebido).toEqual(catalogo);
  });
});
