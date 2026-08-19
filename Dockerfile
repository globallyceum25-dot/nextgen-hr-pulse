# Build the Vite bundle, then serve the static output with nginx.
#
# The previous version ran `npm start`, which is not a script in package.json,
# so the container exited immediately on boot. It also exposed 3000 while the
# dev server listens on 8080. Port 3000 is kept as the published contract and
# nginx is configured to listen on it.

# ---------- build ----------
FROM node:22-alpine AS build

WORKDIR /app

# Install against the lockfile so image builds are reproducible.
COPY package.json package-lock.json ./
RUN npm ci

# VITE_* values are read at build time and baked into the bundle; .env is
# committed in this repo, so it arrives with the source copy below.
COPY . .
RUN npm run build

# ---------- serve ----------
FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 3000

# nginx:alpine's default entrypoint starts nginx; be explicit about the daemon
# staying in the foreground so the container's lifecycle tracks the server.
CMD ["nginx", "-g", "daemon off;"]
