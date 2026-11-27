import { HttpErrorResponse } from '@angular/common/http';
import {
  ALTURA_DESENHO,
  LARGURA_DESENHO,
  PontoDor,
  VISTA_CORPORAL_ARQUIVO,
  VistaCorporal
} from '../../core/models/ponto-dor';
import { extrairMensagemErro } from './api-error';

/** Passo das setas ao mover um ponto pelo teclado (fração do desenho); com Shift, o passo largo. */
export const PASSO_TECLADO = 0.01;
export const PASSO_TECLADO_LARGO = 0.05;

/** Caminho do desenho de uma vista numa versão, relativo ao `<base href>` (`public/mapa-corporal/`). */
export function urlDesenho(versao: number, vista: VistaCorporal): string {
  return `mapa-corporal/v${versao}/${VISTA_CORPORAL_ARQUIVO[vista]}.svg`;
}

/** Mantém a coordenada normalizada dentro do desenho e com 4 casas, como o simetrógrafo. */
export function limitarCoordenada(valor: number): number {
  const limitado = Math.min(1, Math.max(0, valor));
  return Math.round(limitado * 10000) / 10000;
}

/** Converte a posição do clique (px de tela) em coordenada normalizada sobre o retângulo do desenho. */
export function coordenadaNormalizada(
  clienteX: number,
  clienteY: number,
  rect: { left: number; top: number; width: number; height: number }
): { x: number; y: number } | null {
  if (rect.width <= 0 || rect.height <= 0) return null;
  return {
    x: limitarCoordenada((clienteX - rect.left) / rect.width),
    y: limitarCoordenada((clienteY - rect.top) / rect.height)
  };
}

/**
 * Raio do ponto em unidades do `viewBox` (240 de largura): cresce com a
 * intensidade, de 6 (0) a 12 (10); sem intensidade informada, o tamanho médio.
 */
export function raioPonto(intensidade: number | null): number {
  return intensidade === null ? 8 : 6 + intensidade * 0.6;
}

/** Diâmetro do ponto em % da largura do desenho — o botão do ponto escala junto com a imagem. */
export function diametroPercentual(intensidade: number | null): number {
  return ((raioPonto(intensidade) * 2) / LARGURA_DESENHO) * 100;
}

export type FaixaIntensidade = 'sem' | 'leve' | 'moderada' | 'intensa';

/** Faixa de intensidade do ponto, que define a opacidade do vermelho (escala 0–10). */
export function faixaIntensidade(intensidade: number | null): FaixaIntensidade {
  if (intensidade === null) return 'sem';
  if (intensidade <= 3) return 'leve';
  if (intensidade <= 6) return 'moderada';
  return 'intensa';
}

/**
 * Região aproximada do ponto, só para a lista textual e o leitor de tela — a
 * posição gravada é a coordenada. É um mapeamento simples por faixas de `y` (e de
 * `x` para ombro, braço, antebraço e mão), sobre o desenho v1 em unidades do
 * `viewBox` 240×520, com o eixo do corpo em x = 120:
 *
 * | y (de 520) | Frente | Costas | Laterais |
 * |---|---|---|---|
 * | < 84 | Cabeça | Cabeça | Cabeça |
 * | 84–100 | Pescoço | Pescoço | Pescoço |
 * | 100–135 | Ombro (\|x−120\| ≥ 24) ou Tórax | Ombro ou Trapézio | Tórax / Região torácica |
 * | 135–205 | Braço (≥ 33) ou Tórax | Braço ou Região torácica | Tórax / Região torácica |
 * | 205–260 | Antebraço (≥ 40) ou Abdome | Antebraço ou Região lombar | Abdome / Região lombar |
 * | 260–296 | Mão (≥ 40) ou Quadril | Mão ou Glúteo | Quadril / Glúteo |
 * | 296–340 | Mão (≥ 40) ou Coxa | Mão ou Coxa | Coxa |
 * | 340–372 | Coxa | Coxa | Coxa |
 * | 372–410 | Joelho | Joelho | Joelho |
 * | 410–462 | Perna | Panturrilha | Perna |
 * | ≥ 462 | Pé | Pé | Pé |
 *
 * Nas vistas de frente e costas o lado vem do `x`: na frente, a metade esquerda da
 * imagem é o lado **direito** do paciente; nas costas, é o esquerdo. A faixa central
 * (\|x−120\| < 8) não tem lado. Nas laterais, o tronco se divide em frente
 * (Tórax/Abdome/Quadril) e trás (Região torácica/lombar/Glúteo) pelo x = 118 (direita)
 * ou 122 (esquerda), porque o braço fica sobre o tronco e não dá para separá-lo pelo `x`.
 * Um desenho novo com o corpo na mesma área (regra do README) mantém as faixas válidas.
 */
