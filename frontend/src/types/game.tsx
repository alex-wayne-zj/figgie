export type Suit = "Spade" | "Club" | "Diamond" | "Heart";

export type Side = "Bid" | "Offer";

export const SUITS: { suit: Suit; label: string }[] = [
  { suit: "Spade", label: "♠"},
  { suit: "Club", label: "♣"},
  { suit: "Diamond", label: "♦"},
  { suit: "Heart", label: "♥"},
];

export function suitToSymbol(suit: Suit) {
  switch (suit) {
    case 'Spade': return '♠';
    case 'Heart': return '♥';
    case 'Diamond': return '♦';
    case 'Club': return '♣';
    default: return '?';
  }
}

// 所有玩家各自在对局中的状态
export type PlayerState = {
  id: string;
  name: string;
  totalCards: number;
  cash: number;
  // 顺序固定：Spade, Club, Diamond, Heart
  suitDeltas: number[];
  color: string;
};

export type RoundEndedPlayerState = { 
  id: string; 
  name: string; 
  totalCards: number; 
  suitDeltas: number[]; 
  color: string;
  cash: number; 
  hand: Hand;   
};

// 当前玩家的初始手牌（后续可从后端填充真实数据）
export type PlayerCards = Record<Suit, number>;

export type SuitPrice = {
  buyer: string;
  bid: number;
  seller: string
  ask: number
};

export interface PlayerInfo {
  id: string;
  name: string;
}

export interface Hand {
  Spade: number;
  Club: number;
  Diamond: number;
  Heart: number;
}

export interface Player {
  info: PlayerInfo;
  cash: number;
  hand: Hand;
}

export interface Quote {
  suit: Suit;
  side: Side;
  price: number;
}

export type Action =
  | { type: "PlaceQuote"; payload: {id: string; suit: Suit; side: Side; price: number} }
  | { type: "CancelQuote"; payload: {id: string; suit: Suit; side: Side; price: number} }
  | { type: "StartRound"; payload: {round_id: number; room_id: string} }
  | { type: "EndRound"; payload: {round_id: number; room_id: string} }
  | { type: "EndGame"; payload: {round_id: number; room_id: string; player_id: string} }

export interface TradeExecutedPayload {
  buyer: string;
  seller: string;
  suit: Suit;
  price: number;
}

export interface QuoteCanceledPayload {
  player: string;
  quote: Quote;
}

export interface QuotePlacedPayload {
  player: string;
  quote: Quote;
}

export interface RoundStartedPayload {
  round_id: number;
  server_time: number;
  player: Player;
}

export interface RoundEndedPayload {
  round_id: number;
  server_time: number;
  goal_suit: Suit;
  players: Player[];
}

export interface GameEndedPayload {
  players: Player[];
}

export type Event =
  | { type: "TradeExecuted"; payload: TradeExecutedPayload }
  | { type: "QuoteCanceled"; payload: QuoteCanceledPayload }
  | { type: "QuotePlaced"; payload: QuotePlacedPayload }
  | { type: "RoundStarted"; payload: RoundStartedPayload }
  | { type: "RoundEnded"; payload: RoundEndedPayload }
  | { type: "GameEnded"; payload: GameEndedPayload }