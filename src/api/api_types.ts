import GiantBombApi from "./giantbomb_api";
// common types
type id = number;
type uuid = string;
type unix_datetime = number;

// GiantBomb -> Gb
export type Platforms =
  (typeof GiantBombApi.platforms)[keyof typeof GiantBombApi.platforms];
export interface GiantbombPlatformValues {
  [key: string]: number;
}

export interface GlobalsDatabaseObj {
  id: number;
  last_checked_date: string;
}

export interface SettingsDatabaseObj {
  id: number;
  server_id: number;
  channel_id: string;
  platforms: string;
}

export interface GameDatabaseObj {
  id: number;
  server_id: string;
  game_id: number;
  api_type: string;
  name: string;
  description: string;
  detail_url: string;
  image_url: string;
  platform: number;
  release_date: string;
  released_status: boolean;
}

export interface ApiResultsBase {
  error: string;
  limit: number;
  offest: number;
  number_of_page_results: number;
  number_of_total_results: number;
  status_code: number;
  version?: string;
}

export interface GameReleaseDateObject {
  date: string;
  type: string;
}

export interface GameImages {
  icon_url: string | null;
  medium_url: string | null;
  screen_url: string | null;
  screen_large_url: string | null;
  small_url: string | null;
  super_url: string | null;
  thumb_url: string | null;
  tiny_url: string | null;
  original_url: string | null;
  image_tags: string | null;
}
export interface ImageTags {
  api_detail_url: string | null;
  name: string | null;
  total: number | null;
}
export interface OriginalGameRatings {
  api_detail_url: string | null;
  id: number | null;
  name: string | null;
}
export interface GamePlatforms {
  api_detail_url: string | null;
  id: number;
  name: string;
  site_detail_url: string | null;
  abbreviation: string | null;
}
export interface GameSearchResult {
  aliases: string | null;
  api_detail_url: string | null;
  date_added: string | null;
  date_last_updated: string | null;
  deck: string | null;
  description: string | null;
  expected_release_day: string | null;
  expected_release_month: string | null;
  expected_release_quarter: string | null;
  expected_release_year: string | null;
  guid: string | null;
  id: number | null;
  image: GameImages | null;
  image_tags: ImageTags[] | null;
  name: string | null;
  number_of_user_reviews: number | null;
  original_game_rating: OriginalGameRatings[] | null;
  original_release_date: string | null;
  platforms: GamePlatforms[] | null;
  site_detail_url: string | null;
  resource_type: string | null;
}
export interface ApiGameSearchResults extends ApiResultsBase {
  results: GameSearchResult[] | [];
}

export interface ApiGameSearchResult extends ApiResultsBase {
  results: GameSearchResult;
}

export interface ReleasePlatform {
  api_detail_url: string | null;
  id: number | null;
  name: string | null;
}
export interface ReleaseRegion {
  api_detail_url: string | null;
  id: number | null;
  name: string | null;
}
export interface GameRelease {
  guid: string | null;
  id: number | null;
  name: string | null;
  platform: ReleasePlatform | null;
  region: ReleaseRegion | null;
  release_date: string | null;
}
export interface ApiGameReleasesResults extends ApiResultsBase {
  results: GameRelease[] | [];
}

//igdb
export interface IgdbAuth {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
}

export interface IgdbSearchGame {
  id?: id;
  age_ratings?: id[];
  aggregated_rating?: number;
  aggregated_rating_count?: number;
  artworks?: id[];
  bundles?: id[];
  category?: id;
  checksum?: uuid;
  collection?: id;
  cover?: id;
  created_at?: unix_datetime;
  dlcs?: id[];
  expanded_games?: id[];
  expansions?: id[];
  external_games?: id[];
  first_release_date: unix_datetime;
  follows?: number;
  forks?: id[];
  franchise?: id;
  franchises?: id[];
  game_engines?: id[];
  game_localizations?: id[];
  game_modes?: id[];
  genres?: id[];
  hypes: number;
  involved_companies?: id[];
  keywords?: id[];
  language_supports?: id[];
  multiplayer_modes?: id[];
  name?: string;
  parent_game?: id;
  platforms?: id[];
  player_perspectives: id[];
  ports?: id[];
  rating?: number;
  rating_count?: number;
  release_dates?: id[];
  remakes?: id[];
  remasters?: id[];
  screenshots?: id[];
  similar_games?: id[];
  slug?: string;
  standalone_expansions?: id[];
  status?: id;
  storyline?: string;
  summary?: string;
  tags?: id[];
  themes?: id[];
  total_rating?: number;
  total_rating_count?: number;
  updated_at?: unix_datetime;
  url?: string;
  version_parent?: id;
  version_title?: string;
  videos?: id[];
  websites?: id[];
}

export interface IgdbGameCover {
  alpha_channel?: boolean;
  animated?: boolean;
  checksum?: string;
  game?: number;
  game_localization?: number;
  height?: number;
  image_id?: string;
  url?: string;
  width?: number;
}

export interface IgdbGame {
  game: IgdbSearchGame;
  cover: IgdbGameCover;
}
