FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json .npmrc ./
# tsx is a devDependency but is what runs the server, so install everything.
RUN npm ci --no-audit --no-fund --ignore-scripts

COPY server ./server
COPY tsconfig.json tsconfig.server.json ./

# Named volumes inherit this ownership on first use, so the unprivileged user can write uploads.
RUN mkdir -p /data/uploads && chown node:node /data/uploads

USER node
EXPOSE 5000
CMD ["npx", "tsx", "server/index.ts"]
