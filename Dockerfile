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

# Production image, copy all the files and run
FROM base AS runner
WORKDIR /app

ARG IMAGE_USER=node
ARG IMAGE_GROUP=node
ARG IMAGE_USER_GROUP=$IMAGE_USER:$IMAGE_GROUP

COPY --from=builder --chown=$IMAGE_USER_GROUP /app/dist ./dist
COPY --from=builder --chown=$IMAGE_USER_GROUP /app/node_modules ./node_modules/
COPY --from=builder --chown=$IMAGE_USER_GROUP /app/package.json ./

RUN mkdir database && chown $IMAGE_USER database

ENV DATABASE_PATH=database/sqlite3.db

USER $IMAGE_USER

CMD ["node", "dist/discord/bot.js"]
