import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { baixarBlob, extrairNomeArquivo } from './file-download';

describe('file-download utils', () => {
  it('should extract quoted filename from Content-Disposition', () => {
    const nome = extrairNomeArquivo('attachment; filename="relatorio.pdf"', 'fallback.pdf');

    expect(nome).toBe('relatorio.pdf');
  });

  it('should extract UTF-8 filename from Content-Disposition', () => {
    const nome = extrairNomeArquivo(
      "attachment; filename*=UTF-8''relatorio%20pagamento.xlsx",
      'fallback.xlsx'
    );

    expect(nome).toBe('relatorio pagamento.xlsx');
  });

  it('should use fallback filename when header is missing', () => {
    expect(extrairNomeArquivo(null, 'fallback.pdf')).toBe('fallback.pdf');
  });

  it('should create object URL and trigger download for blob response', () => {
    const blob = new Blob(['pdf'], { type: 'application/pdf' });
    const response = new HttpResponse({
      body: blob,
      headers: new HttpHeaders({
        'Content-Disposition': 'attachment; filename="relatorio.pdf"'
      })
    });
    const anchor = document.createElement('a');
    spyOn(document, 'createElement').and.returnValue(anchor);
    spyOn(anchor, 'click');
    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:relatorio');
    spyOn(window.URL, 'revokeObjectURL');

    baixarBlob(response, 'fallback.pdf');

    expect(window.URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(anchor.download).toBe('relatorio.pdf');
    expect(anchor.click).toHaveBeenCalled();
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:relatorio');
  });
});
