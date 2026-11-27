import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { PontoDorDTO, PontosDorRegistroDTO } from '../../../core/models/ponto-dor';
import { PontoDorService } from '../../../core/services/ponto-dor.service';
import { ComparativoMapaDorComponent } from './comparativo-mapa-dor.component';

function ponto(parcial: Partial<PontoDorDTO> = {}): PontoDorDTO {
  return { id: 1, vista: 'COSTAS', x: 0.5, y: 0.45, desenhoVersao: 1, intensidade: 7, observacao: null, ...parcial };
}

const historico: PontosDorRegistroDTO[] = [
  { origem: 'AVALIACAO', registroId: 5, data: '2026-01-10', pontos: [ponto(), ponto({ id: 2, intensidade: 5 })] },
  { origem: 'AVALIACAO', registroId: 6, data: '2026-02-10', pontos: [ponto({ id: 3, desenhoVersao: 2 })] },
  { origem: 'REAVALIACAO', registroId: 9, data: '2026-03-10', pontos: [ponto({ id: 4, intensidade: 2 }), ponto({ id: 5, vista: 'FRENTE' })] }
];

describe('ComparativoMapaDorComponent', () => {
  let fixture: ComponentFixture<ComparativoMapaDorComponent>;
  let component: ComparativoMapaDorComponent;
  let service: jasmine.SpyObj<PontoDorService>;

  async function montar(resposta = of(historico)) {
    service = jasmine.createSpyObj('PontoDorService', ['historicoDoPaciente']);
    service.historicoDoPaciente.and.returnValue(resposta);
    await TestBed.configureTestingModule({
      imports: [ComparativoMapaDorComponent],
      providers: [{ provide: PontoDorService, useValue: service }]
    }).compileComponents();
    fixture = TestBed.createComponent(ComparativoMapaDorComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('pacienteId', 10);
    fixture.detectChanges();
  }

  function el(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  it('should show the records side by side, oldest first, titled like the timeline', async () => {
    await montar();
    expect(service.historicoDoPaciente).toHaveBeenCalledWith(10);
    const titulos = Array.from(el().querySelectorAll('.comparativo__registro-titulo')).map(h => h.textContent!.trim());
    expect(titulos).toEqual([
      'Avaliação inicial · 10/01/2026',
      'Avaliação fisioterapêutica · 10/02/2026',
      'Reavaliação · 10/03/2026'
    ]);
  });

  it('should open on a view that has points and show only that view, read-only', async () => {
    await montar();
    expect(component.vista).toBe('FRENTE');
    component.selecionarVista('COSTAS');
    fixture.detectChanges();
    const registros = el().querySelectorAll('.comparativo__registro');
    expect(registros[0].querySelectorAll('span.ponto').length).toBe(2);
    expect(registros[0].querySelectorAll('figure').length).toBe(1);
    expect(el().querySelectorAll('button.ponto').length).toBe(0);
    // Cada registro abre com o desenho em que foi marcado.
    expect(registros[1].querySelector('img')!.getAttribute('src')).toBe('mapa-corporal/v2/costas.svg');
    expect(registros[2].querySelector('.lista-pontos__item')!.textContent).toContain('intensidade 2/10');
  });

  it('should switch the view by the buttons, with the count of points', async () => {
    await montar();
    const botoes = Array.from(el().querySelectorAll<HTMLButtonElement>('.comparativo__vistas button'));
    expect(botoes.map(b => b.textContent!.trim())).toEqual(['Frente (1)', 'Costas (4)', 'Lateral direita (0)', 'Lateral esquerda (0)']);
    botoes[2].click();
    fixture.detectChanges();
    expect(component.vista).toBe('LATERAL_DIREITA');
    expect(botoes[2].getAttribute('aria-pressed')).toBe('true');
    expect(el().querySelector('.lista-pontos__vazia')?.textContent).toContain('Sem pontos nesta vista.');
  });

  it('should move to the first view with points when the front has none', async () => {
    await montar(of([historico[0]]));
    expect(component.vista).toBe('COSTAS');
  });

  it('should show the empty state without records with points', async () => {
    await montar(of([]));
    expect(el().querySelector('app-empty-state')?.textContent).toContain('Nenhum ponto de dor registrado.');
  });

  it('should show the API detail when loading fails', async () => {
    await montar(throwError(() => new HttpErrorResponse({ status: 403, error: { detail: 'Sem acesso ao prontuário.' } })));
    expect(el().querySelector('.alert-danger')?.textContent).toContain('Sem acesso ao prontuário.');
    expect(component.loading).toBeFalse();
  });

  it('should reload when the trigger changes', async () => {
    await montar();
    fixture.componentRef.setInput('gatilho', [1]);
    fixture.detectChanges();
    expect(service.historicoDoPaciente).toHaveBeenCalledTimes(2);
  });
});
