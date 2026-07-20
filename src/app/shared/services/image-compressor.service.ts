import { Injectable } from '@angular/core';
import { comprimirImagem } from '../utils/image-compressor';

/** Wrapper injetável de `comprimirImagem` só para permitir mock via `TestBed` nos componentes que a usam. */
@Injectable({
  providedIn: 'root'
})
export class ImageCompressorService {
  comprimir(arquivo: File): Promise<File> {
    return comprimirImagem(arquivo);
  }
}
