import { Component, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmarDialogComponent } from './confirmar-dialog.component';

@Component({
  imports: [ConfirmarDialogComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <button type="button" #disparador (click)="aberto = true">Abrir</button>
    @if (aberto) {
      <app-confirmar-dialog
        titulo="Confirmar inativação"
        mensagem="Confirma a inativação?"
        variante="perigo"
        [processando]="processando"
        [confirmarDesabilitado]="confirmarDesabilitado"
        [fecharAoClicarFora]="fecharAoClicarFora"
        (confirmar)="confirmado = confirmado + 1"
        (cancelar)="aberto = false" />
    }
    `
})
class HostComponent {
  @ViewChild('disparador') disparador!: { nativeElement: HTMLButtonElement };
  aberto = false;
  processando = false;
  confirmarDesabilitado = false;
  fecharAoClicarFora = false;
  confirmado = 0;
}

describe('ConfirmarDialogComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const el = () => fixture.nativeElement as HTMLElement;
  const dialog = () => el().querySelector('.dialog') as HTMLElement | null;
  const confirmarBtn = () => el().querySelector('.dialog .btn-danger') as HTMLButtonElement;
  const cancelarBtn = () => el().querySelector('.dialog .btn-outline') as HTMLButtonElement;

  const abrir = () => {
    host.disparador.nativeElement.focus();
    host.disparador.nativeElement.click();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    abrir();
    expect(dialog()).toBeTruthy();
  });

  it('should describe the dialog by its body, covering message and projected content', () => {
    abrir();

    const corpo = el().querySelector('.dialog > div[id]') as HTMLElement;
    expect(dialog()?.getAttribute('aria-describedby')).toBe(corpo.id);
    expect(corpo.textContent?.trim()).toBe('Confirma a inativação?');
  });

  it('should lock body scroll while open and release it when closed', () => {
    abrir();
    expect(document.body.classList.contains('dialog-aberto')).toBeTrue();

    cancelarBtn().click();
    fixture.detectChanges();

    expect(document.body.classList.contains('dialog-aberto')).toBeFalse();
  });

  it('should keep the body locked while another dialog is still open', () => {
    const primeiro = TestBed.createComponent(ConfirmarDialogComponent);
    const segundo = TestBed.createComponent(ConfirmarDialogComponent);
    primeiro.detectChanges();
    segundo.detectChanges();

    expect(document.body.classList.contains('dialog-aberto')).toBeTrue();

    primeiro.destroy();
    expect(document.body.classList.contains('dialog-aberto')).toBeTrue();

    segundo.destroy();
    expect(document.body.classList.contains('dialog-aberto')).toBeFalse();
  });

  it('should render title, message and confirm button with the variant class', () => {
    abrir();

    const titulo = el().querySelector('.dialog-title') as HTMLElement;
    expect(titulo.textContent?.trim()).toBe('Confirmar inativação');
    expect(dialog()?.getAttribute('aria-labelledby')).toBe(titulo.id);
    expect(dialog()?.getAttribute('role')).toBe('dialog');
    expect(dialog()?.getAttribute('aria-modal')).toBe('true');
    expect(el().querySelector('.dialog p')?.textContent?.trim()).toBe('Confirma a inativação?');
    expect(confirmarBtn()).toBeTruthy();
  });

  it('should focus the confirm button when opened', () => {
    abrir();
    expect(document.activeElement).toBe(confirmarBtn());
  });

  it('should focus the next focusable element when the confirm button starts disabled', () => {
    host.confirmarDesabilitado = true;
    abrir();

    expect(document.activeElement).toBe(cancelarBtn());
  });

  it('should return focus to the trigger element when closed', () => {
    abrir();
    cancelarBtn().click();
    fixture.detectChanges();

    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(host.disparador.nativeElement);
  });

  it('should emit confirmar when the confirm button is clicked', () => {
    abrir();
    confirmarBtn().click();

    expect(host.confirmado).toBe(1);
  });

  it('should emit cancelar when Escape is pressed', () => {
    abrir();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(host.aberto).toBeFalse();
  });

  it('should not close on Escape while processing', () => {
    abrir();
    host.processando = true;
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(host.aberto).toBeTrue();
  });

  it('should disable both buttons while processing', () => {
    abrir();
    host.processando = true;
    fixture.detectChanges();

    expect(confirmarBtn().disabled).toBeTrue();
    expect(cancelarBtn().disabled).toBeTrue();
  });

  it('should disable the confirm button when confirmarDesabilitado is true', () => {
    host.confirmarDesabilitado = true;
    abrir();

    expect(confirmarBtn().disabled).toBeTrue();
    expect(cancelarBtn().disabled).toBeFalse();
  });

  it('should trap focus, moving from the last element back to the first on Tab', () => {
    abrir();
    cancelarBtn().focus();

    const evento = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    cancelarBtn().dispatchEvent(evento);
    fixture.detectChanges();

    expect(evento.defaultPrevented).toBeTrue();
    expect(document.activeElement).toBe(confirmarBtn());
  });

  it('should trap focus, moving from the first element to the last on Shift+Tab', () => {
    abrir();
    confirmarBtn().focus();

    const evento = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true
    });
    confirmarBtn().dispatchEvent(evento);
    fixture.detectChanges();

    expect(evento.defaultPrevented).toBeTrue();
    expect(document.activeElement).toBe(cancelarBtn());
  });

  it('should not close when the overlay is clicked and fecharAoClicarFora is false', () => {
    abrir();
    (el().querySelector('.dialog-overlay') as HTMLElement).click();
    fixture.detectChanges();

    expect(host.aberto).toBeTrue();
  });

  it('should close when the overlay is clicked and fecharAoClicarFora is true', () => {
    host.fecharAoClicarFora = true;
    abrir();
    (el().querySelector('.dialog-overlay') as HTMLElement).click();
    fixture.detectChanges();

    expect(host.aberto).toBeFalse();
  });

  it('should close on overlay click by default', () => {
    const dialogFixture = TestBed.createComponent(ConfirmarDialogComponent);
    expect(dialogFixture.componentInstance.fecharAoClicarFora).toBeTrue();
  });

  it('should not close when clicking inside the dialog content', () => {
    host.fecharAoClicarFora = true;
    abrir();
    dialog()!.click();
    fixture.detectChanges();

    expect(host.aberto).toBeTrue();
  });
});
