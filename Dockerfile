# ---- build the React app ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npx vite build

# ---- serve with Caddy (auto-HTTPS) ----
FROM caddy:2-alpine
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
COPY SIMLAB_Virtual_Chemistry_Lab_Project/dist /srv/virtual-lab
