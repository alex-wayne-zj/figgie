use serde_json::{json, Map, Value};
use figgie_core::{Hand, Event};

pub fn hand_to_json(hand: &Hand) -> Value {
    let mut obj = Map::new();

    for (suit, count) in &hand.cards {
        obj.insert(suit.to_string(), json!(count));
    }

    Value::Object(obj)
}

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

        Event::QuoteCanceled{quote} => json!({
            "type": "QuoteCanceled",
            "payload": {
                "quote": {
                    "player_id": quote.player_id.to_string(),
                    "suit": quote.suit.to_string(),
                    "side": quote.side.to_string(),
                    "price": quote.price,
                }
            }
        }),

        Event::QuotePlaced {quote } => json!({
            "type": "QuotePlaced",
            "payload": {
                "quote": {
                    "player_id": quote.player_id.to_string(),
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