FROM node:22-alpine3.24 AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.28-alpine3.21

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/carlessopilatesfe/browser /usr/share/nginx/html

EXPOSE 80

# 127.0.0.1, e não localhost: no Alpine o localhost resolve primeiro para ::1, e o
# nginx só escuta em IPv4 (`listen 80`), então o healthcheck falhava sempre.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ || exit 1

