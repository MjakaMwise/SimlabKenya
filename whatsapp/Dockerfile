FROM node:22-slim
WORKDIR /app
# Baileys pulls one dependency straight from git.
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates \
 && rm -rf /var/lib/apt/lists/*
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY server.mjs cli.mjs ./
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "server.mjs"]
