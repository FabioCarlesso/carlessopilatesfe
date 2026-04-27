import { HttpResponse } from '@angular/common/http';

export function extrairNomeArquivo(contentDisposition: string | null, fallback: string): string {
  if (!contentDisposition) {
    return fallback;
  }

  const utf8Filename = /filename\*=UTF-8'[^']*'([^;]+)/i.exec(contentDisposition);
  if (utf8Filename?.[1]) {
    try {
      return decodeURIComponent(utf8Filename[1].trim());
    } catch {
      return fallback;
    }
  }

  const filename = /filename="?([^";]+)"?/i.exec(contentDisposition);
  return filename?.[1]?.trim() || fallback;
}

export function baixarBlob(response: HttpResponse<Blob>, fallbackNomeArquivo: string): void {
  if (!response.body) {
    return;
  }

  const nomeArquivo = extrairNomeArquivo(response.headers.get('Content-Disposition'), fallbackNomeArquivo);
  const url = window.URL.createObjectURL(response.body);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = nomeArquivo;
  anchor.click();
  window.URL.revokeObjectURL(url);
}
