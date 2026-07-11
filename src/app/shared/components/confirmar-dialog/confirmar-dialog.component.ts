import { NgClass, NgIf } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  Output,
  ViewChild
} from '@angular/core';

export type ConfirmarDialogVariante = 'primaria' | 'secundaria' | 'perigo';

const CLASSE_POR_VARIANTE: Record<ConfirmarDialogVariante, string> = {
  primaria: 'btn-primary',
  secundaria: 'btn-secondary',
  perigo: 'btn-danger'
};

const SELETOR_FOCAVEIS = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]'
].map(seletor => `${seletor}:not([tabindex="-1"])`).join(', ');

// Enquanto um diálogo está aberto, o conteúdo atrás do overlay não deve rolar.
const CLASSE_BODY_DIALOGO_ABERTO = 'dialog-aberto';

let proximoId = 0;

@Component({
  selector: 'app-confirmar-dialog',
  imports: [NgIf, NgClass],
  templateUrl: './confirmar-dialog.component.html',
  styleUrl: './confirmar-dialog.component.scss'
})
export class ConfirmarDialogComponent implements AfterViewInit, OnDestroy {
  @Input() titulo = 'Confirmar ação';
  @Input() mensagem: string | null = null;
  @Input() textoConfirmar = 'Confirmar';
  @Input() textoCancelar = 'Cancelar';
  @Input() variante: ConfirmarDialogVariante = 'primaria';
  @Input() processando = false;
  @Input() confirmarDesabilitado = false;
  @Input() fecharAoClicarFora = true;

  @Output() confirmar = new EventEmitter<void>();
  @Output() cancelar = new EventEmitter<void>();

  @ViewChild('dialog') private dialog?: ElementRef<HTMLElement>;
  @ViewChild('confirmarButton') private confirmarButton?: ElementRef<HTMLButtonElement>;

  private readonly id = proximoId++;
  readonly tituloId = `confirmar-dialog-titulo-${this.id}`;
  readonly corpoId = `confirmar-dialog-corpo-${this.id}`;

  // O componente é instanciado de forma síncrona no clique que abre o diálogo, então
  // `document.activeElement` ainda é o elemento disparador. Abrir o diálogo a partir de um
  // callback assíncrono capturaria `<body>` e o foco não teria para onde voltar ao fechar.
  private readonly elementoDisparador: HTMLElement | null =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;

  get classeConfirmar(): string {
    return CLASSE_POR_VARIANTE[this.variante];
  }

  ngAfterViewInit(): void {
    document.body.classList.add(CLASSE_BODY_DIALOGO_ABERTO);

    const confirmarButton = this.confirmarButton?.nativeElement;
    if (confirmarButton && !confirmarButton.disabled) {
      confirmarButton.focus();
      return;
    }

    const primeiroFocavel = this.focaveis()[0];
    (primeiroFocavel ?? this.dialog?.nativeElement)?.focus();
  }

  ngOnDestroy(): void {
    document.body.classList.remove(CLASSE_BODY_DIALOGO_ABERTO);
    this.elementoDisparador?.focus();
  }

  emitirConfirmar(): void {
    if (this.processando || this.confirmarDesabilitado) return;
    this.confirmar.emit();
  }

  emitirCancelar(): void {
    if (this.processando) return;
    this.cancelar.emit();
  }

  aoClicarNoOverlay(): void {
    if (!this.fecharAoClicarFora) return;
    this.emitirCancelar();
  }

  @HostListener('document:keydown.escape')
  aoPressionarEsc(): void {
    this.emitirCancelar();
  }

  aoTeclar(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;

    const focaveis = this.focaveis();
    if (focaveis.length === 0) {
      event.preventDefault();
      return;
    }

    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];
    const ativo = document.activeElement as HTMLElement | null;

    if (event.shiftKey && (ativo === primeiro || ativo === null || !focaveis.includes(ativo))) {
      event.preventDefault();
      ultimo.focus();
      return;
    }

    if (!event.shiftKey && ativo === ultimo) {
      event.preventDefault();
      primeiro.focus();
    }
  }

  private focaveis(): HTMLElement[] {
    const dialog = this.dialog?.nativeElement;
    if (!dialog) return [];
    return Array.from(dialog.querySelectorAll<HTMLElement>(SELETOR_FOCAVEIS));
  }
}
