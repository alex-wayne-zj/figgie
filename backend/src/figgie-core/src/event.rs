use crate::types::{Suit, Player, Quote};

#[derive(Clone, Debug)]
pub enum Event {
    TradeExecuted {
        buyer: String,
        seller: String,
        suit: Suit,
        price: u32,
    },
    QuoteCanceled {
        quote: Quote,
    },
    QuotePlaced {
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

impl Event {
    pub fn target_player(&self) -> Option<&String> {
        match self {
            Event::RoundStarted { player, .. } => Some(&player.info.id),
            _ => None, 
        }
    }
}