import sqlite3 from "sqlite3";
import * as dotenv from "dotenv";
dotenv.config();
sqlite3.verbose()

export default class Database {
  static get(sql: string, data: any[]) : Promise<any>{
    const db = new sqlite3.Database(process.env["DATABASE_PATH"] as string);
    return new Promise((resolve, reject) => {
      db.get(sql, data, (error, row) => {
        db.close();
        if (error) {
          reject(error);
        } else {
          resolve(row);
        }
      })
    });
  }
  static run(sql: string, data: any[], resolve_message: string|undefined = undefined) : Promise<any>{
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
      })
    }); 
 
  }
  static initialize() : void {
    const db = new sqlite3.Database(process.env["DATABASE_PATH"] as string);
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id TEXT NOT NULL,
        game_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        release_date TEXT
      )`), (error: any) => {
        if (error) {
          return console.error(error);
        }
        console.log("Table created successfully.");
      };
      db.run(`CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id TEXT NOT NULL,
        channel_id TEXT,
        platforms TEXT
      )`), (error: any) => {
        if (error) {
          return console.error(error);
        }
        console.log("Table created successfully.");
      };
    });
    db.close();
  }
}
