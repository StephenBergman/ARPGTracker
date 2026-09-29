export interface EconomySnapshot {
  hour: number;
  capturedAt: string;
  league: string;
  chaosPerDivine: number;
  chaosPerDivineLow: number;
  chaosPerDivineHigh: number;
  chaosVolume: number;
  divineVolume: number;
  quotes: EconomyQuote[];
}

export interface EconomyQuote {
  id: string;
  label: string;
  baseLabel: string;
  value: number;
  low: number;
  high: number;
  volume: number;
}

export interface CurrencyExchangeMarket {
  league: string;
  market_id: string;
  market_pair: [string, string];
  volume_traded: Record<string, number>;
  lowest_ratio: Record<string, number>;
  highest_ratio: Record<string, number>;
}

export interface CurrencyExchangeResponse {
  next_change_id: number;
  markets: CurrencyExchangeMarket[];
}
