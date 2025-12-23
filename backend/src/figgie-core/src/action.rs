use crate::types::Quote;

#[derive(Clone, Debug)]
pub enum Action {
    // 参数为轮次
    StartRound(u32),
    PlaceQuote(Quote),
    CancelQuote(Quote),
    EndRound,
    EndGame
}
