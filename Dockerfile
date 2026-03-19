# --- Stage 1: Build ---
FROM node:20-slim AS builder
# Use Node.js 20 slim image for building stage

WORKDIR /app
# Set working directory inside container

RUN corepack enable # Enabled for building
# Enables Corepack to manage package managers like Yarn

COPY package.json yarn.lock .yarnrc.yml ./
# Copy root package configuration files

COPY .yarn ./.yarn
# Copy Yarn 4 (Berry) configuration and plugins

COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
# Copy workspace package.json files for dependency resolution

RUN yarn install
# Install all dependencies for monorepo

COPY . .
# Copy full project source into container

RUN echo "Building version 1.0.1"
# Dummy command to invalidate Docker cache when needed

RUN yarn workspace angular-src build --base-href /
# Build Angular frontend (production build)

# --- Stage 2: Runner ---
FROM node:20-slim
# Use lightweight Node.js image for runtime

WORKDIR /app
# Set working directory


RUN corepack enable && corepack prepare yarn@4.5.1 --activate # <--- PRE-DOWNLOADS YARN
# Ensures correct Yarn version is available in runtime image


COPY --from=builder /app/package.json /app/yarn.lock /app/.yarnrc.yml ./
COPY --from=builder /app/.yarn ./.yarn
# Copy Yarn configuration from builder stage

COPY --from=builder /app/backend ./backend
# Copy backend source code

COPY --from=builder /app/frontend/dist ./frontend/dist
# Copy built frontend assets

COPY --from=builder /app/node_modules ./node_modules
# Copy installed dependencies

ENV PORT=8080
# Set application port

ENV NODE_ENV=production
# Set environment to production

EXPOSE 8080
# Expose port for container runtime

CMD ["yarn", "workspace", "decentralized-identity-backend", "start"]
# Start backend using Yarn workspace command