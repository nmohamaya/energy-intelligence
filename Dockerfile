# =============================================================================
# Energy Intelligence — Main Application (Node.js)
# Multi-stage build: build frontend + bundle backend → slim production image
# =============================================================================

# --- Stage 1: Build ---
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy source and build
COPY . .
RUN npm run build

# --- Stage 2: Production ---
FROM node:20-alpine AS production

WORKDIR /app

# Security: run as non-root
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Copy only production artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Install production dependencies only
RUN npm ci --omit=dev --ignore-scripts && \
    npm cache clean --force

# Switch to non-root user
USER appuser

# Expose the application port
EXPOSE 5000

# Health check for Kubernetes readiness/liveness probes
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/dashboard || exit 1

# Start the production server
ENV NODE_ENV=production
CMD ["node", "dist/index.cjs"]
