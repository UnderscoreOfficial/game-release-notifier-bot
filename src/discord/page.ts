import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  ChatInputCommandInteraction,
  Client,
  EmbedBuilder,
  Message,
  ModalActionRowComponentBuilder,
  ModalBuilder,
  ModalSubmitInteraction,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import Database from "../util/database.js";
import {
  GameDatabaseObj,
  GamePlatforms,
  GameRelease,
  GameReleaseDateObject,
  GameSearchResult,
  GiantbombPlatformValues,
} from "../api/api_types.js";
import GiantBombApi from "../api/giantbomb_api.js";

// type definitions
interface SearchObject {
  max_length: number | undefined;
  page: number;
  method: string;
  selected: number | undefined;
  selected_platforms: number[] | undefined;
  selected_platform: number | undefined;
  game_releases: GameRelease[] | undefined;
  // search: Array<object> | undefined;
  // filtered_search: GameSearchResult[] | undefined;
  filtered_platforms: GamePlatforms[][] | undefined;
  giantbomb_search: GameSearchResult[] | undefined;
}

const platform_values: GiantbombPlatformValues = {} as const;
Object.assign(platform_values, GiantBombApi.platforms);

// primary methods for rendering pages and presenting data
export default class Page {
  public message_id: string | undefined;
  public channel_id: string | undefined;
  static alt_picture = `https://media.istockphoto.com/id/1011853308/vector/page-not-found.webp?s=1024x1024&w=is&k=20&c=oI6GgsQ44kGHNpX4oZalcuHSxqbpnbP8xGyQlH-v74k=`;

  public search_object: SearchObject = {
    max_length: undefined,
    page: 1,
    method: "search",
    selected: undefined,
    selected_platforms: undefined,
    selected_platform: undefined,
    game_releases: undefined,
    // search: undefined,
    // filtered_search: undefined,
    giantbomb_search: undefined,
    filtered_platforms: undefined,
  };

  public async home(
    client: Client,
    interaction: ChatInputCommandInteraction | undefined = undefined,
  ): Promise<void> {
    const row = new ActionRowBuilder<ButtonBuilder>();
    row.components.push(
      new ButtonBuilder()
        .setCustomId("settings")
        .setLabel("Settings")
        .setStyle(ButtonStyle.Primary),
    );
    row.components.push(
      new ButtonBuilder()
        .setCustomId("games")
        .setLabel("Games")
        .setStyle(ButtonStyle.Primary),
    );
    row.components.push(
      new ButtonBuilder()
        .setCustomId("search")
        .setLabel("Search")
        .setStyle(ButtonStyle.Primary),
    );

    const embed = new EmbedBuilder()
      .setTitle("Game Notifier Home")
      .setDescription(
        `Explore the options and settings, search for a game and select the one you like 
      and it will be saved to your game list. If the game is not released yet you will be notifed in your selected channel
      when the game is releasing. You can also view upcoming releases and view your list of added games`,
      )
      .setColor(0x79a475);

    let message: Message | undefined;
    if (interaction) {
      const reply = await interaction.reply({
        embeds: [embed],
        components: [row],
        fetchReply: true,
      });
      message = reply.reactions.message;
    } else {
      if (this.message_id && this.channel_id) {
        const channel = await client.channels.fetch(this.channel_id);
        if (channel?.isTextBased()) {
          message = await channel.messages.fetch(this.message_id);
          message.edit({ embeds: [embed], components: [row] });
        }
      }
    }
    if (message) {
      this.setIds(message.id, message.channelId);
    }
  }

