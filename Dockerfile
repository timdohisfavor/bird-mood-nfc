# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS build
WORKDIR /app
ENV MAGICK_BIN=/usr/bin/convert

RUN apt-get update \
  && apt-get install -y --no-install-recommends imagemagick \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS frontend
ENV BACKEND_URL=http://backend:3000
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
EXPOSE 80

FROM node:20-bookworm-slim AS backend
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm install --omit=dev

COPY backend ./backend
COPY --from=build /app/assets/meta ./assets/meta

EXPOSE 3000
CMD ["node", "backend/server.mjs"]
