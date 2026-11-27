import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Subject, of, throwError } from 'rxjs';
import {
  ExportarProntuarioComponent,
  MENSAGEM_PERIODO_PRONTUARIO_INVALIDO,
  MENSAGEM_SEM_PERMISSAO_PRONTUARIO
} from './exportar-prontuario.component';
import { UserRole } from '../../../core/models/auth';
import { AuthService } from '../../../core/services/auth.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { isOnPush } from '../../../../testing/onpush';

function arquivo(nome: string | null): HttpResponse<Blob> {
  return new HttpResponse({
    body: new Blob(['%PDF'], { type: 'application/pdf' }),
    headers: nome ? new HttpHeaders({ 'Content-Disposition': `attachment; filename="${nome}"` }) : new HttpHeaders()
  });
}

describe('ExportarProntuarioComponent', () => {
  let fixture: ComponentFixture<ExportarProntuarioComponent>;
  let component: ExportarProntuarioComponent;
  let serviceSpy: jasmine.SpyObj<PacienteService>;
  /** Nome de cada arquivo "baixado": o clique real gravaria o Blob em ~/Downloads. */
  let downloads: string[];

  const el = () => fixture.nativeElement as HTMLElement;
  const botao = () => el().querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const datas = () => Array.from(el().querySelectorAll<HTMLInputElement>('input[type="date"]'));

  async function montar(roles: UserRole[]): Promise<void> {
    serviceSpy = jasmine.createSpyObj<PacienteService>('PacienteService', ['exportarProntuarioPdf']);
    await TestBed.configureTestingModule({
      imports: [ExportarProntuarioComponent],
      providers: [
        { provide: PacienteService, useValue: serviceSpy },
        {
          provide: AuthService,
          useValue: { hasAnyRole: (aceitos: readonly UserRole[]) => aceitos.some(r => roles.includes(r)) }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ExportarProntuarioComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('pacienteId', 7);
    fixture.detectChanges();
  }

  function enviar(inicio = '', fim = ''): void {
    component.form.setValue({ inicio, fim });
    botao().click();
    fixture.detectChanges();
  }

  /** `Blob.text()` resolve fora do controle do teste: espera a leitura do corpo terminar. */
  async function aguardarExportacao(): Promise<void> {
    for (let i = 0; i < 50 && component.exportando(); i++) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    fixture.detectChanges();
  }

  beforeEach(() => {
    downloads = [];
    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:prontuario');
    spyOn(window.URL, 'revokeObjectURL');
    spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
      downloads.push(this.download);
    });
  });

  describe('para papéis clínicos', () => {
    beforeEach(async () => montar(['PROFISSIONAL']));

    it('should use OnPush and render labeled optional date fields with a unique heading', () => {
      expect(isOnPush(ExportarProntuarioComponent)).toBeTrue();
      const secao = el().querySelector('section')!;
      const titulo = el().querySelector('h2')!;
      expect(secao.getAttribute('aria-labelledby')).toBe(titulo.id);
      expect(titulo.textContent?.trim()).toBe('Prontuário em PDF');
      datas().forEach(input => {
        expect(el().querySelector(`label[for="${input.id}"]`)).not.toBeNull();
        expect(input.required).toBeFalse();
      });
      expect(botao().textContent?.trim()).toBe('Exportar prontuário (PDF)');
      expect(secao.classList.contains('card')).toBeFalse();

      fixture.componentRef.setInput('cartao', true);
      fixture.detectChanges();
      expect(secao.classList.contains('card')).toBeTrue();
    });

    it('should export the full record without a period and download with the API file name', () => {
      serviceSpy.exportarProntuarioPdf.and.returnValue(of(arquivo('prontuario-ana-silva-completo.pdf')));

      enviar();

      expect(serviceSpy.exportarProntuarioPdf).toHaveBeenCalledOnceWith(7, { inicio: null, fim: null });
      expect(downloads).toEqual(['prontuario-ana-silva-completo.pdf']);
      expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:prontuario');
    });

    it('should send the period sides that were filled and fall back to a local file name', () => {
      serviceSpy.exportarProntuarioPdf.and.returnValue(of(arquivo(null)));

      enviar('2026-01-01', '2026-06-30');
      enviar('2026-01-01', '');
      enviar('', '2026-06-30');

      expect(serviceSpy.exportarProntuarioPdf.calls.allArgs()).toEqual([
        [7, { inicio: '2026-01-01', fim: '2026-06-30' }],
        [7, { inicio: '2026-01-01', fim: null }],
        [7, { inicio: null, fim: '2026-06-30' }]
      ]);
      expect(downloads).toEqual(['prontuario-7.pdf', 'prontuario-7.pdf', 'prontuario-7.pdf']);
    });

    it('should block a start date after the end date without calling the API', () => {
      enviar('2026-06-30', '2026-01-01');

      expect(serviceSpy.exportarProntuarioPdf).not.toHaveBeenCalled();
      const erro = el().querySelector('.exportar-erro-periodo')!;
      expect(erro.textContent?.trim()).toBe(MENSAGEM_PERIODO_PRONTUARIO_INVALIDO);
      expect(erro.getAttribute('role')).toBe('alert');
      datas().forEach(input => {
        expect(input.classList).toContain('is-invalid');
        expect(input.getAttribute('aria-describedby')).toBe(erro.id);
      });

      serviceSpy.exportarProntuarioPdf.and.returnValue(of(arquivo('prontuario.pdf')));
      enviar('2026-01-01', '2026-01-01');
      expect(serviceSpy.exportarProntuarioPdf).toHaveBeenCalledTimes(1);
      expect(el().querySelector('.exportar-erro-periodo')).toBeNull();
    });

    it('should disable the button while the PDF is generated and ignore repeated submits', () => {
      const resposta$ = new Subject<HttpResponse<Blob>>();
      serviceSpy.exportarProntuarioPdf.and.returnValue(resposta$);

      enviar();
      expect(botao().disabled).toBeTrue();
      expect(botao().textContent?.trim()).toBe('Gerando PDF...');
      component.exportar();
      expect(serviceSpy.exportarProntuarioPdf).toHaveBeenCalledTimes(1);

      resposta$.next(arquivo('prontuario.pdf'));
      resposta$.complete();
      fixture.detectChanges();

      expect(downloads).toEqual(['prontuario.pdf']);
      expect(botao().disabled).toBeFalse();
      expect(botao().textContent?.trim()).toBe('Exportar prontuário (PDF)');
    });

    it('should show the permission message on 403 on the screen', () => {
      serviceSpy.exportarProntuarioPdf.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403 })));

      enviar();

      const alerta = el().querySelector('.exportar-erro')!;
      expect(alerta.textContent?.trim()).toBe(MENSAGEM_SEM_PERMISSAO_PRONTUARIO);
      expect(alerta.getAttribute('role')).toBe('alert');
      expect(botao().disabled).toBeFalse();
      expect(downloads).toEqual([]);
    });

    it('should show the API detail read from the Blob body and a fallback otherwise', async () => {
      const corpo = new Blob([JSON.stringify({ detail: 'Data inicial posterior à final' })], {
        type: 'application/problem+json'
      });
      serviceSpy.exportarProntuarioPdf.and.returnValue(throwError(() => new HttpErrorResponse({ status: 400, error: corpo })));
      enviar();
      await aguardarExportacao();
      expect(el().querySelector('.exportar-erro')?.textContent?.trim()).toBe('Data inicial posterior à final');

      serviceSpy.exportarProntuarioPdf.and.returnValue(throwError(() => new Error('rede')));
      enviar();
      await aguardarExportacao();
      expect(el().querySelector('.exportar-erro')?.textContent?.trim()).toBe('Erro ao exportar o prontuário em PDF.');
      expect(botao().disabled).toBeFalse();
    });

    it('should report a failure to save the file and clear the error on the next export', () => {
      serviceSpy.exportarProntuarioPdf.and.returnValue(of(arquivo('prontuario.pdf')));
      (window.URL.createObjectURL as jasmine.Spy).and.throwError('sem memória');
      enviar();
      expect(el().querySelector('.exportar-erro')?.textContent?.trim()).toBe('Erro ao exportar o prontuário em PDF.');
      expect(component.exportando()).toBeFalse();

      (window.URL.createObjectURL as jasmine.Spy).and.returnValue('blob:prontuario');
      enviar();
      expect(el().querySelector('.exportar-erro')).toBeNull();
      expect(downloads).toEqual(['prontuario.pdf']);
    });
  });

  it('should also show the export to ADMIN', async () => {
    await montar(['ADMIN']);
    expect(el().querySelector('section')).not.toBeNull();
  });

  for (const papel of ['RECEPCAO', 'FINANCEIRO'] as UserRole[]) {
    it(`should hide the export from ${papel}`, async () => {
      await montar([papel]);
      expect(el().querySelector('section')).toBeNull();
      expect(el().querySelector('button')).toBeNull();
    });
  }
});