  public async games(
    client: Client,
    guild_id: string,
    page: number,
    interaction: ChatInputCommandInteraction | undefined = undefined,
  ) {
    this.search_object.method = "games";
    const embed = new EmbedBuilder().setColor(0x79a475);
    const row = new ActionRowBuilder<ButtonBuilder>();
    row.components.push(
      new ButtonBuilder()
        .setCustomId("back")
        .setLabel("🡄 Back")
        .setStyle(ButtonStyle.Secondary),
    );

    const select_sql = "SELECT * FROM games WHERE server_id = ?";
    const all_games = (await Database.all(select_sql, [
      guild_id,
    ])) as GameDatabaseObj[];

    if (all_games.length) {
      // page logic
      const games_per_page = 20;
      const total_pages = Math.ceil(all_games.length / games_per_page);
      this.search_object.max_length = total_pages;
      const starting_game = (page - 1) * games_per_page;
      const ending_game = page * games_per_page;

      const games = all_games.slice(starting_game, ending_game);

      let description = "";
      let counter = 1;
      for (let game of games) {
        let game_date = game.release_date;
        if (game.release_date.includes("undefined")) {
          game_date = "TBA\_\_\_TBA\_";
        }
        if (game_date.length < 10) {
          game_date += "\_";
        }
        if (counter % 2) {
          description += `**|**\\_\\_\`${game_date}\` - **${game.name}**\n`;
        } else {
          description += `> \`${game_date}\` - **${game.name}**\n`;
        }
        counter++;
      }
      if (page == 1) {
        row.components.push(
          new ButtonBuilder()
            .setCustomId("previous")
            .setLabel("🡄")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
        );
      } else {
        row.components.push(
          new ButtonBuilder()
            .setCustomId("previous")
            .setLabel("🡄")
            .setStyle(ButtonStyle.Primary),
        );
      }
      if (page == total_pages) {
        row.components.push(
          new ButtonBuilder()
            .setCustomId("next")
            .setLabel("🡆")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
        );
      } else {
        row.components.push(
          new ButtonBuilder()
            .setCustomId("next")
            .setLabel("🡆")
            .setStyle(ButtonStyle.Primary),
        );
      }
      row.components.push(
        new ButtonBuilder()
          .setCustomId("select_game")
          .setLabel("Select Game")
          .setStyle(ButtonStyle.Primary),
      );
      embed
        .setTitle(`Total Games - ${all_games.length}`)
        .setDescription(description)
        .setFooter({
          text: `${page} of ${total_pages}`,
        });
    } else {
      console.warn("No games added!");
      embed.setTitle(`Total Games - 0`).setDescription("No games added!");
    }

    let message: Message | undefined;
    if (interaction) {
      const reply = await interaction.reply({
        embeds: [embed],
        components: [row],
        fetchReply: true,
      });
      message = reply.reactions.message;
    } else {
      this.#editMessage(client, embed, row);
    }
    if (message) {
      this.setIds(message.id, message.channelId);
    }
  }

  public async settings(
    client: Client,
    guild_id: string,
    interaction: ChatInputCommandInteraction | undefined = undefined,
  ): Promise<void> {
    const select_sql = "SELECT * FROM settings WHERE server_id = ?";
    const select = await Database.get(select_sql, [guild_id]);

    const buttons = new ActionRowBuilder<ButtonBuilder>();
    buttons.components.push(
      new ButtonBuilder()
        .setCustomId("back")
        .setLabel("🡄 Back")
        .setStyle(ButtonStyle.Secondary),
    );

    const channel_row = new ActionRowBuilder<ChannelSelectMenuBuilder>();
    const channel_select = new ChannelSelectMenuBuilder()
      .setCustomId("channel")
      .setChannelTypes(
        ChannelType.GuildText,
        ChannelType.PublicThread,
        ChannelType.GuildAnnouncement,
      )
      .setPlaceholder("Select channel to get new releases in.");
    if (select) {
      if (select["channel_id"] !== null) {
        channel_select.setDefaultChannels([select["channel_id"]]);
      }
    }
    channel_row.addComponents(channel_select);

    const platforms_row = new ActionRowBuilder<StringSelectMenuBuilder>();
    const platforms = new StringSelectMenuBuilder()
      .setCustomId("platforms")
      .setPlaceholder("Select platforms to be shown.")
      .setMaxValues(Object.keys(GiantBombApi.platforms).length);

    let selected_platforms: string[] = [];
    if (select) {
      if (select["platforms"] !== null) {
        selected_platforms = JSON.parse(select["platforms"]);
      } else {
        selected_platforms.push("PC");
      }
    } else {
      selected_platforms.push("PC");
    }

    for (let platform of Object.keys(GiantBombApi.platforms)) {
      const option = new StringSelectMenuOptionBuilder()
        .setLabel(platform)
        .setValue(platform);
      if (selected_platforms.includes(platform)) {
        option.setDefault(true);
      }
      platforms.addOptions(option);
    }
    platforms_row.addComponents(platforms);

    const embed = new EmbedBuilder()
      .setTitle(
        ":gear:   Settings   -   *modify local settings for this server*",
      )
      .setColor(0x79a475);

    let message: Message | undefined;
    if (interaction) {
      const reply = await interaction.reply({
        embeds: [embed],
        components: [channel_row, platforms_row, buttons],
        fetchReply: true,
      });
      message = reply.reactions.message;
    } else {
      if (this.message_id && this.channel_id) {
        const channel = await client.channels.fetch(this.channel_id);
        if (channel?.isTextBased()) {
          message = await channel.messages.fetch(this.message_id);
          message.edit({
            embeds: [embed],
            components: [channel_row, platforms_row, buttons],
          });
        }
      }
    }
    if (message) {
      this.setIds(message.id, message.channelId);
    }
  }

