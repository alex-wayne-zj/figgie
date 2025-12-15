use crate::types::*;
use crate::action::*;
use std::collections::HashMap;

#[derive(Clone, Debug, Default)]
pub struct Hand {
    pub cards: HashMap<Suit, u8>,
}

#[derive(Clone, Debug)]
pub struct Player {
    pub id: PlayerId,
    pub name: String,
    pub hand: Hand,
    pub cash: i32,
}

#[derive(Clone, Debug)]
pub struct GameState {
    pub players: Vec<Player>,
    pub quotes: Vec<(PlayerId, Quote)>,
}
