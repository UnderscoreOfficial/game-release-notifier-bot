import * as dotenv from "dotenv";
import {
  ApiGameReleasesResults,
  ApiGameSearchResult,
  GamePlatforms,
  GameRelease,
  GameReleaseDateObject,
  GameSearchResult,
  GiantbombPlatformValues,
  Platforms,
} from "./api_types.js";
import Database from "../util/database.js";
import { url } from "inspector";
import { resourceUsage } from "process";
dotenv.config();

export default class GiantBombApi {
  static readonly #API_KEY = process.env["API_KEY"];

  public static readonly platforms = {
    ALL: 0,
    PC: 94,
    SWITCH: 157,
    XBOX_ONE: 145,
    XBOX_SERIES: 179,
    PS4: 146,
    PS5: 176,
  } as const;

  static async getPlatforms(guild_id: string): Promise<Platforms[]> {
    const sql = "SELECT platforms FROM settings WHERE server_id = ?";
    const select = await Database.get(sql, [guild_id]);
    if (select && select["platforms"]) {
      const platforms = await JSON.parse(select["platforms"]);
      const converted_platforms: Platforms[] = [];
      for (let key of platforms) {
        switch (key) {
          case "PC":
            converted_platforms.push(GiantBombApi.platforms.PC);
            break;
          case "PS4":
            converted_platforms.push(GiantBombApi.platforms.PS4);
            break;
          case "PS5":
            converted_platforms.push(GiantBombApi.platforms.PS5);
            break;
          case "XBOX_ONE":
            converted_platforms.push(GiantBombApi.platforms.XBOX_ONE);
            break;
          case "XBOX_SERIES":
            converted_platforms.push(GiantBombApi.platforms.XBOX_SERIES);
            break;
          case "SWITCH":
            converted_platforms.push(GiantBombApi.platforms.SWITCH);
            break;
          default:
            converted_platforms.push(GiantBombApi.platforms.ALL);
        }
      }
      return converted_platforms;
    }
    const current_platform: Platforms[] = [GiantBombApi.platforms.ALL];
    return current_platform;
  }

