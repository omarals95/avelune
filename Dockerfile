# --- build the web app ---
FROM node:22-slim AS web
WORKDIR /repo
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY server/package.json server/
COPY app/package.json app/
RUN npm ci
COPY packages packages
COPY app app
RUN cd app && CI=1 npx expo export --platform web --output-dir dist

# --- runtime: sync server + static web app ---
FROM node:22-slim
WORKDIR /repo
ENV NODE_ENV=production DB_PATH=/data/cyclo.db WEB_ROOT=/repo/app/dist PORT=8787
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY server/package.json server/
COPY app/package.json app/
RUN npm ci --omit=dev -w @cyclo/server -w @cyclo/core --include-workspace-root=false
COPY packages/core packages/core
COPY server server
COPY --from=web /repo/app/dist app/dist
VOLUME /data
EXPOSE 8787
USER node
WORKDIR /repo/server
CMD ["npx", "tsx", "src/main.ts"]
