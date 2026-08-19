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


## Vercel

Em produção a aplicação é hospedada na **Vercel** (`carlessopilatesfe.vercel.app`). Como a Vercel não tem o proxy do Angular CLI nem o Nginx do Docker, o roteamento de API é feito pelo [`vercel.json`](../vercel.json), que replica o comportamento do `proxy.conf.json`:

- Requisições para `/api/*` são reescritas para o backend público no Railway, **removendo o prefixo `/api`** (mesmo efeito do `pathRewrite: { "^/api": "" }` do proxy de dev e do `proxy_pass ${BACKEND_URL}/` do Nginx).
- O destino é a URL pública do Railway (`https://carlessopilatesapi-production.up.railway.app`), acessada via HTTPS na 443 — a porta interna do container (8080) é resolvida pelo próprio Railway e **não** entra na URL.

> Rewrites do `vercel.json` não interpolam variáveis de ambiente, portanto a URL do backend é fixa no arquivo. Se o domínio do Railway mudar, o `vercel.json` precisa ser atualizado e é necessário um novo commit/deploy. Lembre-se de manter a URL da Vercel na variável `CORS_ALLOWED_ORIGINS` do backend.
