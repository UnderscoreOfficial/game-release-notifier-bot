# Game Release Notifier Bot
Track game releases. All inclusive discord bot acts as a full app you can add, search, view and get notified of released games. Currently uses giantbomb api for game data. 
built for sqlite3 only no orm cross db support. I wanted to make a full proper notifer app and the challenge of working within discord.js more limited scope was fun but also I think suited the project better 
as the end goal of this is to be alerted of unreleased games.

This was built with [Discord.js](https://github.com/discordjs/discord.js), [SQLite3](https://www.npmjs.com/package/sqlite3), [Node-Cron](https://github.com/kelektiv/node-cron), [Typescript](https://github.com/microsoft/TypeScript)

## Screenshots

![Home](./assets/notifier-home.png)
![Search](./assets/notifier-search.png)

## Docker
- Build
    1. `git clone https://github.com/UnderscoreOfficial/game-release-notifier-bot.git`
    2. `docker build -t game-release-notifier-bot:1.0 .`
- Load
    1. Download the [latest release](https://github.com/UnderscoreOfficial/game-release-notifier-bot/releases)
    2. `docker load -i <release_name.tar>`

## Docker Compose
- docker compose example:
```
services:
  game-release-notifier-bot:
    image: game-release-notifer-bot:1.0
    container_name: game-release-notifer-bot
    environment:
      - DATABASE_URL=your_database_here
    ports:
      - 4444:3000 # left port number can be changed 
    restart: always
```
- compose file should be .yaml can be named anything.
-`docker compose -f <file_name.yaml> up -d`