  #navButtons(row: ActionRowBuilder<ButtonBuilder>) {
    row.components.push(
      new ButtonBuilder()
        .setCustomId("back")
        .setLabel("🡄 Back")
        .setStyle(ButtonStyle.Secondary),
    );
    if (this.search_object.page == 1) {
      row.components.push(
        new ButtonBuilder()
          .setCustomId("previous")
          .setLabel("🡄")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
      );
    } else {
      row.components.push(
        new ButtonBuilder()
          .setCustomId("previous")
          .setLabel("🡄")
          .setStyle(ButtonStyle.Primary),
      );
    }
    if (this.search_object.page == this.search_object.max_length) {
      row.components.push(
        new ButtonBuilder()
          .setCustomId("next")
          .setLabel("🡆")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
      );
    } else {
      row.components.push(
        new ButtonBuilder()
          .setCustomId("next")
          .setLabel("🡆")
          .setStyle(ButtonStyle.Primary),
      );
    }
    row.components.push(
      new ButtonBuilder()
        .setCustomId("select")
        .setLabel("Select")
        .setStyle(ButtonStyle.Success),
    );
    row.components.push(
      new ButtonBuilder()
        .setCustomId("search")
        .setLabel("Search")
        .setStyle(ButtonStyle.Secondary),
    );
  }

  public async updateGameDate(
    client: Client,
    guild_id: string,
    game_id: string,
    game_date: string,
  ): Promise<SearchObject | void> {
    const regex = /^\d{1,2}-\d{1,2}-\d{2,4}$/;
    if (regex.test(game_date)) {
      await Database.run(
        "UPDATE games SET release_date = ? WHERE game_id = ?",
        [game_date, game_id],
      );
      const game = (await Database.get(
        "SELECT * FROM games WHERE game_id = ?",
        [game_id],
      )) as GameDatabaseObj;
      this.selectGame(client, guild_id, game.name);
    } else {
      console.warn("Invalid Date Format");
    }
  }

  public async selectGame(
    client: Client,
    guild_id: string,
    selected_game: string,
    interaction: ModalSubmitInteraction | undefined = undefined,
  ): Promise<SearchObject | void> {
    const embed = new EmbedBuilder();
    embed
      // .setURL("a url")
      .setColor(0x79a475);
    const row = new ActionRowBuilder<ButtonBuilder>();
    row.components.push(
      new ButtonBuilder()
        .setCustomId("games")
        .setLabel("🡄 Back")
        .setStyle(ButtonStyle.Secondary),
    );

    // fuzzy filtering game but will only return 1 game so needs to be pretty specific
    if (selected_game) {
      const avaliable_server_games = (await Database.all(
        "SELECT * FROM games WHERE server_id = ?",
        [guild_id],
      )) as GameDatabaseObj[];
      for (let game of avaliable_server_games) {
        if (game.name.toLowerCase().includes(selected_game.toLowerCase())) {
          embed
            .setTitle(`${game.name}`)
            .setURL(game.detail_url)
            .setImage(game.image_url)
            .setDescription(game.description)
            .addFields({ name: "Release Date", value: `${game.release_date}` });
          row.components.push(
            new ButtonBuilder()
              .setCustomId(`delete:${game.game_id}`)
              .setLabel("Delete")
              .setStyle(ButtonStyle.Danger),
          );
          row.components.push(
            new ButtonBuilder()
              .setCustomId(`change_game_date:${game.game_id}`)
              .setLabel("Change Date")
              .setStyle(ButtonStyle.Primary),
          );
          break;
        }
        embed
          .setTitle(`No game found`)
          .setDescription("This game does not exist");
      }
      row.components.push(
        new ButtonBuilder()
          .setCustomId("select_game")
          .setLabel("Select Game")
          .setStyle(ButtonStyle.Primary),
      );
    }

    let message: Message | undefined;
    if (interaction) {
      const reply = await interaction.reply({
        embeds: [embed],
        components: [row],
        fetchReply: true,
      });
      message = reply.reactions.message;
    } else {
      console.log(message);
      this.#editMessage(client, embed, row);
    }
    if (message) {
      this.setIds(message.id, message.channelId);
    }
  }

  public async search(
    page: number,
    client: Client,
    guild_id: string,
    query: string | undefined = undefined,
    interaction: ModalSubmitInteraction | undefined = undefined,
  ): Promise<SearchObject | void> {
    // initial state
    this.search_object.method = "search";
    this.search_object.selected = undefined;
    let game_search;

    if (query) {
      console.log("search_object does not exist hitting api");
      const server_platforms = await GiantBombApi.getPlatforms(guild_id);
      if (server_platforms) {
        const [giantbomb_games, valid_platforms, valid_platform_ids] =
          await GiantBombApi.search(server_platforms, query);
        if (!giantbomb_games.length) {
          console.log("No search results");
          return;
        }

        this.search_object.giantbomb_search = giantbomb_games;
        this.search_object.filtered_platforms = valid_platforms;
        this.search_object.selected_platforms = valid_platform_ids;
        game_search = giantbomb_games;
      }
    } else {
      if (this.search_object.giantbomb_search) {
        game_search = this.search_object.giantbomb_search;
      }
    }

    // ts check, It should be impossible to get past this without game_search
    if (!game_search || !game_search.length) {
      return;
    }

    const current_page_data = game_search[page - 1];

    // more ts checks
    if (!current_page_data) return;

    const max_length = game_search.length;
    this.search_object.max_length = max_length;

    const row = new ActionRowBuilder<ButtonBuilder>();
    this.#navButtons(row);

    // giantbomb platforms are objects, grabing names
    let game_platforms = [];
    let platforms = " ";
    if (current_page_data.platforms !== null) {
      for (let platform of current_page_data.platforms) {
        game_platforms.push(platform.name);
      }
      platforms = game_platforms.join(", ");
    }

    // building message
    const embed = new EmbedBuilder()
      .setTitle(current_page_data.name)
      .setDescription(current_page_data.deck)
      .setURL(current_page_data.site_detail_url)
      .setColor(0x79a475);
    if (platforms.trim().length) {
      embed.addFields({ name: "Platforms", value: platforms });
    }
    embed
      .setImage(current_page_data.image?.medium_url || Page.alt_picture)
      .setFooter({ text: `${page} of ${max_length}` });
    let message: Message | undefined;
    if (interaction) {
      const reply = await interaction.reply({
        embeds: [embed],
        components: [row],
        fetchReply: true,
      });
      message = reply.reactions.message;
    } else {
      console.log(message);
      this.#editMessage(client, embed, row);
    }
    if (message) {
      this.setIds(message.id, message.channelId);
    }
    return { max_length: max_length, page: page } as SearchObject;
  }

  // confirmPlatform is called first after a selection on a search result
  // only prompts if more than 1 platforms & or can't select 1
  public async confirmPlatform(
    client: Client,
    guild_id: string,
    page: number,
    select: boolean = false,
  ): Promise<void> {
    this.search_object.method = "platform";

    if (!this.search_object.giantbomb_search) {
      console.error("game_search undefined");
      return;
    }
    if (!this.search_object.selected) {
      this.search_object.selected = this.search_object.page;
    }
    if (page) {
      this.search_object.page = page;
    }
    const selected = this.search_object.selected;
    const current_page_data = this.search_object.giantbomb_search[
      selected - 1
    ] as GameSearchResult;
    const platforms = current_page_data.platforms;
    const row = new ActionRowBuilder<ButtonBuilder>();

    // error state if no platforms
    if (platforms === null || !platforms.length) {
      row.components.push(
        new ButtonBuilder()
          .setCustomId("back_search")
          .setLabel("🡄 Back")
          .setStyle(ButtonStyle.Secondary),
      );
      const embed = new EmbedBuilder()
        .setTitle(`${current_page_data.name} - Select Platform`)
        .setURL(current_page_data.site_detail_url)
        .addFields({ name: "No Platforms", value: " " })
        .setColor(0x79a475);
      this.#editMessage(client, embed, row);
      console.error("Platforms null or have no length");
      return;
    }

    let filtered_platforms: GamePlatforms[] = platforms;
    if (this.search_object.filtered_platforms) {
      filtered_platforms = this.search_object.filtered_platforms[
        selected - 1
      ] as GamePlatforms[];
    }

    const max_length = filtered_platforms.length;
    this.search_object.max_length = max_length;

    // user selected platform state
    if (select) {
      const filtered_platform = filtered_platforms[page - 1];
      if (filtered_platform && filtered_platform["id"]) {
        this.search_object.selected_platform = filtered_platform["id"];
        this.confirmRegion(client, guild_id, 1);
      } else {
        console.error("Cannot access selected platform");
      }
      return;
    }

    // skip platform selection state
    if (max_length == 1) {
      if (filtered_platforms[0]) {
        console.log("Only 1 platform skiping to confirmRegion");
        this.search_object.selected_platform = filtered_platforms[0]["id"];
        this.confirmRegion(client, guild_id, 1);
      } else {
        console.error("Cannot access platform even though only 1 is present");
      }
      return;
    }

    const current_platform = filtered_platforms[page - 1];
    if (!current_platform) {
      return console.error("Cannot access current_platform");
    }

    // build message
    this.#navButtons(row);
    const embed = new EmbedBuilder()
      .setTitle(`${current_page_data["name"]} - Select Platform`)
      //.setDescription(current_page_data["deck"])
      .setURL(current_page_data["site_detail_url"])
      .addFields({ name: "Platform", value: current_platform["name"] })
      .setColor(0x79a475)
      .setFooter({ text: `${page} of ${max_length}` });

    this.#editMessage(client, embed, row);
  }

  async #editMessage(
    client: Client,
    embed: EmbedBuilder,
    row: ActionRowBuilder<ButtonBuilder>,
  ) {
    if (this.message_id && this.channel_id) {
      const channel = await client.channels.fetch(this.channel_id);
      if (channel?.isTextBased()) {
        const message = await channel.messages.fetch(this.message_id);
        message.edit({ embeds: [embed], components: [row] });
      }
    }
  }
  public async confirmRegion(
    client: Client,
    guild_id: string,
    page: number,
    select: boolean = false,
  ) {
    // initial checks / values
    this.search_object.method = "region";
    const platform = this.search_object.selected_platform;
    const platforms = this.search_object.selected_platforms;
    const selected = this.search_object.selected;
    const giantbomb_search = this.search_object.giantbomb_search;

    if (!platform || !platforms || !selected || !giantbomb_search || !page) {
      console.error("confirmRegion missing required params 505");
      return;
    }

    this.search_object.page = page;
    const current_page_game_data = giantbomb_search[selected - 1];
    if (!current_page_game_data) {
      console.error("confirmRegion missing current_page_game_data 513");
      return;
    }

    // shared message builder
    const row = new ActionRowBuilder<ButtonBuilder>();
    const embed = new EmbedBuilder()
      .setURL(current_page_game_data.site_detail_url)
      .setColor(0x79a475);

    function minimalNavBar() {
      row.components.push(
        new ButtonBuilder()
          .setCustomId("back_search")
          .setLabel("🡄 Back")
          .setStyle(ButtonStyle.Secondary),
      );
    }

    function releaseMessageFormating(game_release_date: GameReleaseDateObject) {
      const name = current_page_game_data?.name;
      let title = `${name} - Something went wrong!.`;
      let description = `${name} could not be added.`;
      let date_type = `Missing Date`;
      let released = false;

      const current_date = new Date();
      if (
        game_release_date.type == "release" ||
        game_release_date.type == "expected"
      ) {
        if (game_release_date.date) {
          const game_date = new Date(game_release_date.date);
          title = `${name} - Added`;
          if (game_date < current_date) {
            description = `${name} was added, this game is already out so you won't get any new messages about it.`;
            date_type = "Released Date";
            released = true;
          } else {
            description = `${name} was added, you will receive a message in your selected channel when it releases.`;
            date_type = "Expected Release Date";
          }
        }
      } else if (game_release_date.type == "TBA") {
        title = `${name} - Added as TBA`;
        description = `${name} was added as TBA (To Be Announced), you will receive a message in your selected channel when it receives an expected release date.`;
        date_type = "TBA";
      } else if (game_release_date.type == "missing") {
        title = `${name} - Added, with Warnings :warning:`;
        description = `${name} was added, however manual intervention is advised, could not accurately confirm date for desired platform, shown date should be verified.`;
        date_type = "Potential Release Date";
      }

      return {
        date: game_release_date.date,
        title: title,
        description: description,
        date_type: date_type,
        released_status: released,
      };
    }

    if (select) {
      console.log(page);
      const game_releases = this.search_object.game_releases;
      let region = undefined;
      if (game_releases) {
        region = game_releases[page - 1];
      }

      const game_messages = releaseMessageFormating(
        await GiantBombApi.gameReleaseDate(current_page_game_data, platform),
      );

      const date = new Date(game_messages.date);
      embed
        .setTitle(game_messages.title)
        .setDescription(game_messages.description);

      if (game_messages.date_type == "TBA") {
        embed.addFields({
          name: game_messages.date_type,
          value: "",
        });
        console.log(`${game_messages.date_type}: ${game_messages.date}`);
      } else if (game_messages.date) {
        embed.addFields({
          name: game_messages.date_type,
          value: date.toDateString(),
        });
        console.log(`${game_messages.date_type}: ${game_messages.date}`);
      }

      minimalNavBar();
      this.#editMessage(client, embed, row);
      // add game to db
      if (!current_page_game_data.id) {
        console.log("Missing Game ID 801");
        return;
      }
      if (!current_page_game_data.name) {
        console.log("Missing Game Name 801");
        return;
      }
      await Database.game(
        guild_id,
        current_page_game_data.id,
        "giantbomb",
        current_page_game_data.name,
        current_page_game_data.deck || "",
        current_page_game_data.site_detail_url || "giantbomb.com",
        current_page_game_data.image?.medium_url || Page.alt_picture,
        platform,
        game_messages.date,
        game_messages.released_status,
      );
      return;
    }

    // get avaliable releases for the desired platforms
    let game_releases: GameRelease[] = [];
    if (this.search_object.game_releases && page != 1) {
      game_releases = this.search_object.game_releases;
    } else {
      if (current_page_game_data?.id) {
        game_releases = await GiantBombApi.gameReleases(
          current_page_game_data?.id,
          platforms,
        );
        this.search_object.game_releases = game_releases;
      } else {
        console.log("Game missing id 528");
        return;
      }
    }
    // multiple game region release dates logic
    if (game_releases.length > 1) {
      const max_length = game_releases.length;
      this.search_object.max_length = max_length;
      const regions = game_releases[page - 1];

      if (!regions) {
        return console.error(
          "Missing regions when checking multiple releases? 540",
        );
      }

      console.log("Multiple Game Releases. Showing selection menu.");
      embed
        .setTitle(`${regions["name"]}`)
        .setFooter({ text: `${page} of ${max_length}` });

      if (regions["region"] && regions["region"]["name"]) {
        embed.addFields({ name: "Region", value: regions["region"]["name"] });
      }
      this.#navButtons(row);
      this.#editMessage(client, embed, row);
      return;
    } else {
      const game_messages = releaseMessageFormating(
        await GiantBombApi.gameReleaseDate(current_page_game_data, platform),
      );

      const date = new Date(game_messages.date);

      embed
        .setTitle(game_messages.title)
        .setDescription(game_messages.description);

      if (game_messages.date_type == "TBA") {
        embed.addFields({
          name: game_messages.date_type,
          value: "",
        });
        console.log(`${game_messages.date_type}: ${game_messages.date}`);
      } else if (game_messages.date) {
        embed.addFields({
          name: game_messages.date_type,
          value: date.toDateString(),
        });
        console.log(`${game_messages.date_type}: ${game_messages.date}`);
      }

      minimalNavBar();
      this.#editMessage(client, embed, row);
      // add game to database
      if (!current_page_game_data.id) {
        console.log("Missing Game ID 801");
        return;
      }
      if (!current_page_game_data.name) {
        console.log("Missing Game Name 801");
        return;
      }
      await Database.game(
        guild_id,
        current_page_game_data.id,
        "giantbomb",
        current_page_game_data.name,
        current_page_game_data.deck || "",
        current_page_game_data.site_detail_url || "giantbomb.com",
        current_page_game_data.image?.medium_url || Page.alt_picture,
        platform,
        game_messages.date,
        game_messages.released_status,
      );
      return;
    }
  }

  // back and next <> button
  public async changePage(
    client: Client,
    guild_id: string,
    page: number,
  ): Promise<void> {
    switch (this.search_object.method) {
      case "search": {
        this.search(page, client, guild_id);
        break;
      }
      case "platform": {
        this.confirmPlatform(client, guild_id, page);
        break;
      }
      case "region": {
        this.confirmRegion(client, guild_id, page);
        break;
      }
      case "games": {
        this.games(client, guild_id, page);
        break;
      }
    }
  }

  public static async updateGameDateModal(
    interaction: any,
    game_id: string,
    message_id: string | undefined = undefined,
  ): Promise<void> {
    const row = new ActionRowBuilder<ModalActionRowComponentBuilder>();

    const search_query = new TextInputBuilder()
      .setCustomId("game_date")
      .setLabel("Enter new date for game must be m/d/y format")
      .setValue("")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);
    const modal = new ModalBuilder().setTitle("Update Game Date");
    if (message_id) {
      modal.setCustomId(
        `update_game_date_modal:message-${message_id}:game-${game_id}`,
      );
    } else {
      modal.setCustomId(`update_game_date_modal:game-${game_id}`);
    }
    row.addComponents(search_query);
    modal.addComponents(row);

    await interaction.showModal(modal);
  }

  public static async selectGameModal(
    interaction: any,
    message_id: string | undefined = undefined,
  ): Promise<void> {
    const row = new ActionRowBuilder<ModalActionRowComponentBuilder>();

    const search_query = new TextInputBuilder()
      .setCustomId("selected_game")
      .setLabel("Select an added game based off its name.")
      .setValue("")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);
    const modal = new ModalBuilder().setTitle("Select Game");
    if (message_id) {
      modal.setCustomId(`select_game_modal:message-${message_id}`);
    } else {
      modal.setCustomId("select_game_modal");
    }
    row.addComponents(search_query);
    modal.addComponents(row);

    await interaction.showModal(modal);
  }

  public static async searchModal(
    interaction: any,
    message_id: string | undefined = undefined,
  ): Promise<void> {
    const row = new ActionRowBuilder<ModalActionRowComponentBuilder>();

    const search_query = new TextInputBuilder()
      .setCustomId("search_query")
      .setLabel("Search for a game to add.")
      .setValue("")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);
    const modal = new ModalBuilder().setTitle("Search");
    if (message_id) {
      modal.setCustomId(`search_modal:message-${message_id}`);
    } else {
      modal.setCustomId("search_modal");
    }
    row.addComponents(search_query);
    modal.addComponents(row);

    await interaction.showModal(modal);
  }

  public setIds(message_id: string, channel_id: string): void {
    if (!this.message_id) {
      this.message_id = message_id;
    }
    if (!this.channel_id) {
      this.channel_id = channel_id;
    }
  }
}
