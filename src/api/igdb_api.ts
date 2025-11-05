//## Unused Api keeping incase of addition of igdb api ##

import * as dotenv from "dotenv";
import { IgdbAuth, IgdbGameCover, IgdbSearchGame } from "./api_types";
dotenv.config();

export default class IgdbApi {
  static readonly #BASE_URL = "https://api.igdb.com/v4";
  static readonly #CLIENT_ID = process.env["TWITCH_CLIENT_ID"] as string;
  static readonly #CLIENT_SECRET = process.env[
    "TWITCH_CLIENT_SECRET"
  ] as string;
  token_expiration: undefined | number = undefined;
  access_token: undefined | string = undefined;

  // igdb has less granular platform selection, console, portable_console & pc
  // this is just mapping the more granular giantbomb types to igdb types
  public static readonly platforms = {
    ALL: 0,
    PC: 6,
    SWITCH: 5,
    XBOX_ONE: 1,
    XBOX_SERIES: 1,
    PS4: 1,
    PS5: 1,
  } as const;

  public async authenticate(): Promise<Promise<any>> {
    if (this.token_expiration && this.token_expiration) {
      const current_time = new Date().getTime();
      if (current_time < this.token_expiration) {
        console.log(
          "Already authenticated.",
          current_time,
          this.token_expiration,
          this.access_token,
        );
        return;
      }
    }

    const params = new URLSearchParams({
      client_id: String(IgdbApi.#CLIENT_ID),
      client_secret: String(IgdbApi.#CLIENT_SECRET),
      grant_type: "client_credentials",
    });
    let request;
    try {
      request = await fetch(`https://id.twitch.tv/oauth2/token`, {
        method: "POST",
        body: params,
      });
    } catch (error) {
      console.error(error);
      return;
    }

    return new Promise(async (resolve, reject) => {
      if (request) {
        const request_json = (await request.json()) as IgdbAuth;
        if (request_json["access_token"]) {
          if (request_json["expires_in"]) {
            const current_time = new Date().getTime();
            this.token_expiration =
              current_time + request_json["expires_in"] * 1000; // convert to milliseconds
            this.access_token = request_json["access_token"];
          }
          resolve("valid");
        } else {
          console.error(
            "IgdbApi Error: authenticate request_json has no access_token",
          );
          reject(
            "IgdbApi Error: authenticate request_json has no access_token",
          );
        }
      } else {
        console.error("IgdbApi Error: authenticate failed to get a request");
        reject("IgdbApi Error: authenticate failed to get a request");
      }
    });
  }

  public async sqlRequest<ApiType>(
    endpoint: string,
    sql: string,
  ): Promise<ApiType[]> {
    const request = await fetch(`${IgdbApi.#BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.access_token}`,
        "Client-ID": `${IgdbApi.#CLIENT_ID}`,
      },
      body: sql,
    });
    const request_json = await request.json();
    return request_json as ApiType[];
  }

  public async search(
    query: string,
    platforms: number = 6,
  ): Promise<IgdbSearchGame[] | void> {
    const request = await this.sqlRequest<IgdbSearchGame>(
      "/games",
      `fields *; search "${query}"; where platforms = (${platforms}); limit 10;`,
    );
    if (request) {
      return request;
    }
    console.table(request);
  }
  /*
  public async getSearchResults(results: IgdbSearchGame[]) : Promise<IgdbSearchResult[]> {
    const games = [];
    for (let search_game of results) {
      const [game, covers] = await Promise.all([this.game(search_game.game), this.cover(search_game.game)]);
      if (game && covers) {
        games.push({
          game: game,
          cover: covers
        });
      }
    }
    return games;
  }
  */

  public async covers(igdb_games: IgdbSearchGame[]): Promise<void> {
    const covers_request = [];
    for (let game of igdb_games) {
      if (game.id) {
        covers_request.push(
          this.sqlRequest<IgdbGameCover>(
            "/covers",
            `fields *; where game = ${game.id};`,
          ),
        );
      } else {
        console.error(`Missing game id ${game.name}`);
      }
    }
    const covers = await Promise.all(covers_request);
    //return covers;
  }

  // temp for testing
  public async cover(game_id: number): Promise<IgdbGameCover | void> {
    const request = await this.sqlRequest<IgdbGameCover>(
      "/covers",
      `fields *; where game = ${game_id};`,
    );
    if (request[0]) {
      return request[0];
    }
    return;
  }

  public async gameReleases(): Promise<void> {}

  public async gameReleaseDate(igdb: any): Promise<void> {
    const unix_first_date = igdb.game.first_release_date;
    if (unix_first_date) {
      const human_first_date = new Date(unix_first_date * 1000);
      const current_time = new Date();
      console.log(unix_first_date, human_first_date, current_time);
      console.log(human_first_date < current_time);
      if (human_first_date < current_time) {
        console.log("Game is already out");
      } else {
        console.log(`Game releasing ${human_first_date.toDateString()}`);
      }
    } else {
      console.log("TBA");
    }
  }
}
