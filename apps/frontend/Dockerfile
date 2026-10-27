# Base node image
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency specifications
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application source
COPY . .

# Arguments to pass Base Path and API URL during build
ARG NEXT_PUBLIC_BASE_PATH=/health-erp
ENV NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH}
ARG NEXT_PUBLIC_API_URL=/health-erp/api/v1
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Build Next.js application
RUN npm run build

# Runner stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_PUBLIC_BASE_PATH=/health-erp
ENV NEXT_PUBLIC_API_URL=/health-erp/api/v1

# Copy necessary production artifacts from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./next.config.js

EXPOSE 3000

# Start Next.js using dynamic port
CMD ["sh", "-c", "npx next start -p ${PORT:-3000}"]
