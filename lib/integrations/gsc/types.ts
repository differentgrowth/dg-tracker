/**
 * Typed shapes for the slice of the Google Search Console API we use.
 * Keep these confined to the integration boundary; do not leak past services.
 */

export interface SiteEntry {
  permissionLevel:
    | "siteFullUser"
    | "siteOwner"
    | "siteRestrictedUser"
    | "siteUnverifiedUser";
  siteUrl: string;
}

export interface SitesListResponse {
  siteEntry?: SiteEntry[];
}

export type SearchAnalyticsDimension =
  | "country"
  | "date"
  | "device"
  | "page"
  | "query"
  | "searchAppearance";

export interface SearchAnalyticsDimensionFilter {
  dimension: SearchAnalyticsDimension;
  expression: string;
  operator?: "contains" | "equals" | "notContains" | "notEquals";
}

export interface SearchAnalyticsDimensionFilterGroup {
  filters: SearchAnalyticsDimensionFilter[];
  groupType?: "and";
}

export interface SearchAnalyticsRequest {
  dataState?: "all" | "final";
  dimensionFilterGroups?: SearchAnalyticsDimensionFilterGroup[];
  dimensions?: SearchAnalyticsDimension[];
  endDate: string; // YYYY-MM-DD
  rowLimit?: number;
  startDate: string; // YYYY-MM-DD
  startRow?: number;
  type?: "discover" | "googleNews" | "image" | "news" | "video" | "web";
}

export interface SearchAnalyticsRow {
  clicks: number;
  ctr: number;
  impressions: number;
  keys: string[]; // values follow the order of `dimensions` in the request
  position: number;
}

export interface SearchAnalyticsResponse {
  rows?: SearchAnalyticsRow[];
}

export interface OAuthTokenResponse {
  access_token: string;
  expires_in: number;
  id_token?: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
}
