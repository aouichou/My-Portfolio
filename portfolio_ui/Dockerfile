FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/next.config.js ./next.config.js

RUN npm ci --omit=dev

# Modify this to ensure the script is in the right place
RUN printf '#!/bin/sh\nnpm start -- -p $PORT\n' > /app/start.sh && \
    chmod +x /app/start.sh && \
    ls -la /app/start.sh  # Verify the file exists

# Use absolute path to ensure the script is found
CMD ["/app/start.sh"]