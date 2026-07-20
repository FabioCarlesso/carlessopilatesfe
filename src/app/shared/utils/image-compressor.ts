export const DIMENSAO_MAXIMA_PADRAO = 1080;
export const QUALIDADE_JPEG_PADRAO = 0.85;

export async function comprimirImagem(
  arquivo: File,
  dimensaoMaxima = DIMENSAO_MAXIMA_PADRAO,
  qualidade = QUALIDADE_JPEG_PADRAO
): Promise<File> {
  const bitmap = await createImageBitmap(arquivo);

  try {
    const escala = Math.min(1, dimensaoMaxima / Math.max(bitmap.width, bitmap.height));
    const largura = Math.max(1, Math.round(bitmap.width * escala));
    const altura = Math.max(1, Math.round(bitmap.height * escala));

    const canvas = document.createElement('canvas');
    canvas.width = largura;
    canvas.height = altura;

    const contexto = canvas.getContext('2d');
    if (!contexto) {
      throw new Error('Não foi possível processar a imagem.');
    }
    contexto.drawImage(bitmap, 0, 0, largura, altura);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        resultado => (resultado ? resolve(resultado) : reject(new Error('Não foi possível comprimir a imagem.'))),
        'image/jpeg',
        qualidade
      );
    });

    const nome = arquivo.name.replace(/\.[^./\\]+$/, '') + '.jpg';
    return new File([blob], nome, { type: 'image/jpeg' });
  } finally {
    bitmap.close();
  }
}
