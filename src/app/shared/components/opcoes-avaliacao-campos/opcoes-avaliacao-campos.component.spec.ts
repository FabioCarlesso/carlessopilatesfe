import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { Observable, Subject, of, throwError } from 'rxjs';
import { CAMPOS_OPCOES_REAVALIACAO, CatalogoOpcoesAvaliacao } from '../../../core/models/opcoes-avaliacao';
import { CATALOGO_OPCOES_TESTE, provideOpcoesAvaliacaoFake } from '../../../../testing/opcoes-avaliacao';
import { controlesOpcoes } from '../../utils/opcoes-avaliacao';
import { OpcoesAvaliacaoCamposComponent } from './opcoes-avaliacao-campos.component';

describe('OpcoesAvaliacaoCamposComponent', () => {
  let fixture: ComponentFixture<OpcoesAvaliacaoCamposComponent>;
  let el: HTMLElement;
  let form: FormGroup;

  async function montar(catalogo: () => Observable<CatalogoOpcoesAvaliacao>) {
    await TestBed.configureTestingModule({
      imports: [OpcoesAvaliacaoCamposComponent],
      providers: [provideOpcoesAvaliacaoFake(catalogo)]
    }).compileComponents();
    form = new FormGroup(controlesOpcoes(CAMPOS_OPCOES_REAVALIACAO));
    fixture = TestBed.createComponent(OpcoesAvaliacaoCamposComponent);
    fixture.componentRef.setInput('form', form);
    fixture.componentRef.setInput('campos', CAMPOS_OPCOES_REAVALIACAO);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  }

  it('desenha um seletor e um "Outros / observações" por campo, na ordem do formulário', async () => {
    await montar(() => of(CATALOGO_OPCOES_TESTE));
    const grupos = Array.from(el.querySelectorAll('.opcoes-grupo')).map(g => g.getAttribute('data-campo'));
    expect(grupos).toEqual(CAMPOS_OPCOES_REAVALIACAO.map(def => def.campo));

    const complemento = el.querySelector<HTMLTextAreaElement>('#equilibrioComplemento');
    expect(complemento).toBeTruthy();
    const label = el.querySelector('label[for="equilibrioComplemento"]');
    expect(label?.textContent).toContain('Outros / observações');
    expect(label?.textContent).toContain('Equilíbrio');
  });

  it('liga seletor e complemento aos controles da página', async () => {
    await montar(() => of(CATALOGO_OPCOES_TESTE));
    (el.querySelector('[data-campo="regioesDor"] [data-valor="LOMBAR"] input') as HTMLInputElement).click();
    const complemento = el.querySelector<HTMLTextAreaElement>('#regioesDorComplemento') as HTMLTextAreaElement;
    complemento.value = 'Irradia';
    complemento.dispatchEvent(new Event('input'));

    expect(form.value.regioesDor).toEqual(['LOMBAR']);
    expect(form.value.regioesDorComplemento).toBe('Irradia');
  });

  it('omite o campo que o catálogo não traz', async () => {
    await montar(() => of({ campos: CATALOGO_OPCOES_TESTE.campos.filter(c => c.campo !== 'testesFuncionais') }));
    expect(el.querySelector('[data-campo="testesFuncionais"]')).toBeNull();
    expect(el.querySelector('[data-campo="regioesDor"]')).toBeTruthy();
  });

  it('mostra o carregamento enquanto o catálogo não chega', async () => {
    const catalogo$ = new Subject<CatalogoOpcoesAvaliacao>();
    await montar(() => catalogo$);
    expect(el.querySelector('app-carregando')).toBeTruthy();
    catalogo$.next(CATALOGO_OPCOES_TESTE);
    fixture.detectChanges();
    expect(el.querySelector('app-carregando')).toBeNull();
    expect(el.querySelectorAll('.opcoes-grupo').length).toBe(CAMPOS_OPCOES_REAVALIACAO.length);
  });

  it('avisa da falha, mantém os valores e tenta de novo', async () => {
    let chamadas = 0;
    await montar(() => (++chamadas === 1 ? throwError(() => new Error('falha')) : of(CATALOGO_OPCOES_TESTE)));
    expect(el.querySelector('.opcoes-erro')?.textContent).toContain('Não foi possível carregar as opções pré-definidas');
    expect(el.querySelector('.opcoes-grupo')).toBeNull();

    (el.querySelector('.opcoes-erro button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(chamadas).toBe(2);
    expect(el.querySelector('.opcoes-erro')).toBeNull();
    expect(el.querySelector('.opcoes-grupo')).toBeTruthy();
  });
});
