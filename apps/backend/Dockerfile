# Base node image
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency specifications
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (including devDependencies needed for build)
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy source files
COPY . .

# Build NestJS application
RUN npm run build

# Prune dev dependencies for production
RUN npm prune --production

# Production Runner stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Copy node modules and built assets
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

EXPOSE 4000

# Start production server
CMD ["node", "dist/src/main.js"]
