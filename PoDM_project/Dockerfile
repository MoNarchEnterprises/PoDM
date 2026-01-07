# Build Stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production Stage
FROM node:18-alpine
WORKDIR /app

# Install runtime dependencies for watermarking (fonts) and video processing (ffmpeg)
RUN apk add --no-cache fontconfig ttf-dejavu ffmpeg
COPY package*.json ./
RUN npm install --production
COPY --from=builder /app/dist ./dist
EXPOSE 5000
CMD ["npm", "start"]
