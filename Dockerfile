FROM node:lts-alpine AS base

# Install dependencies only when needed
FROM base AS deps

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install  

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx tsc  
RUN npm prune --omit=dev

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

RUN adduser --system --uid 1001 discordbot
RUN mkdir database && chown -R discordbot:node database

COPY --from=builder --chown=discordbot:node /app/dist ./dist
COPY --from=builder --chown=discordbot:node /app/node_modules ./node_modules/
COPY --from=builder --chown=discordbot:node /app/package.json ./

USER discordbot

CMD ["node", "dist/discord/bot.js"]
