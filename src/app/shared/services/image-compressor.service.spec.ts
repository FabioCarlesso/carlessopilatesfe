import { TestBed } from '@angular/core/testing';
import { ImageCompressorService } from './image-compressor.service';

describe('ImageCompressorService', () => {
  let service: ImageCompressorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ImageCompressorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should delegate to comprimirImagem and resolve a JPEG file', async () => {
    const bitmap = { width: 100, height: 100, close: jasmine.createSpy('close') } as unknown as ImageBitmap;
    spyOn(window, 'createImageBitmap').and.resolveTo(bitmap);
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: jasmine.createSpy('drawImage') }),
      toBlob: (callback: (blob: Blob | null) => void) => callback(new Blob(['fake'], { type: 'image/jpeg' }))
    } as unknown as HTMLCanvasElement;
    spyOn(document, 'createElement').and.returnValue(canvas);

    const resultado = await service.comprimir(new File(['x'], 'foto.png', { type: 'image/png' }));

    expect(resultado.type).toBe('image/jpeg');
  });
});