  static #urlMakeSearch(query: string): string {
    const sanitized_query = encodeURI(query);
    const url = `https://www.giantbomb.com/api/search/?api_key=${this.#API_KEY}&format=json&resources=game&query=${sanitized_query}`;
    return url;
  }

  static #urlMakeInfo(guid: number): string {
    const url = `https://www.giantbomb.com/api/game/${guid}/?api_key=${this.#API_KEY}&format=json`;
    return url;
  }

  static #urlMakeReleases(id: number, platforms: number[]): string[] {
    // dumb api, can't filter based on multiple platforms
    const base_url = `https://www.giantbomb.com/api/releases/?api_key=${this.#API_KEY}&format=json`;
    const game_filter = `&filter=game:${id}`;
    const field_filter = `&field_list=release,release_date,id,guid,name,platform,region`;
    const urls = [];
    for (let platform of platforms) {
      let url = `${base_url}${game_filter}`;
      if (platform == 0) {
        urls.push(`${url}${field_filter}`);
        break;
      } else {
        urls.push(`${url},platform:${platform}${field_filter}`);
      }
    }
    return urls;
  }

  static async #urlFetch(url: string): Promise<JSON | undefined> {
    const request = await fetch(url);
    if (request.status == 200) {
      const json_data = (await request.json()) as JSON;
      return json_data;
    }
    return undefined;
  }

  public static async getGame(game_id: number): Promise<GameSearchResult> {
    const game_data = (await this.#urlFetch(
      this.#urlMakeInfo(game_id),
    )) as unknown as ApiGameSearchResult;
    return game_data.results;
  }

  public static async gameReleases(
    id: number,
    platforms: number[],
  ): Promise<GameRelease[] | []> {
    const releases_urls = this.#urlMakeReleases(id, platforms);
    const combined_release_results: GameRelease[] = [];
    for (let url of releases_urls) {
      const releases_data = (await this.#urlFetch(
        url,
      )) as unknown as ApiGameReleasesResults;
      combined_release_results.push(...releases_data.results);
    }
    return combined_release_results;
  }

  public static async gameReleaseDate(
    current_game: GameSearchResult,
    selected_platform: number,
  ): Promise<GameReleaseDateObject> {
    // first need to filter out if there is a original or first release date on the game
    //  if there is it must be verified to the selected_platform, the release can be missing
    //  for a valid platform.

    // comparison data if there is a original / first release date
    if (current_game.original_release_date) {
      let date = new Date(current_game.original_release_date);
      const all_platforms = Object.values(GiantBombApi.platforms).slice(1);
      const all_releases = await GiantBombApi.gameReleases(
        current_game.id as number,
        [0],
      );

      let releases_with_same_dates = 0;
      for (let release of all_releases) {
        if (
          release.platform?.id == selected_platform &&
          release.release_date == String(date)
        ) {
          console.log("Valid platform with release date");
          return {
            date: date,
            type: "release",
          };
        } else if (
          release.platform?.id == selected_platform &&
          release.release_date != String(date)
        ) {
          console.log("Valid platform with different release date");
          date = new Date(String(release.release_date));
          return {
            date: date,
            type: "release",
          };
        } else if (
          release.platform?.id != selected_platform &&
          release.release_date == release.release_date
        ) {
          releases_with_same_dates++;
        }
      }

      // this is the most unsure check, there were a few cases of platforms not having releases
      // but a set original / first release date.
      // If all the release platforms are the same & the original / first release date this is also
      // likely the case of a missing platform
      // so just alert user requires manual checking likely due to missing api data
      if (releases_with_same_dates == 0) {
        // not 100% sure on this check but many games will just have a date 0 actual releases added
        console.log(
          "No found releases at all but original release date, likely games release date ",
        );
        return {
          date: date,
          type: "release",
        };
      } else if (releases_with_same_dates == all_releases.length) {
        console.log(
          "No found release platforms but initial release date might be right",
        );
        return {
          date: date,
          type: "missing",
        };
      } else {
        console.log(
          "Release date is likely missing for the specific desired platform",
        );
        return {
          date: date,
          type: "missing",
        };
      }
    }

    // 2 cases, 1st case no release date at all (expected behavior for unconfirmed game dates), 2nd case
    // some games may have missing releases for platforms. Both will use
    // expected release dates as fallback (assuming desired platforms are present).
    const expected_year = current_game.expected_release_year;
    const expected_month = current_game.expected_release_month;
    const expected_day = current_game.expected_release_day;
    if (!expected_year || !expected_month || !expected_day) {
      console.warn("No full expected release date");
      return {
        date: null,
        type: "TBA",
      };
    }
    const expected_date = `${expected_year}-${expected_month}-${expected_day}`;
    const date = new Date(expected_date);
    return {
      date: date,
      type: "expected",
    };
  }

  public static async filterPlatforms(
    platforms: Platforms[],
    search: any,
  ): Promise<[GameSearchResult[], GamePlatforms[][], number[]]> {
    const valid_platform_ids: number[] = [];
    const valid_games: GameSearchResult[] = [];
    const valid_platforms: GamePlatforms[][] = [];

    if (!platforms.includes(GiantBombApi.platforms.ALL)) {
      for (let key of platforms) {
        if (Object.values(giantbomb_platform_values).includes(key)) {
          valid_platform_ids.push(key);
        }
      }

      for (let game of search) {
        const platforms = game["platforms"] as GamePlatforms[];
        if (platforms !== null && platforms.length) {
          for (let game_platform of platforms) {
            if (valid_platform_ids.includes(game_platform["id"])) {
              const filtered_platforms = platforms.filter((item) =>
                valid_platform_ids.includes(item["id"]),
              );
              valid_platforms.push(filtered_platforms);
              valid_games.push(game);
              break;
            }
          }
        }
      }
      return [valid_games, valid_platforms, valid_platform_ids];
    }
    return [valid_games, valid_platforms, valid_platform_ids];
  }

  public static async search(
    platforms: Platforms[],
    query: string,
  ): Promise<[GameSearchResult[], GamePlatforms[][], number[]]> {
    let search_url = this.#urlMakeSearch(query);
    const search_data = (await this.#urlFetch(search_url)) as any;

    const [valid_games, valid_platforms, valid_platform_ids] =
      await this.filterPlatforms(platforms, search_data["results"]);
    return [valid_games, valid_platforms, valid_platform_ids];
  }
}

export const giantbomb_platform_values: GiantbombPlatformValues = {} as const;
Object.assign(giantbomb_platform_values, GiantBombApi.platforms);
