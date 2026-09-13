FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY scripts ./scripts
COPY server ./server
COPY dist ./dist
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV PORT=80 CACHE_DIR=/app/.cache
COPY --from=build /app/dist/client ./dist
COPY server ./server
EXPOSE 80
CMD ["node", "server/node.mjs"]
