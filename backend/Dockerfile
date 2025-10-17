# Use the official Bun image
FROM oven/bun:alpine

# Set working directory
WORKDIR /app

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S bun -u 1001

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile --production

# Copy source code
COPY . .

# Create data directories
RUN mkdir -p /app/data /app/logs && \
    chown -R bun:nodejs /app/data /app/logs

# Copy initialization script
COPY scripts/init-data.sh /app/init-data.sh
RUN chmod +x /app/init-data.sh

# Build the application
RUN bun run build

# Switch to non-root user
USER bun

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/status || exit 1

# Initialize data and start the application
CMD ["/bin/sh", "-c", "/app/init-data.sh && bun run dist/server.js"]