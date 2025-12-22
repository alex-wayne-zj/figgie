use std::collections::HashMap;

#[derive(Clone, Debug)]
pub struct Info {
    pub id: String,
    pub name: String,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Hash)]
pub enum Suit {
    Spade,
    Heart,
    Diamond,
    Club,
}

#[derive(Clone, Debug, Default)]
pub struct Hand {
    pub cards: HashMap<Suit, u8>,
}

#[derive(Clone, Debug)]
pub struct Player {
    pub info: Info,
    pub hand: Hand,
    pub cash: i32,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Side {
    Bid,
    Offer,
}

#[derive(Clone, Debug)]
pub struct Quote {
    pub player_id: String,
    pub suit: Suit,
    pub side: Side,
    pub price: u32,
}

#[derive(Clone, Debug)]
pub struct GameState {
    pub players: Vec<Player>,
    pub quotes: Vec<Quote>,
}

use std::fmt;

impl fmt::Display for Suit {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Suit::Spade => "Spade",
            Suit::Heart => "Heart",
            Suit::Diamond => "Diamond",
            Suit::Club => "Club",
        };
        write!(f, "{s}")
    }
}

impl fmt::Display for Side {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Side::Bid => "Bid",
            Side::Offer => "Offer"
        };
        write!(f, "{s}")
    }
}

impl Suit {
    pub fn from_str(s: &str) -> Result<Self, &'static str> {
        match s {
            "Spade" => Ok(Suit::Spade),
            "Heart" => Ok(Suit::Heart),
            "Diamond" => Ok(Suit::Diamond),
            "Club" => Ok(Suit::Club),
            _ => Err("invalid suit"),
        }
    }
}

impl Side {
    pub fn from_str(s: &str) -> Result<Self, &'static str> {
        match s {
            "Bid" => Ok(Side::Bid),
            "Offer" => Ok(Side::Offer),
            _ => Err("invalid side"),
        }
    }
}