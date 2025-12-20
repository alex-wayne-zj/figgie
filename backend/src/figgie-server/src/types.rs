use serde::Deserialize;
use figgie_core::{Action, Quote, Suit, Side};

#[derive(Debug, Deserialize)]
pub struct StartGameRequest {
    pub room_name: String,
    pub room_id: String,
    pub players: Vec<PlayerInfo>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct PlayerInfo {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct NewRoundRequest {
    pub round_id: u32,
    pub room_id: String
}

#[derive(Debug, Deserialize)]
pub struct EndRoundRequest {
    pub room_id: String
}

#[derive(Debug, Deserialize)]
pub struct EndGameRequest {
    pub room_id: String,
    pub player_id: String
}


#[derive(Debug, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum ActionView {
    PlaceQuote {
        id: String,
        suit: String,
        side: String,
        price: u32,
    },
    CancelQuote {
        id: String,
        suit: String,
        side: String,
        price: u32,
    },
}

use std::convert::TryFrom;

impl TryFrom<ActionView> for Action {
    type Error = &'static str;

    fn try_from(view: ActionView) -> Result<Self, Self::Error> {
        match view {
            ActionView::PlaceQuote { id, suit, side, price } => {
                let suit = Suit::from_str(&suit)?;
                let side = Side::from_str(&side)?;

                Ok(Action::PlaceQuote(Quote {
                    player_id: id,
                    suit,
                    side,
                    price,
                }))
            }

            ActionView::CancelQuote { id, suit, side, price } => {
                let suit = Suit::from_str(&suit)?;
                let side = Side::from_str(&side)?;

                Ok(Action::CancelQuote(Quote {
                    player_id: id,
                    suit,
                    side,
                    price,
                }))
            }
        }
    }
}
