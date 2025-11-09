import {
  Client,
  Events,
  GatewayIntentBits,
  ChatInputCommandInteraction,
  ButtonInteraction,
  ModalSubmitInteraction,
  AnySelectMenuInteraction,
} from "discord.js";
import SlashCommands from "./slash_commands.js";
import Page from "./page.js";
import * as dotenv from "dotenv";
import Database from "../util/database.js";
import cron from "node-cron";
import { GlobalsDatabaseObj } from "../api/api_types.js";
import Scheduler from "../util/scheduler.js";

dotenv.config();

// type definitions
interface PageInstances {
  message_id: string;
  page_instance: InstanceType<typeof Page>;
}

const page_instances: PageInstances[] = [];

// create database
Database.initialize();

// register slash commands
SlashCommands.register();

// start bot
export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// only runs updater every 7 days
async function updateGames() {
  const globals = (await Database.get("SELECT * FROM globals WHERE id = ?", [
    1,
  ])) as GlobalsDatabaseObj;
  let last_checked_date;
  if (!globals) {
    const last_checked_date = new Date();
    await Database.run("INSERT INTO globals (last_checked_date) VALUES (?)", [
      String(last_checked_date.setDate(last_checked_date.getDate() + 7)),
    ]);
  } else {
    last_checked_date = new Date(globals.last_checked_date);
  }
  const current_date = new Date();
  if (!last_checked_date || last_checked_date < current_date) {
    Scheduler.updater();
    if (last_checked_date) {
      last_checked_date = new Date();
      await Database.run(
        "UPDATE globals SET last_checked_date = ? WHERE id = ?",
        [last_checked_date.setDate(last_checked_date.getDate() + 7), 1],
      );
    }
  }
}

async function scheduledTasks(client: Client) {
  updateGames();
  Scheduler.notifier(client);
}

client.once(Events.ClientReady, async (client) => {
  console.log(`${client.user.tag} is primed and ready for gaming.`);
  // start cron jobs.
  cron.schedule("0 12 * * *", () => scheduledTasks(client));
  // startup scheduled tasks initial checks
  scheduledTasks(client);
});

