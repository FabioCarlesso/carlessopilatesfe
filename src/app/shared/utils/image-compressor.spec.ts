import { comprimirImagem } from './image-compressor';

function mockCanvas(blobResultante: Blob | null): HTMLCanvasElement {
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({ drawImage: jasmine.createSpy('drawImage') }),
    toBlob: (callback: (blob: Blob | null) => void) => callback(blobResultante)
  };
  return canvas as unknown as HTMLCanvasElement;
}

function mockBitmap(width: number, height: number): ImageBitmap {
  return { width, height, close: jasmine.createSpy('close') } as unknown as ImageBitmap;
}

describe('comprimirImagem', () => {
  let createElementSpy: jasmine.Spy;

  beforeEach(() => {
    createElementSpy = spyOn(document, 'createElement');
  });

  it('redimensiona o maior lado para a dimensão máxima e exporta como JPEG', async () => {
    const bitmap = mockBitmap(4000, 3000);
    spyOn(window, 'createImageBitmap').and.resolveTo(bitmap);
    const canvas = mockCanvas(new Blob(['fake'], { type: 'image/jpeg' }));
    createElementSpy.and.returnValue(canvas);

    const arquivo = new File(['conteudo'], 'foto-grande.png', { type: 'image/png' });
    const resultado = await comprimirImagem(arquivo, 1080, 0.85);

    expect(canvas.width).toBe(1080);
    expect(canvas.height).toBe(810);
    expect(resultado.type).toBe('image/jpeg');
    expect(resultado.name).toBe('foto-grande.jpg');
    expect(bitmap.close).toHaveBeenCalled();
  });

  it('não amplia imagens menores que a dimensão máxima', async () => {
    const bitmap = mockBitmap(400, 300);
    spyOn(window, 'createImageBitmap').and.resolveTo(bitmap);
    const canvas = mockCanvas(new Blob(['fake'], { type: 'image/jpeg' }));
    createElementSpy.and.returnValue(canvas);

    await comprimirImagem(new File(['x'], 'pequena.jpg', { type: 'image/jpeg' }));

    expect(canvas.width).toBe(400);
    expect(canvas.height).toBe(300);
  });

  it('rejeita quando o canvas não consegue gerar o blob', async () => {
    const bitmap = mockBitmap(100, 100);
    spyOn(window, 'createImageBitmap').and.resolveTo(bitmap);
    const canvas = mockCanvas(null);
    createElementSpy.and.returnValue(canvas);

    await expectAsync(comprimirImagem(new File(['x'], 'a.jpg', { type: 'image/jpeg' }))).toBeRejected();
    expect(bitmap.close).toHaveBeenCalled();
  });
});
