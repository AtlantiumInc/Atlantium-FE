/**
 * markets.ts — one codebase, many cities.
 *
 * Everything downstream of ingest (extraction, salary estimates, logos, OG
 * cards, snapshots) is market-agnostic. The only city-specific things are the
 * geography we ask hiring.cafe for and the label we show. A deployment picks
 * its market with the MARKET env var; the default keeps Atlantium's behaviour
 * byte-identical to what shipped.
 */
export type MarketId = "atlanta" | "denver";

export type Market = {
  id: MarketId;
  /** Display name for cards, digests and OG art. */
  label: string;
  /** Metro shown under a job when the feed gives us nothing better. */
  defaultLocation: string;
  /** hiring.cafe location objects: the metro + remote-in-state. */
  locations: unknown[];
};

/** hiring.cafe derives a location's id from `${formatted_address}${type}`. */
function locality(city: string, state: string, code: string, lat: number, lon: number, population: number) {
  return {
    id: `${city}, ${code}, USlocality`,
    types: ["locality"],
    address_components: [
      { long_name: city, short_name: city, types: ["locality"] },
      { long_name: state, short_name: code, types: ["administrative_area_level_1"] },
      { long_name: "United States", short_name: "US", types: ["country"] },
    ],
    geometry: { location: { lat, lon } },
    formatted_address: `${city}, ${code}, US`,
    population,
    workplace_types: [],
    options: { radius: 50, radius_unit: "miles", ignore_radius: false },
  };
}

function remoteInState(state: string, code: string) {
  return {
    types: ["administrative_area_level_1"],
    formatted_address: `${state}, United States`,
    address_components: [
      { long_name: state, short_name: code, types: ["administrative_area_level_1"] },
      { long_name: "United States", short_name: "US", types: ["country"] },
    ],
    workplace_types: ["Remote"],
    options: {},
    id: `${state}, United Statesadministrative_area_level_1`,
  };
}

export const MARKETS: Record<MarketId, Market> = {
  atlanta: {
    id: "atlanta",
    label: "Atlanta",
    defaultLocation: "Atlanta, Georgia, United States",
    // Preserved verbatim from the original sync — this id came from
    // hiring.cafe's own autocomplete and is known-good, so it is NOT
    // regenerated from the helper.
    locations: [
      {
        id: "xhk1yZQBoEtHp_8Ur67o",
        types: ["locality"],
        address_components: [
          { long_name: "Atlanta", short_name: "Atlanta", types: ["locality"] },
          { long_name: "Georgia", short_name: "GA", types: ["administrative_area_level_1"] },
          { long_name: "United States", short_name: "US", types: ["country"] },
        ],
        geometry: { location: { lat: 33.749, lon: -84.38798 } },
        formatted_address: "Atlanta, GA, US",
        population: 463878,
        workplace_types: [],
        options: { radius: 50, radius_unit: "miles", ignore_radius: false },
      },
      remoteInState("Georgia", "GA"),
    ],
  },
  denver: {
    id: "denver",
    label: "Denver",
    defaultLocation: "Denver, Colorado, United States",
    locations: [
      locality("Denver", "Colorado", "CO", 39.7392, -104.9903, 715522),
      remoteInState("Colorado", "CO"),
    ],
  },
};

/** Resolve the deployment's market; unset or unknown falls back to Atlanta. */
export function activeMarket(env: { MARKET?: string }): Market {
  const id = (env.MARKET ?? "atlanta").toLowerCase() as MarketId;
  return MARKETS[id] ?? MARKETS.atlanta;
}
