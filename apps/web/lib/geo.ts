// apps/web/lib/geo.ts
//
// T137 Batch 6b (2026-07-23): country / state / city lists for the structured
// brand location on the Settings page.
//
// US and Canada only for now. Values are the 2-letter codes that go into
// `brands.state`; labels are the full names shown in the dropdown. Adding a
// country later means adding a list here and one entry to COUNTRIES, nothing
// in the database (the columns are plain text).
//
// The display string on the public brand page is `brands.location`, derived on
// save by deriveLocation() below. See the migration
// 20260723000091_brands_structured_location.sql for the full contract.

export type CountryCode = "US" | "CA";

export interface Region {
  code: string;
  name: string;
}

export const COUNTRIES: Array<{ code: CountryCode; name: string }> = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
];

export const US_STATES: Region[] = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "PR", name: "Puerto Rico" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];

export const CA_PROVINCES: Region[] = [
  { code: "AB", name: "Alberta" },
  { code: "BC", name: "British Columbia" },
  { code: "MB", name: "Manitoba" },
  { code: "NB", name: "New Brunswick" },
  { code: "NL", name: "Newfoundland and Labrador" },
  { code: "NT", name: "Northwest Territories" },
  { code: "NS", name: "Nova Scotia" },
  { code: "NU", name: "Nunavut" },
  { code: "ON", name: "Ontario" },
  { code: "PE", name: "Prince Edward Island" },
  { code: "QC", name: "Quebec" },
  { code: "SK", name: "Saskatchewan" },
  { code: "YT", name: "Yukon" },
];

/** Regions for a country. Unknown or unset country falls back to US states. */
export function regionsFor(country: string): Region[] {
  return country === "CA" ? CA_PROVINCES : US_STATES;
}

/** "State" in the US, "Province" in Canada. */
export function regionLabel(country: string): string {
  return country === "CA" ? "Province" : "State";
}

/**
 * The single derivation of `brands.location` from the structured parts.
 * "Los Angeles, CA", or just the one part that is set, or "" when neither is.
 * Any writer that touches state/city must call this in the same update.
 */
export function deriveLocation(city: string, state: string): string {
  return [city.trim(), state.trim()].filter(Boolean).join(", ");
}
