"""Mapa corporal v2: figura humana em posição anatômica (frente, costas, laterais), desenho original.

O corpo é montado por partes (membros com largura variável). Cada grupo é desenhado em duas passadas
(contorno grosso e depois preenchimento), para que só o contorno externo apareça, sem emendas.
"""

import math
import sys

W, H = 240, 520
CX = 120


def suavizar(pts, fechado=True, tensao=0.55):
    n = len(pts)
    if fechado:
        p = [pts[-1]] + pts + [pts[0], pts[1]]
        segs = n
    else:
        p = [pts[0]] + pts + [pts[-1]]
        segs = n - 1
    d = f"M{p[1][0]:.1f},{p[1][1]:.1f}"
    for i in range(1, segs + 1):
        p0, p1, p2, p3 = p[i - 1], p[i], p[i + 1], p[i + 2]
        c1 = (p1[0] + (p2[0] - p0[0]) * tensao / 3, p1[1] + (p2[1] - p0[1]) * tensao / 3)
        c2 = (p2[0] - (p3[0] - p1[0]) * tensao / 3, p2[1] - (p3[1] - p1[1]) * tensao / 3)
        d += f" C{c1[0]:.1f},{c1[1]:.1f} {c2[0]:.1f},{c2[1]:.1f} {p2[0]:.1f},{p2[1]:.1f}"
    return d + (" Z" if fechado else "")


