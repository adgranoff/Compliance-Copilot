FROM node:20-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ src/
COPY mock-services/ mock-services/
RUN npx tsc

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist/ dist/
COPY mock-services/work-iq/policies/ mock-services/work-iq/policies/
COPY mock-services/fabric-iq/dashboard/ mock-services/fabric-iq/dashboard/
EXPOSE 3000
CMD ["node", "dist/src/index.js"]
