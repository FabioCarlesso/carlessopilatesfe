import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TRATA_403_LOCALMENTE } from '../interceptors/forbidden.interceptor';
import { ListaEsperaRequestDTO, ListaEsperaResponseDTO } from '../models/lista-espera';
import { ListaEsperaService } from './lista-espera.service';

const mockEntrada: ListaEsperaResponseDTO = {
  id: 1,
  pacienteId: 10,
  pacienteNome: 'Ana Souza',
  diaSemana: 'WEDNESDAY',
  horaInicio: '08:00:00',
  horaFim: '09:00:00',
  dataEntrada: '2026-05-11T10:00:00',
  observacao: 'Prefere aparelho'
};

const mockRequest: ListaEsperaRequestDTO = {
  pacienteId: 10,
  diaSemana: 'WEDNESDAY',
  horaInicio: '08:00',
  horaFim: '09:00',
  observacao: 'Prefere aparelho'
};

describe('ListaEsperaService', () => {
  let service: ListaEsperaService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ListaEsperaService]
    });
    service = TestBed.inject(ListaEsperaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('listar', () => {
    it('should GET /api/lista-espera without params when no filter is given', () => {
      service.listar().subscribe(fila => expect(fila).toEqual([mockEntrada]));

      const req = httpMock.expectOne('/api/lista-espera');
      expect(req.request.method).toBe('GET');
      req.flush([mockEntrada]);
    });

    it('should send weekday, time range and patient as query params', () => {
      service.listar({
        diaSemana: 'WEDNESDAY',
        horaInicio: '08:00',
        horaFim: '09:00',
        pacienteId: 10
      }).subscribe();

      const req = httpMock.expectOne(request => request.url === '/api/lista-espera');
      expect(req.request.method).toBe('GET');
      expect(req.request.params.toString())
        .toBe('diaSemana=WEDNESDAY&horaInicio=08:00&horaFim=09:00&pacienteId=10');
      req.flush([mockEntrada]);
    });

    // A API responde 400 para meia faixa; mandar só uma ponta seria um erro
    // previsível gasto numa ida ao servidor.
    it('should omit a half-filled time range', () => {
      service.listar({ diaSemana: 'WEDNESDAY', horaInicio: '08:00' }).subscribe();

      const req = httpMock.expectOne(request =>
        request.url === '/api/lista-espera' && request.params.get('diaSemana') === 'WEDNESDAY'
      );
      expect(req.request.params.has('horaInicio')).toBeFalse();
      expect(req.request.params.has('horaFim')).toBeFalse();
      req.flush([]);
    });

    // O aviso de cancelamento absorve a falha da consulta; sem esta marca o
    // tratamento global de 403 levaria o usuário para /403 antes disso.
    it('should mark the read as handled locally', () => {
      service.listar().subscribe();

      const req = httpMock.expectOne('/api/lista-espera');
      expect(req.request.context.get(TRATA_403_LOCALMENTE)).toBeTrue();
      req.flush([]);
    });
  });

  describe('criar', () => {
    it('should POST /api/lista-espera with the payload', () => {
      service.criar(mockRequest).subscribe(entrada => expect(entrada).toEqual(mockEntrada));

      const req = httpMock.expectOne('/api/lista-espera');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockRequest);
      req.flush(mockEntrada);
    });
  });

  describe('excluir', () => {
    it('should DELETE /api/lista-espera/:id', () => {
      service.excluir(1).subscribe();

      const req = httpMock.expectOne('/api/lista-espera/1');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });
});
