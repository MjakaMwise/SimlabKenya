FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
# tsx is a devDependency but is what runs the server, so install everything.
RUN npm ci --no-audit --no-fund --ignore-scripts

COPY server ./server
COPY tsconfig.json tsconfig.server.json ./

USER node
EXPOSE 5000
CMD ["npx", "tsx", "server/index.ts"]
