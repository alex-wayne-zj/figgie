use serde::Deserialize;
use figgie_core::{Action, Quote, Suit, Side};

#[derive(Debug, Deserialize, Clone)]
pub struct PlayerInfo {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct StartGameRequest {
    pub room_name: String,
    pub room_id: String,
    pub players: Vec<PlayerInfo>,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum ActionView {
    PlaceQuote {
        player_id: String,
        suit: String,
        side: String,
        price: u32,
    },
    CancelQuote {
        player_id: String,
        suit: String,
        side: String,
        price: u32,
    },
    StartRound {
        round_id: u32,
        room_id: String,
    },
    EndRound {
        round_id: u32,
        room_id: String,
    },
    EndGame {
        round_id: u32,
        room_id: String,
        player_id: String,
    }
}

use std::convert::TryFrom;

impl TryFrom<ActionView> for Action {
    type Error = &'static str;

    fn try_from(view: ActionView) -> Result<Self, Self::Error> {
        match view {
            ActionView::PlaceQuote { player_id, suit, side, price } => {
                let suit = Suit::from_str(&suit)?;
                let side = Side::from_str(&side)?;

                Ok(Action::PlaceQuote(Quote {
                    player_id: player_id,
                    suit,
                    side,
                    price,
                }))
            }

            ActionView::CancelQuote { player_id, suit, side, price } => {
                let suit = Suit::from_str(&suit)?;
                let side = Side::from_str(&side)?;

                Ok(Action::CancelQuote(Quote {
                    player_id: player_id,
                    suit,
                    side,
                    price,
                }))
            }

            ActionView::EndGame { round_id, room_id, player_id } => {
                Ok(Action::EndGame)
            }

            ActionView::EndRound { round_id, room_id } => {
                Ok(Action::EndRound)
            }

            ActionView::StartRound { round_id, room_id } => {
                Ok(Action::StartRound(round_id))
            }
        }
    }
}
