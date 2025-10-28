# Base image (LTS + alpine)
FROM node:20-alpine AS base

# Dependencies stage
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Enable corepack (ensures pnpm version consistency)
RUN corepack enable

# Copy only the lockfile and package manifest
COPY package.json pnpm-lock.yaml* ./

# Install dependencies with pnpm. Corresponding with: RUN npm ci
RUN pnpm install --frozen-lockfile

# Build stage
FROM base AS builder
WORKDIR /app

RUN corepack enable

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm run build
RUN echo "===== LIST build =====" && ls -al dist

# Runner stage (production)
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create system group is named "backend", with GID = 1002
# Create system user is named "nextjs", with UID = 1002,
# This "nextjs" user is belong to "backend" group
RUN addgroup --system --gid 1002 backend \
    && adduser --system --uid 1002 nestjs

# Copy only build output and node_modules needed for production
COPY --from=builder --chown=nestjs:backend /app/dist ./dist
COPY --from=builder --chown=nestjs:backend /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:backend /app/package.json ./package.json

#Switch to user non-root
USER nestjs

EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

# Run NestJS server
CMD ["node", "dist/main.js"]