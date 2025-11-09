import sqlite3 from "sqlite3";
import * as dotenv from "dotenv";
import { GameSearchResult } from "../api/api_types";
dotenv.config();
sqlite3.verbose();

export default class Database {
  static async game(
    guild_id: string,
    game_id: number,
    api_type: string,
    game_name: string,
    game_description: string,
    detail_url: string,
    image_url: string,
    platform: number,
    release_date: string,
    released_status: boolean,
    action: string = "create",
  ) {
    const select_sql =
      "SELECT * FROM games WHERE server_id = ? AND game_id = ?";
    const select = await Database.get(select_sql, [guild_id, game_id]);
    if (select) {
      const resolve_message = `${game_name} - Updated`;
      const sql =
        "UPDATE games SET name = ?, description = ?, detail_url = ?, image_url = ?, platform = ?, release_date = ?, released_status = ? WHERE game_id = ?";
      await Database.run(
        sql,
        [
          game_name,
          game_description,
          detail_url,
          image_url,
          platform,
          release_date,
          released_status,
          game_id,
        ],
        resolve_message,
      );
    } else if (!select) {
      const resolve_message = `${game_name} - Created`;
      const sql =
        "INSERT INTO games (server_id, game_id, api_type, name, description, detail_url, image_url, platform, release_date, released_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
      await Database.run(
        sql,
        [
          guild_id,
          game_id,
          api_type,
          game_name,
          game_description,
          detail_url,
          image_url,
          platform,
          release_date,
          released_status,
        ],
        resolve_message,
      );
    } else if (action == "delete") {
      const resolve_message = `${game_name} - Deleted`;
      const sql = "DELETE FROM games WHERE game_id = ?";
      await Database.run(sql, [game_id], resolve_message);
    }
  }

  static all(sql: string, data: any[]): Promise<any> {
    const db = new sqlite3.Database(process.env["DATABASE_PATH"] as string);
    return new Promise((resolve, reject) => {
      db.all(sql, data, (error, row) => {
        db.close();
        if (error) {
          reject(error);
        } else {
          resolve(row);
        }
      });
    });
  }

  static get(sql: string, data: any[]): Promise<any> {
    const db = new sqlite3.Database(process.env["DATABASE_PATH"] as string);
    return new Promise((resolve, reject) => {
      db.get(sql, data, (error, row) => {
        db.close();
        if (error) {
          reject(error);
        } else {
          resolve(row);
        }
      });
    });
  }
  static run(
    sql: string,
    data: any[],
    resolve_message: string | undefined = undefined,
  ): Promise<any> {
    const db = new sqlite3.Database(process.env["DATABASE_PATH"] as string);
    return new Promise((resolve, reject) => {
      const prep = db.prepare(sql);
      prep.run(data, (error) => {
        prep.finalize();
        db.close();
        if (error) {
          console.log(error);
          reject(error);
        } else {
          if (resolve_message) {
            console.log(resolve_message);
          }
          resolve(true);
        }
      });
    });
  }
  static initialize(): void {
    const db = new sqlite3.Database(process.env["DATABASE_PATH"] as string);
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id TEXT NOT NULL,
        game_id INTEGER NOT NULL,
        api_type TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        detail_url TEXT NOT NULL,
        image_url TEXT NOT NULL,
        platform INTEGER NOT NULL,
        release_date TEXT NOT NULL,
        released_status BOOLEAN NOT NULL
      )`),
        (error: any) => {
          if (error) {
            return console.error(error);
          }
          console.log("Table created successfully.");
        };
      db.run(`CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id TEXT NOT NULL,
        last_checked_date TEXT,
        channel_id TEXT,
        platforms TEXT
      )`),
        (error: any) => {
          if (error) {
            return console.error(error);
          }
          console.log("Table created successfully.");
        };
    });
    db.close();
  }
}
