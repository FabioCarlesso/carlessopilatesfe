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

## Vercel

Em produção a aplicação é hospedada na **Vercel** (`carlessopilatesfe.vercel.app`). Como a Vercel não tem o proxy do Angular CLI nem o Nginx do Docker, o roteamento de API é feito pelo [`vercel.json`](../vercel.json), que replica o comportamento do `proxy.conf.json`:

- Requisições para `/api/*` são reescritas para o backend público no Railway, **removendo o prefixo `/api`** (mesmo efeito do `pathRewrite: { "^/api": "" }` do proxy de dev e do `proxy_pass ${BACKEND_URL}/` do Nginx).
- O destino é a URL pública do Railway (`https://carlessopilatesapi-production.up.railway.app`), acessada via HTTPS na 443 — a porta interna do container (8080) é resolvida pelo próprio Railway e **não** entra na URL.

> Rewrites do `vercel.json` não interpolam variáveis de ambiente, portanto a URL do backend é fixa no arquivo. Se o domínio do Railway mudar, o `vercel.json` precisa ser atualizado e é necessário um novo commit/deploy. Lembre-se de manter a URL da Vercel na variável `CORS_ALLOWED_ORIGINS` do backend.
