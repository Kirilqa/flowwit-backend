# ---- Build stage ----
FROM node:22-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Runtime stage ----
# Playwright browser tools need real Chromium + its OS deps at runtime, so the
# runtime image is Microsoft's official Playwright image (Node + browsers preinstalled)
# rather than a plain/alpine Node image.
FROM mcr.microsoft.com/playwright:v1.62.1-jammy AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/index.js"]
