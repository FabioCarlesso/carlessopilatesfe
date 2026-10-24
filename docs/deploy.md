# Deploy

A aplicação roda em container Nginx (Docker) e em produção na Vercel. Em ambos os
casos o roteamento de `/api/*` replica o proxy de desenvolvimento descrito em
[`arquitetura.md`](arquitetura.md).

## Docker

A imagem Docker compila a aplicação Angular e serve os arquivos estáticos com Nginx. O Nginx também redireciona `/api/*` para o backend configurado por `BACKEND_URL`.

```bash
# Backend local em http://localhost:8080
docker compose up --build
```

A aplicação fica disponível em `http://localhost:4200`.

O `HEALTHCHECK` da imagem consulta `http://127.0.0.1/` dentro do container. Não troque por `localhost`: no Alpine ele resolve primeiro para `::1`, o Nginx só escuta em IPv4 e o container ficaria sempre `unhealthy`.

Para apontar para outro backend:

```bash
BACKEND_URL=http://api:8080 docker compose up --build
```

Também é possível construir e executar sem Compose:

```bash
docker build -t carlessopilatesfe .
docker run --rm -p 4200:80 \
  -e BACKEND_URL=http://host.docker.internal:8080 \
  --add-host=host.docker.internal:host-gateway \
  carlessopilatesfe
```

## Cache dos prints da landing

O `location ^~ /landing/` do `nginx/default.conf.template` existe porque as
capturas da landing (`public/landing/*.webp`) são copiadas para o bundle **sem
hash no nome** — o `outputHashing` do Angular alcança só os bundles. Como a URL
é fixa, entregá-las na regra `expires 1y; immutable` prenderia uma captura
substituída no navegador por até um ano, sem revalidação nem com recarga
forçada. Por isso a pasta tem regra própria, de 7 dias com `must-revalidate`,
enquanto `webp` segue na lista imutável para qualquer outro uso com nome
versionado.

Vale lembrar que essa regra só atua no deploy em container: na Vercel quem
serve os estáticos é a própria plataforma, e o `vercel.json` não define cabeçalho
de cache.

## Robôs e indexação

`public/robots.txt` libera apenas a landing pública (`/`) e bloqueia as áreas
autenticadas. É uma lista de negação mantida à mão, espelhando os segmentos de
primeiro nível de `app.routes.ts`: ao criar um segmento novo que exija sessão,
acrescente-o lá. As tags `description` e Open Graph ficam estáticas em
`src/index.html`, porque a aplicação não tem SSR e o serviço `Meta` do Angular
escreve depois do parse, tarde demais para o crawler.

### Card de compartilhamento

Para o link renderizar card com imagem no WhatsApp, no LinkedIn e no Facebook,
três regras valem para as tags Open Graph (issue #246):

- **URL absoluta.** `og:url` e `og:image` levam esquema e host; os crawlers não
  resolvem caminho relativo.
- **JPG ou PNG.** LinkedIn e Facebook não renderizam WebP em pré-visualização. Por
  isso o card usa `public/landing/compartilhamento.jpg`, uma arte dedicada em
  1200×630 (proporção 1,91:1 do `summary_large_image`) montada sobre o print do
  painel, enquanto a galeria da landing segue nos `*.webp`. Ao trocar a arte,
  mantenha as dimensões declaradas em `og:image:width` / `og:image:height` iguais
  às do arquivo.
- **Caminho liberado.** `public/robots.txt` traz `Allow: /landing/` explícito: um
  `Disallow` futuro que alcance a pasta deixa o crawler sem a imagem.

**Host canônico: `software.carlessopilates.com.br`.** É o destino definitivo
decidido na issue #115, e foi preferido ao provisório `carlessopilatesfe.vercel.app`
porque URL de compartilhamento não se troca de graça: links já colados em
conversas e o cache dos crawlers continuariam apontando para o domínio antigo.
O custo é que, **até a #115 entrar**, o card sai com título e descrição, mas sem
imagem — a URL de `og:image` ainda não resolve. Nenhuma mudança de código é
necessária quando o subdomínio subir; basta revalidar:

```bash
curl -s https://software.carlessopilates.com.br/ | grep -oE '<meta property="og:[^"]*" content="[^"]*"'
curl -sI https://software.carlessopilates.com.br/landing/compartilhamento.jpg | grep -iE 'HTTP|content-type'
```

e forçar nova leitura no Facebook Sharing Debugger (*Scrape Again*) e no
LinkedIn Post Inspector. O WhatsApp guarda cache agressivo: use uma query string
diferente para forçar nova busca. Se o host mudar, `og:url` e `og:image` em
`src/index.html` mudam juntos.


## Vercel

Em produção a aplicação é hospedada na **Vercel** (`carlessopilatesfe.vercel.app`). Como a Vercel não tem o proxy do Angular CLI nem o Nginx do Docker, o roteamento de API é feito pelo [`vercel.json`](../vercel.json), que replica o comportamento do `proxy.conf.json`:

- Requisições para `/api/*` são reescritas para o backend público no Railway, **removendo o prefixo `/api`** (mesmo efeito do `pathRewrite: { "^/api": "" }` do proxy de dev e do `proxy_pass ${BACKEND_URL}/` do Nginx).
- O destino é a URL pública do Railway (`https://carlessopilatesapi-production.up.railway.app`), acessada via HTTPS na 443 — a porta interna do container (8080) é resolvida pelo próprio Railway e **não** entra na URL.

> Rewrites do `vercel.json` não interpolam variáveis de ambiente, portanto a URL do backend é fixa no arquivo. Se o domínio do Railway mudar, o `vercel.json` precisa ser atualizado e é necessário um novo commit/deploy. Lembre-se de manter a URL da Vercel na variável `CORS_ALLOWED_ORIGINS` do backend.
