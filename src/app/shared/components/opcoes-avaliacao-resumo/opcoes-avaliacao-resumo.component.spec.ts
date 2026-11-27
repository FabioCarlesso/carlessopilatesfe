import { ComponentFixture, TestBed } from '@angular/core/testing';
import { throwError } from 'rxjs';
import { CAMPOS_OPCOES_EXAME_FISICO, CAMPOS_OPCOES_REAVALIACAO } from '../../../core/models/opcoes-avaliacao';
import { provideOpcoesAvaliacaoFake } from '../../../../testing/opcoes-avaliacao';
import { OpcoesAvaliacaoResumoComponent } from './opcoes-avaliacao-resumo.component';

describe('OpcoesAvaliacaoResumoComponent', () => {
  let fixture: ComponentFixture<OpcoesAvaliacaoResumoComponent>;
  let el: HTMLElement;

  async function montar(entradas: Record<string, unknown>, falhar = false) {
    await TestBed.configureTestingModule({
      imports: [OpcoesAvaliacaoResumoComponent],
      providers: [falhar ? provideOpcoesAvaliacaoFake(() => throwError(() => new Error('falha'))) : provideOpcoesAvaliacaoFake()]
    }).compileComponents();
    fixture = TestBed.createComponent(OpcoesAvaliacaoResumoComponent);
    fixture.componentRef.setInput('campos', CAMPOS_OPCOES_REAVALIACAO);
    for (const [nome, valor] of Object.entries(entradas)) fixture.componentRef.setInput(nome, valor);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  }

  const registro = {
    regioesDor: ['LOMBAR', 'CEFALEIA_ANTIGA'],
    achadosPosturais: [],
    equilibrioOpcao: 'PRESERVADO',
    testesFuncionais: [{ teste: 'SCHOBER', resultado: 'NEGATIVO' }],
    achadosPosturaisComplemento: 'Ombro mais alto'
  };

  it('lista as opções selecionadas com os rótulos do catálogo', async () => {
    await montar({ registro });
    const itens = Array.from(el.querySelectorAll('.opcoes-item'));
    expect(itens.map(i => i.querySelector('dt')?.textContent?.trim())).toEqual([
      'Regiões de dor/queixa', 'Achados posturais', 'Equilíbrio', 'Testes funcionais'
    ]);
    expect(itens[0].textContent).toContain('Lombar');
    expect(itens[0].textContent).toContain('Cefaleia antiga');
    expect(itens[0].textContent).toContain('(opção antiga)');
    expect(itens[1].querySelector('.opcoes-complemento')?.textContent).toBe('Ombro mais alto');
    expect(itens[3].textContent).toContain('Schober: Negativo');
  });

  it('sem catálogo mostra os valores como gravados', async () => {
    await montar({ registro }, true);
    expect(el.querySelector('.opcoes-item')?.textContent).toContain('LOMBAR');
  });

  it('registro antigo não mostra nada', async () => {
    await montar({ registro: { evolucaoDor: 'Melhorou' } });
    expect(el.querySelector('.opcoes-resumo')).toBeNull();
    expect(el.querySelector('[data-comparativo]')).toBeNull();
  });

  it('mostra o que mudou em relação ao anterior', async () => {
    await montar({
      registro,
      anterior: { regioesDor: ['CERVICAL'], equilibrioOpcao: 'ALTERACAO_LEVE', testesFuncionais: [{ teste: 'SCHOBER', resultado: 'POSITIVO' }] },
      referencia: 'à avaliação inicial de 01/03/2026'
    });
    const comparativo = el.querySelector('[data-comparativo]') as HTMLElement;
    expect(comparativo.querySelector('.opcoes-mudancas-titulo')?.textContent).toContain('em relação à avaliação inicial de 01/03/2026');
    expect(comparativo.querySelector('[data-campo="regioesDor"]')?.textContent)
      .toContain('incluído: Lombar, Cefaleia antiga; removido: Cervical');
    expect(comparativo.querySelector('[data-campo="equilibrioOpcao"]')?.textContent).toContain('de Alteração leve para Preservado');
    expect(comparativo.querySelector('[data-campo="testesFuncionais"]')?.textContent).toContain('Schober: de Positivo para Negativo');
  });

  it('diz quando nada mudou, com a referência genérica', async () => {
    await montar({ registro, anterior: { ...registro } });
    expect(el.querySelector('.opcoes-mudancas-titulo')?.textContent).toContain('ao registro anterior');
    expect(el.querySelector('.opcoes-sem-mudanca')?.textContent).toContain('Nenhuma mudança nas opções.');
  });

  it('acompanha a troca do registro', async () => {
    await montar({ registro });
    fixture.componentRef.setInput('campos', CAMPOS_OPCOES_EXAME_FISICO);
    fixture.componentRef.setInput('registro', { achadosPosturais: ['PE_PLANO'] });
    fixture.detectChanges();
    expect(el.querySelectorAll('.opcoes-item').length).toBe(1);
    expect(el.textContent).toContain('Pé plano');
  });
});
