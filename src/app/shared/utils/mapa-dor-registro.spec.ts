import { DestroyRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { PontoDor } from '../../core/models/ponto-dor';
import { PontoDorService } from '../../core/services/ponto-dor.service';
import { MapaDorRegistro } from './mapa-dor-registro';

const ponto: PontoDor = { vista: 'FRENTE', x: 0.5, y: 0.5, desenhoVersao: 1, intensidade: null, observacao: null };

describe('MapaDorRegistro', () => {
  let service: jasmine.SpyObj<PontoDorService>;
  let mapa: MapaDorRegistro;

  beforeEach(() => {
    service = jasmine.createSpyObj('PontoDorService', ['listar', 'salvar']);
    mapa = new MapaDorRegistro(service, 'AVALIACAO', TestBed.inject(DestroyRef));
  });

  it('should load the points without the ids', () => {
    service.listar.and.returnValue(of([{ ...ponto, id: 4 }]));
    mapa.carregar(5);
    expect(service.listar).toHaveBeenCalledWith('AVALIACAO', 5);
    expect(mapa.pontos).toEqual([ponto]);
    expect(mapa.bloqueado).toBeFalse();
  });

  it('should block changes and saving after a failed load', () => {
    service.listar.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    mapa.carregar(5);
    expect(mapa.erroCarga).toBe('Erro ao carregar o mapa de dor.');
    mapa.alterar([ponto]);
    expect(mapa.alterado).toBeFalse();
    let resultado: string | null | undefined;
    mapa.gravar(5).subscribe(r => (resultado = r));
    expect(resultado).toBeNull();
    expect(service.salvar).not.toHaveBeenCalled();
  });

  it('should save only when changed, and report a refusal without failing', () => {
    let resultado: string | null | undefined;
    mapa.gravar(5).subscribe(r => (resultado = r));
    expect(service.salvar).not.toHaveBeenCalled();

    mapa.alterar([ponto]);
    service.salvar.and.returnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { detail: 'Vista inválida.' } })));
    mapa.gravar(5).subscribe(r => (resultado = r));
    expect(resultado).toBe('Vista inválida.');
    expect(mapa.alterado).toBeTrue();

    service.salvar.and.returnValue(of([{ ...ponto, id: 1 }]));
    mapa.gravar(5).subscribe(r => (resultado = r));
    expect(resultado).toBeNull();
    expect(mapa.alterado).toBeFalse();
    expect(mapa.pontos).toEqual([ponto]);
  });
});
