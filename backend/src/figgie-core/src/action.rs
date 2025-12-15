use crate::types::*;

#[derive(Clone, Debug)]
pub struct Quote {
    pub suit: Suit,
    pub side: Side,
    pub price: u32,
}

// Player 产生 Action，Engine 实际执行 Action
// Bot 可以选择执行 Action::NoOp
#[derive(Clone, Debug)]
pub enum Action {
    PlaceQuote(Quote),
    CancelAll,
    NoOp,
}
