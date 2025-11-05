import { platform } from "os";
import Api from "./api/api.js";
import { Platforms } from "./api/api_types.js";
import GiantBombApi from "./api/giantbomb_api.js";
import IgdbApi from "./api/igdb_api.js";
import Database from "./util/database.js";

async function getArgs(): Promise<void> {
  const args = process.argv;
  const query = args[3] ?? "fable";

  if (args[2] == "giantbomb") {
    const current_platform: Platforms[] = [GiantBombApi.platforms.PC];
    const [valid_games, valid_platforms, valid_platform_ids] =
      await GiantBombApi.search(current_platform, query);

    for (let game of valid_games) {
      const game_platforms = [];
      if (game.platforms) {
        for (let game_platform of game.platforms) {
          game_platforms.push(game_platform.name);
        }
      }
      console.table({
        id: game.id,
        name: game.name,
        description: game.deck,
        release_date: game.original_release_date,
        url: game.site_detail_url,
        image: game.image?.medium_url,
        platforms: game_platforms,
        expected_day: game.expected_release_day,
        expected_month: game.expected_release_month,
        expected_quarter: game.expected_release_quarter,
        expected_year: game.expected_release_year,
        api_type: "giantbomb",
      });
    }
  } else if (args[2] == "test") {
    const server_platforms = await GiantBombApi.getPlatforms(
      "1103728223948374088",
    );
    const [valid_games, valid_platforms, valid_platform_ids] =
      await GiantBombApi.search(server_platforms, "fortnite");

    if (valid_games[0]) {
      const data = GiantBombApi.oldGameReleaseDate(valid_games[0], 94, true);
    }
  } else if (args[2] == "igdb") {
    const igdb_api = new IgdbApi();
    await igdb_api.authenticate();
    const search = await igdb_api.search(query);
    if (!search) return;
    for (let game of search) {
      console.table({
        id: game.id,
        name: game.name,
        release_date: new Date(game.first_release_date * 1000).toUTCString(),
        url: game.url,
        platforms: game.platforms,
        release_dates: game.release_dates,
      });
    }

    // const get_results = false;
    // if (search && get_results) {
    //   const igdb_games = await igdb_api.covers(search);
    //   const current_game = 0;
    //   console.log(igdb_games);
    // if (igdb_games[current_game]) {
    //   await igdb_api.gameReleaseDate(igdb_games[current_game]);
    // }
    //   } else {
    //     console.log(search);
    //   }
    // } else if (args[2] == "date") {
    //   try {
    //     const game_id = Number(args[3]);
    //      Api.gameReleaseDate(game_id, [Api.platforms.PC]);
    // } catch (error) {
    //   console.error("Game id must be a number!");
    //   process.exit(1);
    // }
  } else {
  }
}

getArgs();