// handle interactions
client.on("interactionCreate", async (interaction) => {
  // handle buttons
  if (interaction.isButton()) {
    const button_interaction = interaction as ButtonInteraction;
    let page;
    for (let instance of page_instances) {
      if (instance["message_id"] == button_interaction.message.id) {
        page = instance.page_instance;
      }
    }
    if (!page) {
      console.error("No valid page instance!");
      return;
    }
    page.setIds(
      button_interaction.message.id,
      button_interaction.message.channelId,
    );

    let custom_id, button_data;
    if (button_interaction.customId.includes(":")) {
      [custom_id, button_data] = button_interaction.customId.split(":");
    } else {
      custom_id = button_interaction.customId;
    }

    // page interaction events
    switch (custom_id) {
      case "search": {
        await Page.searchModal(
          button_interaction,
          button_interaction.message.id,
        );
        break;
      }
      case "select_game": {
        await Page.selectGameModal(
          button_interaction,
          button_interaction.message.id,
        );
        break;
      }
      case "change_game_date": {
        if (button_data) {
          await Page.updateGameDateModal(
            button_interaction,
            button_data,
            button_interaction.message.id,
          );
        } else {
          console.error("Missing button data for change date 97");
        }
        break;
      }
      // search selection logic search > platform > region
      case "select": {
        button_interaction.deferUpdate();
        if (page.search_object.method == "search") {
          await page.confirmPlatform(
            client,
            button_interaction.guildId as string,
            1,
          );
        } else if (page.search_object.method == "platform") {
          await page.confirmPlatform(
            client,
            button_interaction.guildId as string,
            page.search_object.page,
            true,
          );
        } else if (page.search_object.method == "region") {
          await page.confirmRegion(
            client,
            button_interaction.guildId as string,
            page.search_object.page,
            true,
          );
        }
        break;
      }
      case "delete": {
        button_interaction.deferUpdate();
        if (button_data) {
          try {
            const game = await Database.run(
              "DELETE FROM games WHERE game_id = ?",
              [Number(button_data)],
              "Game deleted from database",
            );
            await page.games(
              client,
              button_interaction.guildId as string,
              page.search_object.page,
            );
          } catch (error) {
            console.error(error);
          }
        }
        break;
      }
      case "games": {
        button_interaction.deferUpdate();
        await page.games(
          client,
          button_interaction.guildId as string,
          page.search_object.page,
        );
        break;
      }
      case "settings": {
        button_interaction.deferUpdate();
        await page.settings(client, button_interaction.guildId as string);
        break;
      }
      case "back_search": {
        button_interaction.deferUpdate();
        let current_page = 1;
        if (page.search_object.selected) {
          page.search_object.page = page.search_object.selected;
          current_page = page.search_object.page;
        }
        await page.search(
          current_page,
          client,
          button_interaction.guildId as string,
        );
        break;
      }
      case "back": {
        button_interaction.deferUpdate();
        await page.home(client);
        break;
      }
      case "previous": {
        if (!page.search_object["max_length"]) {
          console.error("max_length undefined");
          return;
        }
        if (page.search_object["page"] > 1) {
          page.search_object["page"]--;
        }
        button_interaction.deferUpdate();
        console.log(
          `Page: ${page.search_object["page"]} of ${page.search_object["max_length"]}`,
        );
        page.changePage(
          client,
          button_interaction.guildId as string,
          page.search_object["page"],
        );
        break;
      }
      case "next": {
        if (!page.search_object["max_length"]) {
          console.error("max_length undefined");
          return;
        }
        if (page.search_object["page"] < page.search_object["max_length"]) {
          page.search_object["page"]++;
        }
        button_interaction.deferUpdate();
        console.log(
          `Page: ${page.search_object["page"]} of ${page.search_object["max_length"]}`,
        );
        page.changePage(
          client,
          button_interaction.guildId as string,
          page.search_object["page"],
        );
        break;
      }
    }
    // slash commands events
  } else if (interaction.isChatInputCommand()) {
    const command_interaction = interaction as ChatInputCommandInteraction;
    switch (command_interaction.commandName) {
      case "notifier": {
        const page = new Page();
        await page.home(client, command_interaction);
        if (page.message_id) {
          page_instances.push({
            message_id: page.message_id,
            page_instance: page,
          });
        }
        break;
      }
      // searchModal > search > confirmPlatform > confirmRegion
      case "search": {
        await Page.searchModal(command_interaction);
        break;
      }
      case "games": {
        const page = new Page();
        await page.games(
          client,
          command_interaction.guildId as string,
          1,
          command_interaction,
        );
        if (page.message_id) {
          page_instances.push({
            message_id: page.message_id,
            page_instance: page,
          });
        }
        break;
      }
      case "settings": {
        const page = new Page();
        await page.settings(
          client,
          command_interaction.guildId as string,
          command_interaction,
        );
        if (page.message_id) {
          page_instances.push({
            message_id: page.message_id,
            page_instance: page,
          });
        }
        break;
      }
      default: {
        command_interaction.reply("Not a valid command");
        break;
      }
    }

    // Modal submit events
  } else if (interaction.isModalSubmit()) {
    const modal_interaction = interaction as ModalSubmitInteraction;

    // using the modals customId to also pass in the current message id which is needed to edit the specific message
    let custom_id, message_id, game_id;
    if (modal_interaction.customId.includes(":")) {
      const data = modal_interaction.customId.split(":");
      for (let i of data) {
        if (i.includes("message-")) {
          message_id = i.split("-")[1];
        } else if (i.includes("game-")) {
          game_id = i.split("-")[1];
        } else {
          custom_id = i;
        }
      }
    } else {
      custom_id = modal_interaction.customId;
    }
    // called when search page is submited
    if (custom_id == "search_modal") {
      const search_query =
        modal_interaction.fields.getTextInputValue("search_query");
      if (search_query) {
        let page;
        let search;
        if (message_id) {
          for (let instance of page_instances) {
            if (instance["message_id"] == message_id) {
              page = instance.page_instance;
            }
          }
          if (!page) {
            console.log("No valid page instance!");
            return;
          }
          page.search_object["page"] = 1;
          search = await page.search(
            page.search_object["page"],
            client,
            modal_interaction.guildId as string,
            search_query,
          );
          modal_interaction.deferUpdate();
        } else {
          page = new Page();
          search = await page.search(
            page.search_object["page"],
            client,
            modal_interaction.guildId as string,
            search_query,
            modal_interaction,
          );
        }
        if (!page) return;
        if (search) {
          page.search_object["page"] = search["page"];
          page.search_object["max_length"] = search["max_length"];
        }
        if (!message_id && page.message_id) {
          page_instances.push({
            message_id: page.message_id,
            page_instance: page,
          });
        }
      }
    } else if (custom_id == "select_game_modal") {
      const selected_game =
        modal_interaction.fields.getTextInputValue("selected_game");
      if (selected_game) {
        let page;
        let search;
        if (message_id) {
          for (let instance of page_instances) {
            if (instance["message_id"] == message_id) {
              page = instance.page_instance;
            }
          }
          if (!page) {
            console.log("No valid page instance!");
            return;
          }
          search = await page.selectGame(
            client,
            modal_interaction.guildId as string,
            selected_game,
          );
          modal_interaction.deferUpdate();
        } else {
          page = new Page();
          search = await page.selectGame(
            client,
            modal_interaction.guildId as string,
            selected_game,
          );
        }
        if (!page) return;
        if (!message_id && page.message_id) {
          page_instances.push({
            message_id: page.message_id,
            page_instance: page,
          });
        }
      }
    } else if (custom_id == "update_game_date_modal") {
      const game_date = modal_interaction.fields.getTextInputValue("game_date");
      if (!game_id) {
        console.error("Can't update game date no game_id 377");
        return;
      }
      if (game_date) {
        let page;
        let search;
        if (message_id) {
          for (let instance of page_instances) {
            if (instance["message_id"] == message_id) {
              page = instance.page_instance;
            }
          }
          if (!page) {
            console.log("No valid page instance!");
            return;
          }
          search = await page.updateGameDate(
            client,
            modal_interaction.guildId as string,
            game_id,
            game_date,
          );
          modal_interaction.deferUpdate();
        } else {
          page = new Page();
          search = await page.updateGameDate(
            client,
            modal_interaction.guildId as string,
            game_id,
            game_date,
          );
        }
        if (!page) return;
        if (!message_id && page.message_id) {
          page_instances.push({
            message_id: page.message_id,
            page_instance: page,
          });
        }
      }
    }
  } else if (interaction.isAnySelectMenu()) {
    const select_interaction = interaction as AnySelectMenuInteraction;
    switch (select_interaction.customId) {
      case "channel": {
        select_interaction.deferUpdate();
        const selected_channel = String(select_interaction.values);
        const select_sql = "SELECT * FROM settings WHERE server_id = ?";
        const select = await Database.get(select_sql, [
          select_interaction.guildId,
        ]);
        if (select) {
          const insert_sql = "UPDATE settings SET channel_id = ?";
          const resolve_message = `Channel updated to ${selected_channel}`;
          await Database.run(insert_sql, [selected_channel], resolve_message);
        } else {
          const update_sql =
            "INSERT INTO settings (server_id, channel_id) VALUES (?, ?)";
          const resolve_message = `Channel set to ${selected_channel}`;
          await Database.run(
            update_sql,
            [select_interaction.guildId, selected_channel],
            resolve_message,
          );
        }
        break;
      }
      case "platforms": {
        select_interaction.deferUpdate();
        const selected_platforms = select_interaction.values;
        const platforms_string = JSON.stringify(selected_platforms);
        const select_sql = "SELECT * FROM settings WHERE server_id = ?";
        const select = await Database.get(select_sql, [
          select_interaction.guildId,
        ]);
        if (select) {
          const insert_sql = "UPDATE settings SET platforms = ?";
          const resolve_message = `Platforms updated to ${platforms_string}`;
          await Database.run(insert_sql, [platforms_string], resolve_message);
        } else {
          const update_sql =
            "INSERT INTO settings (server_id, platforms) VALUES (?, ?)";
          const resolve_message = `Platforms set to ${platforms_string}`;
          await Database.run(
            update_sql,
            [select_interaction.guildId, platforms_string],
            resolve_message,
          );
        }
        break;
      }
    }
    // ignore other interactions
  } else {
    return;
  }
});

client.login(process.env["DISCORD_TOKEN"]);
