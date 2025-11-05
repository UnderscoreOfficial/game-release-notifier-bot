//## Unused Api keeping incase of addition of igdb api ##

import * as dotenv from "dotenv";
import IgdbApi from "./igdb_api.js";
import GiantBombApi from "./giantbomb_api.js";
import Database from "../util/database.js";
import { Platforms } from "./api_types.js";
dotenv.config();

export default class Api {
  public guild_id;
  public platforms: Platforms[];
  #igdb;

  constructor(
    guild_id: string,
    platforms: Platforms[] = [GiantBombApi.platforms.ALL],
  ) {
    this.#igdb = new IgdbApi();
    this.guild_id = guild_id;
    this.platforms = platforms;
  }

  // use Api.new(); instead of new Api();
  // I think this is depreciated or does not work not sure but was never implimented
  static async new(guild_id: string): Promise<Api | void> {
    // const platforms = await Api.getPlatforms(guild_id);
    // if (platforms) {
    //   return new Api(guild_id, platforms);
    // } else {
    //   console.error(
    //     "Failed to get platforms from database, cannot create new Api instance.",
    //   );
    // }
  }

  // agrigation of igdb and giantbomb searches
  public async search(query: string): Promise<void> {
    await this.#igdb.authenticate();
    if (this.platforms === undefined) {
      console.error("Api has no platforms");
      return;
    }
    GiantBombApi.search(this.platforms, query);

    let [giantbomb_search, igdb_search] = await Promise.all([
      GiantBombApi.search(this.platforms, query),
      this.#igdb.search(query),
    ]);
    const [giantbomb_games, valid_platforms, valid_platform_ids] =
      giantbomb_search;

    if (igdb_search && giantbomb_games) {
      for (let giantbomb_game of giantbomb_games) {
        igdb_search = igdb_search.filter(
          (game) => game.name?.trim() != giantbomb_game.name?.trim(),
        );
      }
      const games = [];
      for (let game of giantbomb_games) {
        games.push({ ...game, type: "giantbomb" });
      }
      for (let game of igdb_search) {
        games.push({ ...game, type: "igdb" });
      }
      const sorted_games = games.sort((a, b) => {
        const name_a = a.name ? a.name.toLowerCase() : "";
        const name_b = b.name ? b.name.toLowerCase() : "";
        const index_a = name_a.indexOf(query);
        const index_b = name_b.indexOf(query);
        // Sort by the presence of the search term and then alphabetically
        return (
          (index_a !== -1 ? index_a : Infinity) -
            (index_b !== -1 ? index_b : Infinity) ||
          name_a.localeCompare(name_b)
        );
      });

      for (let game of sorted_games) {
        console.table(game);
      }
      console.log(`${games.length} Games`);
    }
  }
}