def membro(eixo, tampa=True):
    """eixo: [(x, y, largura_esq, largura_dir)] ou [(x, y, largura)] -> contorno fechado.

    A largura é aplicada na normal do eixo (lado esquerdo/direito do sentido de percurso).
    """
    esq, dir_ = [], []
    for i, ponto in enumerate(eixo):
        x, y = ponto[0], ponto[1]
        we, wd = (ponto[2], ponto[2]) if len(ponto) == 3 else (ponto[2], ponto[3])
        a = eixo[max(i - 1, 0)]
        b = eixo[min(i + 1, len(eixo) - 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        n = math.hypot(dx, dy) or 1
        nx, ny = -dy / n, dx / n
        esq.append((x + nx * we / 2, y + ny * we / 2))
        dir_.append((x - nx * wd / 2, y - ny * wd / 2))
    return esq + list(reversed(dir_))


def espelhar(pts):
    return [(2 * CX - x, y) for (x, y) in pts]


def girar(pts, ox, oy, graus):
    r = math.radians(graus)
    c, s = math.cos(r), math.sin(r)
    return [(ox + (x - ox) * c - (y - oy) * s, oy + (x - ox) * s + (y - oy) * c) for (x, y) in pts]


def mao_frontal(px, py, angulo, lado):
    """Mão aberta com a palma para a frente, punho em (px, py), dedos apontando para baixo (girada por `angulo`).

    lado = +1 (mão à direita da imagem: polegar para fora, à direita) ou -1 (espelho).
    """
    s = lado
    partes = []
    palma = [(px - 9 * s, py), (px + 9 * s, py), (px + 11 * s, py + 14), (px + 10 * s, py + 26),
             (px - 9 * s, py + 27), (px - 11 * s, py + 14)]
    partes.append(palma)
    # dedos: (base_x, comprimento, largura, inclinação)
    for bx, comp, larg, inc in [(-7.5, 22, 5.2, -4), (-2.5, 26, 5.4, -1), (2.5, 25, 5.4, 1), (7.2, 20, 4.8, 4)]:
        x0 = px + bx * s
        y0 = py + 24
        x1 = x0 + inc * s * 0.6
        partes.append(membro([(x0, y0, larg), (x0 + (x1 - x0) * 0.5, y0 + comp * 0.5, larg * 0.95),
                              (x1, y0 + comp, larg * 0.8)]))
    # polegar: sai da lateral da palma para fora e para baixo
    partes.append(membro([(px + 10 * s, py + 8, 7), (px + 16 * s, py + 18, 6), (px + 19 * s, py + 30, 5)]))
    return [girar(p, px, py, angulo * s) for p in partes]


def cabeca_frontal():
    meia = [(CX, 18), (132, 21), (139, 31), (141, 45), (140, 58), (137, 68), (131, 76), (123, 81), (CX, 83)]
    return espelhar(list(reversed(meia[1:-1]))) + meia


def cabelo_frontal():
    meia = [(CX, 14), (134, 17), (142, 29), (143, 42), (140, 41), (137, 33), (129, 28), (CX, 27)]
    return espelhar(list(reversed(meia[1:-1]))) + meia


def orelha(x, lado):
    return membro([(x, 44, 7), (x + 1.5 * lado, 52, 7.5), (x, 60, 5)])


def tronco_frontal():
    meia = [
        (CX, 84), (128, 86), (131, 94), (146, 99), (160, 105),   # pescoço, trapézio, ombro
        (164, 116), (160, 132),                                  # deltoide
        (152, 140), (151, 160), (149, 182),                      # lateral do tórax
        (143, 204), (142, 218),                                  # cintura
        (147, 236), (156, 256), (156, 270),                      # quadril (até a coxa)
        (140, 286), (128, 292), (CX, 294),                       # virilha
    ]
    return espelhar(list(reversed(meia[1:-1]))) + meia


def braco_dir():
    """Braço direito da imagem (ombro -> punho), abduzido ~15°."""
    sup = membro([(152, 112, 30), (158, 140, 27), (164, 170, 23), (170, 198, 19)])
    ant = membro([(170, 196, 20), (175, 214, 21), (181, 238, 18), (187, 262, 14), (191, 280, 12)])
    return [sup, ant], (192, 279)


def perna_dir():
    coxa = membro([(139, 270, 38), (139, 300, 35), (137, 330, 30), (135, 358, 24), (134, 378, 22)])
    perna = membro([(134, 376, 22), (135.5, 398, 25), (134.5, 420, 20), (133, 446, 13), (133, 466, 12)])
    pe = [(127, 462), (139, 462), (143, 474), (146, 486), (139, 491), (127, 491), (124, 478)]
    return [coxa, perna, pe]


def grupo_silhueta(formas, classe="silhueta"):
    paths = "".join(f'<path d="{suavizar(f)}"/>' for f in formas)
    return f'<g class="{classe}-contorno">{paths}</g><g class="{classe}-preench">{paths}</g>'


def linhas(lista, espelho=False):
    out = []
    for ln in lista:
        pts = espelhar(ln) if espelho else ln
        out.append(f'<path d="{suavizar(pts, fechado=False)}"/>')
    return "".join(out)


def figura_frontal(costas=False):
    formas = [cabeca_frontal(), membro([(CX, 66, 26), (CX, 80, 27), (CX, 92, 31), (CX, 100, 40)])]
    formas += [orelha(141, 1), espelhar(orelha(141, 1))]
    formas.append(tronco_frontal())
    braco, (wx, wy) = braco_dir()
    formas += braco + [espelhar(b) for b in braco]
    mao = mao_frontal(wx, wy - 2, -14, 1)
    formas += mao + [espelhar(m) for m in mao]
    perna = perna_dir()
    formas += perna + [espelhar(p) for p in perna]

    corpo = grupo_silhueta(formas)
    if costas:
        cabelo = [(CX, 15)] + [(CX + 23 * math.sin(t / 10 * math.pi), 15 + 52 * (1 - math.cos(t / 10 * math.pi)) / 2)
                               for t in range(1, 10)] + [(CX, 70)]
        cab = suavizar([(98, 30), (104, 17), (CX, 14), (136, 17), (142, 32), (141, 52), (135, 64), (CX, 70), (105, 64), (99, 52)])
        detalhe = linhas([
            [(CX, 96), (CX, 120), (CX, 160), (CX, 200), (CX, 228)],              # coluna
            [(131, 94), (146, 104), (158, 110)], [(109, 94), (94, 104), (82, 110)],  # trapézio
            [(128, 118), (138, 128), (140, 146), (130, 156)],                     # escápula dir
            [(112, 118), (102, 128), (100, 146), (110, 156)],                     # escápula esq
            [(146, 172), (138, 192), (130, 206)], [(94, 172), (102, 192), (110, 206)],   # dorsais
            [(CX, 246), (CX, 292)],                                               # sulco interglúteo
            [(154, 272), (140, 288), (124, 290)], [(86, 272), (100, 288), (116, 290)],  # prega glútea
            [(129, 368), (135, 372), (141, 368)], [(111, 368), (105, 372), (99, 368)],  # fossa poplítea
            [(135, 392), (134, 412)], [(105, 392), (106, 412)],                   # panturrilha
            [(171, 198), (174, 206)], [(69, 198), (66, 206)],                     # cotovelos
        ])
        cabelo_svg = f'<path class="cabelo" d="{cab}"/>'
    else:
        detalhe = linhas([
            [(112, 96), (120, 100), (128, 96)],                                   # incisura do pescoço
            [(122, 99), (134, 99), (150, 104)], [(118, 99), (106, 99), (90, 104)],   # clavículas
            [(CX, 104), (CX, 140)],                                               # esterno
            [(146, 118), (138, 138), (124, 142), (CX, 140)],                      # peitoral dir
            [(94, 118), (102, 138), (116, 142), (CX, 140)],                       # peitoral esq
            [(CX, 150), (CX, 210)],                                               # linha alba
            [(146, 226), (136, 254), (126, 274)], [(94, 226), (104, 254), (114, 274)],  # linhas inguinais
            [(160, 116), (156, 132), (152, 140)], [(80, 116), (84, 132), (88, 140)],  # deltoides
            [(169, 198), (173, 204)], [(71, 198), (67, 204)],                     # dobra do cotovelo
            [(130, 360), (135, 354), (140, 360), (135, 368), (130, 360)],         # patela dir
            [(110, 360), (105, 354), (100, 360), (105, 368), (110, 360)],         # patela esq
            [(132, 396), (131, 440)], [(108, 396), (109, 440)],                   # tíbias
        ])
        detalhe += f'<circle cx="{CX}" cy="210" r="1.6" class="umbigo"/>'
        cab = suavizar(cabelo_frontal())
        cabelo_svg = f'<path class="cabelo" d="{cab}"/>'
    return corpo + cabelo_svg + f'<g class="detalhe">{detalhe}</g>'


def figura_lateral():
    """Perfil voltado para a direita da imagem."""
    cabeca = [(98, 40), (104, 24), (118, 16), (134, 20), (142, 32), (145, 44), (150, 54),   # testa e nariz
              (146, 58), (146, 64), (144, 70), (140, 78), (132, 82), (124, 82),               # boca e queixo
              (118, 80), (108, 72), (100, 60)]
    cabelo = suavizar([(97, 46), (99, 28), (110, 16), (126, 13), (140, 20), (142, 30), (132, 26),
                       (120, 27), (112, 36), (108, 52), (100, 58)])
    pescoco = membro([(113, 62, 26), (116, 80, 25), (117, 100, 30)])
    tronco = [
        (106, 92), (96, 104), (90, 124), (90, 146), (94, 170),          # nuca e dorsal (escápula)
        (98, 196), (98, 216), (92, 238), (84, 258), (84, 278), (94, 294),  # lordose lombar e glúteo
        (130, 294), (138, 276), (140, 254), (142, 232), (146, 208),      # pelve e abdome
        (150, 182), (152, 156), (150, 132), (142, 112), (132, 100),      # tórax e peito
    ]
    coxa = membro([(112, 284, 46), (115, 312, 40), (118, 340, 32), (120, 368, 26)])
    perna = membro([(120, 366, 26, 28), (118, 392, 26, 34), (118, 420, 22, 26), (120, 446, 16, 18),
                    (121, 466, 15, 16)])
    pe = [(112, 460), (128, 462), (138, 474), (154, 480), (156, 488), (114, 490), (108, 482)]
    corpo = grupo_silhueta([cabeca, pescoco, tronco, coxa, perna, pe])

    orelha_lat = suavizar([(112, 46), (118, 44), (121, 52), (118, 62), (113, 62), (111, 54)])
    braco = [membro([(118, 104, 24), (118, 136, 21), (118, 168, 19), (118, 196, 16)]),
             membro([(118, 194, 17), (120, 222, 17), (122, 252, 12.5), (123, 272, 11)]),
             membro([(123, 270, 12), (125, 288, 14), (125, 306, 11), (123, 318, 7)])]
    braco_svg = grupo_silhueta(braco, "braco")
    detalhe = linhas([
        [(145, 62), (141, 63)],                                     # boca
        [(141, 46), (137, 48)],                                     # olho
        [(108, 84), (112, 96)],                                     # nuca/trapézio
        [(119, 198), (121, 206)],                                   # cotovelo
        [(126, 352), (128, 366), (126, 378)],                       # patela
        [(100, 250), (106, 270), (104, 286)],                       # glúteo
    ])
    return (corpo + f'<path class="cabelo" d="{cabelo}"/>' + f'<path class="orelha" d="{orelha_lat}"/>'
            + braco_svg + f'<g class="detalhe">{detalhe}</g>')


ESTILO = """
    .silhueta-contorno path, .braco-contorno path { fill: none; stroke: #6b7280; stroke-width: 4; stroke-linejoin: round; }
    .silhueta-preench path, .braco-preench path { fill: #f3f1ee; stroke: none; }
    .cabelo { fill: #9aa0aa; stroke: #6b7280; stroke-width: 1.5; }
    .orelha { fill: #f3f1ee; stroke: #9ca3af; stroke-width: 1.2; }
    .detalhe path { fill: none; stroke: #a8adb5; stroke-width: 1.2; stroke-linecap: round; }
    .umbigo { fill: #a8adb5; }
"""


def svg_vista(titulo, conteudo, transform=""):
    """Uma vista por arquivo. O viewBox 0 0 240 520 é o sistema de coordenadas dos pontos de dor."""
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" aria-label="{titulo}">
  <!-- Mapa corporal v1 (desenho original do projeto). Coordenadas dos pontos: x/W e y/H, de 0 a 1. -->
  <title>{titulo}</title>
  <style>{ESTILO}</style>
  <g transform="{transform}">{conteudo}</g>
</svg>
"""


def main(pasta):
    import os
    os.makedirs(pasta, exist_ok=True)
    frente = figura_frontal(costas=False)
    costas = figura_frontal(costas=True)
    lateral = figura_lateral()
    vistas = {
        "frente": ("Corpo humano, vista de frente", frente, ""),
        "costas": ("Corpo humano, vista de costas", costas, ""),
        "lateral-direita": ("Corpo humano, vista lateral direita", lateral, ""),
        "lateral-esquerda": ("Corpo humano, vista lateral esquerda", lateral, f"translate({W},0) scale(-1,1)"),
    }
    for nome, (titulo, conteudo, tr) in vistas.items():
        open(os.path.join(pasta, f"{nome}.svg"), "w", encoding="utf-8").write(svg_vista(titulo, conteudo, tr))
    # prévia com as quatro vistas lado a lado (só para documentação)
    rotulos = ["Frente", "Costas", "Lateral direita", "Lateral esquerda"]
    grupos = "".join(
        f'<g transform="translate({W * k},0)"><g transform="{v[2]}">{v[1]}</g></g>'
        f'<text x="{W * k + W / 2}" y="{H + 16}">{rotulos[k]}</text>'
        for k, v in enumerate(vistas.values()))
    previa = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W * 4} {H + 28}">
  <style>{ESTILO} text {{ font: 14px sans-serif; fill: #374151; text-anchor: middle; }}</style>
  <rect width="100%" height="100%" fill="#ffffff"/>{grupos}
</svg>
"""
    open(os.path.join(pasta, "previa.svg"), "w", encoding="utf-8").write(previa)
    print("gravado em", pasta, sorted(os.listdir(pasta)))


if __name__ == "__main__":
    main(sys.argv[1])
