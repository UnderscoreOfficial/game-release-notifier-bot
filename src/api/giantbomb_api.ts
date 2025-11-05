import * as dotenv from "dotenv";
import {
  ApiGameReleasesResults,
  GamePlatforms,
  GameRelease,
  GameReleaseDateObject,
  GameSearchResult,
  GiantbombPlatformValues,
  Platforms,
} from "./api_types.js";
import Database from "../util/database.js";
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

  static #urlMakeInfo(guid: string): string {
    const url = `https://www.giantbomb.com/api/game/${guid}/?api_key=${this.#API_KEY}&format=json`;
    return url;
  }

  static #urlMakeReleases(id: number, platform: string): string {
    const base_url = `https://www.giantbomb.com/api/releases/?api_key=${this.#API_KEY}&format=json`;
    const filters = `&filter=game:${id},platform:${platform}&field_list=release,release_date,id,guid,name,platform,region`;
    const url = `${base_url}${filters}`;
    return url;
  }

  static async #urlFetch(url: string): Promise<JSON | undefined> {
    const request = await fetch(url);
    if (request.status == 200) {
      const json_data = (await request.json()) as JSON;
      return json_data;
    }
    return undefined;
  }

  public static async gameReleases(
    id: number,
    platform: number[],
  ): Promise<GameRelease[] | []> {
    const releases_url = this.#urlMakeReleases(id, platform.join(","));
    const releases_data = (await this.#urlFetch(
      releases_url,
    )) as unknown as ApiGameReleasesResults;
    return releases_data["results"];
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
      const date = new Date(current_game.original_release_date);
      const all_platforms = Object.values(GiantBombApi.platforms).slice(1);
      const all_releases = await GiantBombApi.gameReleases(
        current_game.id as number,
        all_platforms,
      );

      let releases_with_same_dates = 0;
      for (let release of all_releases) {
        if (
          release.platform?.id == selected_platform &&
          release.release_date == release.release_date
        ) {
          console.log("Valid platform with release date");
          return {
            date: date,
            type: "release",
          };
        } else if (
          release.platform?.id == selected_platform &&
          release.release_date != release.release_date
        ) {
          console.log("Valid platform with different release date");
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
      if (releases_with_same_dates == all_releases.length) {
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

  // this needs to be fully rebuilt all the logic should happen within gameReleaseDate none within .page
  // page then can take the retuned date and do formating or whatever
  public static async oldGameReleaseDate(
    current_game: GameSearchResult,
    platform: number,
    has_release: boolean,
    game_release: GameRelease | undefined = undefined,
  ): Promise<GameReleaseDateObject> {
    // When using the first or original date on a game object it needs to be verified further as its possible
    // to get a false date not belonging to a platform you have selected due to api not having perfect data
    async function verifyPlatforms(): Promise<GameReleaseDateObject> {
      if (!current_game.original_release_date || !game_release) {
        return {
          date: null,
          type: "error",
        };
      }
      const date = new Date(current_game.original_release_date);
      const all_platforms = Object.values(GiantBombApi.platforms).slice(1);
      const all_releases = await GiantBombApi.gameReleases(
        current_game.id as number,
        all_platforms,
      );
      let releases_with_same_dates = 0;

      for (let release of all_releases) {
        if (
          release.platform?.id == game_release.id &&
          release.release_date == release.release_date
        ) {
          console.log("Valid platform with release date");
          return {
            date: date,
            type: "release",
          };
        } else if (
          release.platform?.id == game_release.id &&
          release.release_date != release.release_date
        ) {
          console.log("Valid platform with different release date");
          return {
            date: date,
            type: "release",
          };
        } else if (
          release.platform?.id != game_release.id &&
          release.release_date == release.release_date
        ) {
          releases_with_same_dates++;
        }
      }

      if (
        releases_with_same_dates == 0 ||
        releases_with_same_dates != all_releases.length
      ) {
        console.log(
          "No found release platforms but initial release date might be right",
        );
        return {
          date: date,
          type: "release",
        };
      } else if (releases_with_same_dates == all_releases.length) {
        console.log(
          "Release date is likely missing for the specific desired platform",
        );
        return {
          date: null,
          type: "error",
        };
      }
      return {
        date: null,
        type: "error",
      };
    }

    const info_url = this.#urlMakeInfo(`3030-${current_game["id"]}`);
    const info_data = (await this.#urlFetch(info_url)) as any; // temp;
    if (has_release && game_release && game_release["release_date"]) {
      const date = new Date(game_release["release_date"]);
      // if game release matches but is not the same platform log this, and continue checking all other releases
      // - If the total releases is equal to the checked release meaning all releases have the same date but different platforms
      //
      //   The expectation should be this game does not have a release date for this platform even if there is a date its safer to air on the side of
      //   no date since it could be the case like spiderman 2 a release date is just missing even tho it should exist it dosent so u can't pully anything
      //
      // - If the total releases does not match the the counted matching release dates, this one is complicated since the games are already filtered by platform
      // so any game under this really should have a release date for the platform I think in this case I will probably fallback to the release_date but
      // preface it to the user that while this is likely the release date there was no way to 100% confirm it for the desired platform and manual intervevetion
      // may be required

      return verifyPlatforms();
    } else {
      // 2 cases, 1st case no release date at all (expected behavior for unconfirmed game dates), 2nd case
      // some games may have missing releases for platforms. Both will use
      // expected release dates as fallback (assuming desired platforms are present).
      if (!info_data) {
        console.error("Failed to fetch game data");
        return {
          date: null,
          type: "error",
        };
      }
      if (info_data["number_of_total_results"] > 0) {
        let has_platform = false;
        for (let current_platform of info_data["results"]["platforms"]) {
          if (current_platform["id"] == platform) {
            has_platform = true;
            break;
          }
        }
        if (has_platform) {
          const expected_year = info_data["results"][
            "expected_release_year"
          ] as number;
          const expected_month = info_data["results"][
            "expected_release_month"
          ] as number;
          const expected_day = info_data["results"][
            "expected_release_day"
          ] as number;
          const original_release_date = info_data["results"][
            "original_release_date"
          ] as string | null;
          if (!expected_year || !expected_month || !expected_day) {
            if (original_release_date) {
              verifyPlatforms();
            } else {
              console.warn("No expected release date");
              return {
                date: null,
                type: "TBA",
              };
            }
          }
          const expected_date = `${expected_year}-${expected_month}-${expected_day}`;
          const date = new Date(expected_date);
          console.log(expected_date, date);
          return {
            date: date,
            type: "expected",
          };
        } else {
          console.error("Game does not have specifed platforms");
          return {
            date: null,
            type: "error",
          };
        }
      } else {
        console.error("Game has no platforms");
        return {
          date: null,
          type: "error",
        };
      }
    }
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

const giantbomb_platform_values: GiantbombPlatformValues = {} as const;
Object.assign(giantbomb_platform_values, GiantBombApi.platforms);
