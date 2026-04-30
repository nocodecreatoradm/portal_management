# Build stage
FROM node:20-slim AS build

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM node:20-slim
WORKDIR /app
COPY --from=build /app ./

# Install only production dependencies if needed, 
# but since we need tsx to run server.ts, we'll keep all for now 
# or ensure tsx is available.
RUN npm install -g tsx

EXPOSE 3000
ENV NODE_ENV=production

# The server serves the dist folder when NODE_ENV is production
CMD ["tsx", "server.ts"]
