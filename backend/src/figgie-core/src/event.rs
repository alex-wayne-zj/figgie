use crate::hand_to_json;
use crate::types::{PlayerId, Suit};
use crate::state::Player;
use crate::action::Quote;

#[derive(Clone, Debug)]
pub enum Event {
    TradeExecuted {
        buyer: PlayerId,
        seller: PlayerId,
        suit: Suit,
        price: u32,
    },
    QuoteCanceled {
        player: PlayerId,
        quote: Quote,
    },
    QuotePlaced {
        player: PlayerId,
        quote: Quote,
    },
    RoundStarted {
        round_id: u8,
        server_time: u64,
        player: Player,
    },
    RoundEnded {
        round_id: u8,
        players: Vec<Player>,
        server_time: u64,
        goal_suit: Suit,
    },
    GameEnded {
        players: Vec<Player>,
    },
}

use serde_json::{json, Value};

pub fn event_to_json(event: &Event) -> Value {
    match event {
        Event::TradeExecuted {
            buyer,
            seller,
            suit,
            price,
        } => json!({
            "type": "TradeExecuted",
            "payload": {
                "buyer": buyer.to_string(),
                "seller": seller.to_string(),
                "suit": suit.to_string(),
                "price": price
            }
        }),

        Event::QuoteCanceled{player, quote} => json!({
            "type": "QuoteCanceled",
            "payload": {
                "player": player.to_string(),
                "quote": {
                    "suit": quote.suit.to_string(),
                    "side": quote.side.to_string(),
                    "price": quote.price,
                }
            }
        }),

        Event::QuotePlaced { player, quote } => json!({
            "type": "QuotePlaced",
            "payload": {
                "player": player.to_string(),
                "quote": {
                    "suit": quote.suit.to_string(),
                    "side": quote.side.to_string(),
                    "price": quote.price
                }
            }
        }),

        Event::RoundStarted {
            round_id,
            server_time,
            player,
        } => json!({
            "type": "RoundStarted",
            "payload": {
                "round_id": round_id,
                "server_time": server_time,
                "player": {
                    "info": {
                        "id": player.info.id.to_string(),
                        "name": player.info.name.to_string()
                    },
                    "cash": player.cash,
                    "hand": hand_to_json(&player.hand)
                }
            }
        }),

        Event::RoundEnded {
            round_id,
            players,
            server_time,
            goal_suit,
        } => json!({
            "type": "RoundEnded",
            "payload": {
                "round_id": round_id,
                "server_time": server_time,
                "goal_suit": goal_suit.to_string(),
                "players": players.iter().map(|player| {
                    json!({
                        "info": {
                            "id": player.info.id.to_string(),
                            "name": player.info.name.to_string()
                        },
                        "cash": player.cash,
                        "hand": hand_to_json(&player.hand)
                    })
                }).collect::<Vec<_>>()
            }
        }),

        Event::GameEnded { players } => json!({
            "type": "GameEnded",
            "payload": {
                "players": players.iter().map(|player| {
                    json!({
                        "info": {
                            "id": player.info.id.to_string(),
                            "name": player.info.name.to_string()
                        },
                        "cash": player.cash,
                        "hand": hand_to_json(&player.hand)
                    })
                }).collect::<Vec<_>>()
            }
        }),
    }
}


impl Event {
    pub fn target_player(&self) -> Option<&PlayerId> {
        match self {
            Event::RoundStarted { player, .. } => Some(&player.info.id),
            _ => None, // 其余全部群发
        }
    }
}