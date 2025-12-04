# portfolio_ui/Dockerfile

FROM node:25-alpine AS builder
WORKDIR /app

# Accept build arguments
ARG NEXT_PUBLIC_API_URL=https://api.aouichou.me/api
ARG NEXT_PUBLIC_MEDIA_URL=https://media.aouichou.me

# Set as environment variables for the build
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_MEDIA_URL=$NEXT_PUBLIC_MEDIA_URL

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:25-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/src/middleware.ts ./src/middleware.ts

RUN npm ci --omit=dev

CMD ["npm", "start"]