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
    QuotesCanceled {
        player: PlayerId,
    },
    QuotePlaced {
        player: PlayerId,
        quote: Quote,
    },
    RoundStarted {
        round_id: u8,
        server_time: u64,
    },
    DealCards {
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