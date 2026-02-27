FROM node:20-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ src/
COPY mock-services/ mock-services/
RUN npx tsc

# Production image: Compliance Copilot agent only
FROM node:20-slim AS app
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist/src/ dist/src/
EXPOSE 3000
CMD ["node", "dist/src/index.js"]

# Mock services image: Work IQ + Fabric IQ stubs (local dev / demo only)
FROM node:20-slim AS mocks
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist/mock-services/ dist/mock-services/
COPY mock-services/work-iq/policies/ mock-services/work-iq/policies/
COPY mock-services/fabric-iq/dashboard/ mock-services/fabric-iq/dashboard/
