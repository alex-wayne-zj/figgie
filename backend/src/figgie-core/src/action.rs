use crate::types::*;

#[derive(Clone, Debug)]
pub struct Quote {
    pub player_id: PlayerId,
    pub suit: Suit,
    pub side: Side,
    pub price: u32,
}

// Player 产生 Action，Engine 实际执行 Action
// Bot 可以选择执行 Action::NoOp
#[derive(Clone, Debug)]
pub enum Action {
    // Start,
    PlaceQuote(Quote),
    CancelQuote(Quote),
    // NoOp,
}

pub fn find_matching_quote(
    quotes: &[Quote],
    new_quote: &Quote,
) -> Option<usize> {
    quotes.iter().position(|q|
        q.player_id != new_quote.player_id &&
        q.suit == new_quote.suit &&
        q.price == new_quote.price &&
        q.side != new_quote.side
    )
}
