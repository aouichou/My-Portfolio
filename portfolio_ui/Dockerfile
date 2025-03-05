FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

# Install serve globally to serve static files
RUN npm install -g serve

# Copy the static export output
COPY --from=builder /app/out ./out

# Use Heroku's PORT environment variable
CMD ["sh", "-c", "serve -p $PORT -s out"]