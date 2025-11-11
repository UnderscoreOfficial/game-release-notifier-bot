// Probaly should have a more universal file name since will be doing notifying updating etc alerts.
//
// 1. check added games to see if release date updated and if so update the release dates locally.
//  - if unable to get release date have an alert so the user can manually intervene.
// 2. check if the current saved release date is greater than or equal to the current date meaning the game is out.
//  - games should also have changes counting down to the release cycle these wont be notified but if a user checks the game or all the saved games

import { ChannelType, Client, EmbedBuilder } from "discord.js";
import { GameDatabaseObj, SettingsDatabaseObj } from "../api/api_types.js";
import GiantBombApi from "../api/giantbomb_api.js";
import Page from "../discord/page.js";
import Database from "./database.js";
import Utils from "./util.js";

//
export default class Scheduler {
  // updates all unreleased games dates
  static async updater() {
    const games = (await Database.all(
      `SELECT * FROM games WHERE released_status = ? AND api_type = ?`,
      [false, "giantbomb"],
    )) as GameDatabaseObj[];
    let game_count = 0;
    for (let game of games) {
      const live_game = await GiantBombApi.getGame(game.id);
      const game_release_date = await GiantBombApi.gameReleaseDate(
        live_game,
        game.platform,
      );
      await Database.game(
        game.server_id,
        game.game_id,
        game.api_type,
        game.name,
        live_game.deck || "",
        live_game.site_detail_url || "giantbomb.com",
        live_game.image?.medium_url || Page.alt_picture,
        game.platform,
        game_release_date.date,
        game.released_status,
      );
      game_count++;
      await Utils.sleep(1000);
    }
    console.log(`Updater ran updated (${game_count}) games.`);
  }

  static async #gameReleasedMessage(client: Client, game: GameDatabaseObj) {
    const settings = (await Database.get(
      "SELECT * FROM settings WHERE server_id = ?",
      [game.server_id],
    )) as SettingsDatabaseObj;

    if (settings.channel_id) {
      const channel = await client.channels.fetch(settings.channel_id);

      if (channel?.type == ChannelType.GuildText) {
        const embed = new EmbedBuilder()
          .setColor(0x9275a4)
          .setTitle(`${game.name} - Released! :partying_face: :tada:`)
          .setURL(game.detail_url)
          .setImage(game.image_url)
          .setDescription(game.description)
          .addFields({
            name: "Game Released! :partying_face: :tada:",
            value: `${game.release_date}`,
          });
        channel.send({ embeds: [embed] });
      }
    }
  }

  // notifies all released games
  static async notifier(client: Client) {
    const games = (await Database.all(
      `SELECT * FROM games WHERE released_status = ? AND api_type = ?`,
      [false, "giantbomb"],
    )) as GameDatabaseObj[];
    let game_count = 0;
    const current_date = new Date();
    for (let game of games) {
      const game_date = new Date(game.release_date);
      if (game_date < current_date) {
        await Database.game(
          game.server_id,
          game.game_id,
          game.api_type,
          game.name,
          game.description,
          game.detail_url,
          game.image_url,
          game.platform,
          game.release_date,
          true,
        );
        await this.#gameReleasedMessage(client, game);
        game_count++;
      }
    }
    console.log(`Notifier ran (${game_count}) games released.`);
  }
}
