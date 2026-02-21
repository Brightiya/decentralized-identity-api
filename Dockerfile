# --- Stage 1: Build ---
FROM node:20-slim AS builder
WORKDIR /app

RUN corepack enable # Enabled for building

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

RUN yarn install

COPY . .
# Add this line to force a cache break
RUN echo "Building version 1.0.1"
RUN yarn workspace angular-src build --base-href /

# --- Stage 2: Runner ---
FROM node:20-slim
WORKDIR /app

# 🚀 CRITICAL FIX: Enable Corepack in the final image too!
RUN corepack enable && corepack prepare yarn@4.5.1 --activate # <--- PRE-DOWNLOADS YARN

# 🚀 CRITICAL FIX: Copy Yarn 4 configs so the CMD knows which version to use
COPY --from=builder /app/package.json /app/yarn.lock /app/.yarnrc.yml ./
COPY --from=builder /app/.yarn ./.yarn

COPY --from=builder /app/backend ./backend
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/node_modules ./node_modules

ENV PORT=8080
ENV NODE_ENV=production
EXPOSE 8080

# Now 'yarn' will correctly resolve to 4.5.1
CMD ["yarn", "workspace", "decentralized-identity-backend", "start"]