export function regiaoAproximada(ponto: Pick<PontoDor, 'vista' | 'x' | 'y'>): string {
  const x = ponto.x * LARGURA_DESENHO;
  const y = ponto.y * ALTURA_DESENHO;
  const dx = x - LARGURA_DESENHO / 2;
  const distancia = Math.abs(dx);
  const lateral = ponto.vista === 'LATERAL_DIREITA' || ponto.vista === 'LATERAL_ESQUERDA';
  const costas = ponto.vista === 'COSTAS';

  if (lateral) {
    const anterior = ponto.vista === 'LATERAL_DIREITA' ? x >= 118 : x <= 122;
    return regiaoPorAltura(y, anterior ? 'frente' : 'costas', true);
  }

  const membro = regiaoMembroSuperior(y, distancia);
  const regiao = membro ?? regiaoPorAltura(y, costas ? 'costas' : 'frente', false);
  if (distancia < 8 && membro === null) return regiao;

  // Frente: a metade esquerda da imagem é o lado direito do paciente (vista de frente para ele).
  const direito = costas ? dx > 0 : dx < 0;
  return `${regiao}, lado ${direito ? 'direito' : 'esquerdo'}`;
}

function regiaoMembroSuperior(y: number, distancia: number): string | null {
  if (y >= 100 && y < 135 && distancia >= 24) return 'Ombro';
  if (y >= 135 && y < 205 && distancia >= 33) return 'Braço';
  if (y >= 205 && y < 260 && distancia >= 40) return 'Antebraço';
  if (y >= 260 && y < 340 && distancia >= 40) return 'Mão';
  return null;
}

function regiaoPorAltura(y: number, face: 'frente' | 'costas', lateral: boolean): string {
  const costas = face === 'costas';
  if (y < 84) return 'Cabeça';
  if (y < 100) return 'Pescoço';
  if (y < 135) return costas ? (lateral ? 'Região torácica' : 'Trapézio') : 'Tórax';
  if (y < 205) return costas ? 'Região torácica' : 'Tórax';
  if (y < 260) return costas ? 'Região lombar' : 'Abdome';
  if (y < 296) return costas ? 'Glúteo' : 'Quadril';
  if (y < 372) return 'Coxa';
  if (y < 410) return 'Joelho';
  if (y < 462) return costas && !lateral ? 'Panturrilha' : 'Perna';
  return 'Pé';
}

/**
 * Mensagem de erro das rotas de pontos de dor: no `400` (limite, coordenada,
 * vista inválida) e no `403` (papel sem acesso) a API explica o motivo no
 * `detail`, e é ele que aparece; nos demais casos, o tratamento padrão.
 */
export function mensagemErroPontosDor(err: unknown, fallback: string): string {
  if (err instanceof HttpErrorResponse && (err.status === 400 || err.status === 403)) {
    const detail = (err.error as { detail?: unknown } | null)?.detail;
    if (typeof detail === 'string' && detail.trim()) return detail.trim();
  }
  return extrairMensagemErro(err, fallback);
}
