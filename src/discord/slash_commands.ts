import { ApplicationCommandOptionType, REST, Routes } from "discord.js";
import * as dotenv from "dotenv";
dotenv.config();

export default class SlashCommands {
  static #rest = new REST({ version: "10" }).setToken(
    process.env["DISCORD_TOKEN"] as string,
  );
  static #commands = [
    {
      name: "search",
      description:
        "Search for a game from GiantBomb (More accurate release dates)",
    },
    {
      name: "notifier",
      description: "Interact with the bot with a homepage of all options",
    },
    {
      name: "settings",
      description: "Configure bot settings",
    },
  ];
  static async register() {
    try {
      console.log("Registering commands...");
      await this.#rest.put(
        Routes.applicationGuildCommands(
          process.env["CLIENT_ID"] as string,
          process.env["GUILD_ID"] as string,
        ),
        { body: this.#commands },
      );
      console.log("Commands were registered sucessfully");
    } catch (error) {
      console.log(`Error: ${error}`);
    }
  }
}
