import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CampoOpcoesAvaliacao } from '../../../core/models/opcoes-avaliacao';
import { campoTeste } from '../../../../testing/opcoes-avaliacao';
import { SeletorOpcoesComponent } from './seletor-opcoes.component';

@Component({
  imports: [ReactiveFormsModule, SeletorOpcoesComponent],
  template: '<app-seletor-opcoes [formControl]="controle" [campo]="campo" />'
})
class HostComponent {
  campo: CampoOpcoesAvaliacao = campoTeste('regioesDor');
  controle = new FormControl<unknown>([]);
}

describe('SeletorOpcoesComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let el: HTMLElement;

  function montar(campo: string, valor: unknown): void {
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    host.campo = campoTeste(campo);
    host.controle = new FormControl<unknown>(valor);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  }

  function chip(valor: string): HTMLLabelElement {
    return el.querySelector(`[data-valor="${valor}"]`) as HTMLLabelElement;
  }

  function clicar(valor: string): void {
    (chip(valor).querySelector('input') as HTMLInputElement).click();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
  });

  it('agrupa as opções num fieldset com a legenda do campo', () => {
    montar('regioesDor', []);
    expect(el.querySelector('fieldset legend')?.textContent?.trim()).toBe('Regiões de dor/queixa');
  });

  describe('seleção múltipla', () => {
    it('oferece só as opções ativas como checkboxes', () => {
      montar('regioesDor', []);
      const valores = Array.from(el.querySelectorAll('[data-valor]')).map(l => l.getAttribute('data-valor'));
      expect(valores).toEqual(['CERVICAL', 'LOMBAR', 'OMBRO_DIREITO']);
      expect(el.querySelectorAll('input[type="checkbox"]').length).toBe(3);
    });

    it('marca e desmarca, emitindo na ordem do catálogo', () => {
      montar('regioesDor', []);
      clicar('OMBRO_DIREITO');
      clicar('CERVICAL');
      expect(host.controle.value).toEqual(['CERVICAL', 'OMBRO_DIREITO']);
      expect(chip('CERVICAL').classList).toContain('chip--marcado');
      expect(host.controle.touched).toBeTrue();

      clicar('CERVICAL');
      expect(host.controle.value).toEqual(['OMBRO_DIREITO']);
    });

    it('mostra a opção aposentada que o registro tem, marcada e como "opção antiga"', () => {
      montar('regioesDor', ['CEFALEIA_ANTIGA']);
      const antiga = chip('CEFALEIA_ANTIGA');
      expect(antiga.textContent).toContain('Cefaleia antiga');
      expect(antiga.textContent).toContain('(opção antiga)');
      expect((antiga.querySelector('input') as HTMLInputElement).checked).toBeTrue();

      clicar('CEFALEIA_ANTIGA');
      expect(host.controle.value).toEqual([]);
      // Continua na tela, para poder ser marcada de novo.
      expect(chip('CEFALEIA_ANTIGA')).toBeTruthy();
    });

    it('mostra o valor desconhecido do registro, para não perdê-lo', () => {
      montar('regioesDor', ['CERVICAL', 'JOELHO_X']);
      const desconhecida = chip('JOELHO_X');
      expect(desconhecida.textContent).toContain('JOELHO_X');
      expect(desconhecida.textContent).toContain('(opção antiga)');
      clicar('LOMBAR');
      expect(host.controle.value).toEqual(['CERVICAL', 'LOMBAR', 'JOELHO_X']);
    });

    it('acompanha o valor gravado depois (patchValue)', () => {
      montar('regioesDor', []);
      host.controle.setValue(['LOMBAR']);
      fixture.detectChanges();
      expect((chip('LOMBAR').querySelector('input') as HTMLInputElement).checked).toBeTrue();
    });

    it('desabilita os inputs com o controle', () => {
      montar('regioesDor', []);
      host.controle.disable();
      fixture.detectChanges();
      expect(Array.from(el.querySelectorAll('input')).every(i => (i as HTMLInputElement).disabled)).toBeTrue();
    });
  });

  describe('seleção única', () => {
    it('usa radios com o mesmo name e a opção "Não informado"', () => {
      montar('nivelAtividadeFisicaOpcao', null);
      const radios = Array.from(el.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
      expect(radios.length).toBe(3);
      expect(new Set(radios.map(r => r.name)).size).toBe(1);
      expect(radios[0].checked).toBeTrue();
      expect(radios[0].parentElement?.textContent).toContain('Não informado');
    });

    it('escolhe e limpa a seleção', () => {
      montar('nivelAtividadeFisicaOpcao', null);
      clicar('ATIVO');
      expect(host.controle.value).toBe('ATIVO');

      (el.querySelector('input[type="radio"]') as HTMLInputElement).click();
      fixture.detectChanges();
      expect(host.controle.value).toBeNull();
    });

    it('mostra a opção aposentada só quando é a do registro', () => {
      montar('nivelAtividadeFisicaOpcao', 'LEVE');
      expect(chip('LEVE').textContent).toContain('(opção antiga)');
      expect((chip('LEVE').querySelector('input') as HTMLInputElement).checked).toBeTrue();

      montar('nivelAtividadeFisicaOpcao', 'ATIVO');
      expect(chip('LEVE')).toBeNull();
    });

    it('instâncias diferentes não compartilham o name dos radios', () => {
      montar('nivelAtividadeFisicaOpcao', null);
      const primeiro = (el.querySelector('input[type="radio"]') as HTMLInputElement).name;
      montar('nivelAtividadeFisicaOpcao', null);
      expect((el.querySelector('input[type="radio"]') as HTMLInputElement).name).not.toBe(primeiro);
    });
  });

  describe('testes funcionais (com resultado)', () => {
    function resultados(teste: string): HTMLInputElement[] {
      return Array.from(chip(teste).querySelectorAll<HTMLInputElement>('.teste-resultado input[type="radio"]'));
    }

    it('marcar um teste pede o resultado e deixa o controle inválido até a escolha', () => {
      montar('testesFuncionais', []);
      clicar('SCHOBER');

      expect(host.controle.value).toEqual([{ teste: 'SCHOBER', resultado: null }]);
      expect(host.controle.hasError('resultadoPendente')).toBeTrue();
      expect(chip('SCHOBER').querySelector('.teste-pendente')?.textContent).toContain('Informe o resultado.');
      expect(chip('SCHOBER').querySelector('legend')?.textContent).toContain('Resultado do teste Schober');
      expect(resultados('SCHOBER')[0].classList).toContain('ng-invalid');

      resultados('SCHOBER')[1].click();
      fixture.detectChanges();
      expect(host.controle.value).toEqual([{ teste: 'SCHOBER', resultado: 'NEGATIVO' }]);
      expect(host.controle.valid).toBeTrue();
      expect(chip('SCHOBER').querySelector('.teste-pendente')).toBeNull();
    });

    it('carrega os testes do registro com o resultado marcado e desmarca', () => {
      montar('testesFuncionais', [{ teste: 'ADAMS', resultado: 'POSITIVO' }, { teste: 'LASEGUE_ANTIGO', resultado: 'NEGATIVO' }]);
      expect(resultados('ADAMS')[0].checked).toBeTrue();
      expect(chip('LASEGUE_ANTIGO').textContent).toContain('(opção antiga)');
      expect(resultados('LASEGUE_ANTIGO')[1].checked).toBeTrue();

      clicar('SCHOBER');
      resultados('SCHOBER')[0].click();
      fixture.detectChanges();
      expect(host.controle.value).toEqual([
        { teste: 'SCHOBER', resultado: 'POSITIVO' },
        { teste: 'ADAMS', resultado: 'POSITIVO' },
        { teste: 'LASEGUE_ANTIGO', resultado: 'NEGATIVO' }
      ]);

      clicar('ADAMS');
      expect(host.controle.value).toEqual([
        { teste: 'SCHOBER', resultado: 'POSITIVO' },
        { teste: 'LASEGUE_ANTIGO', resultado: 'NEGATIVO' }
      ]);
      expect(resultados('ADAMS').length).toBe(0);
    });

    it('não oferece o teste aposentado em seleção nova', () => {
      montar('testesFuncionais', []);
      expect(chip('LASEGUE_ANTIGO')).toBeNull();
    });
  });

  it('marca como tocado no blur', () => {
    montar('regioesDor', []);
    (chip('CERVICAL').querySelector('input') as HTMLInputElement).dispatchEvent(new Event('blur'));
    expect(host.controle.touched).toBeTrue();
  });

  it('trata valor nulo na múltipla como lista vazia', () => {
    montar('regioesDor', null);
    expect(el.querySelectorAll('input:checked').length).toBe(0);
  });
});
