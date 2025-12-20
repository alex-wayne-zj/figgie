pub type PlayerId = String;

#[derive(Clone, Copy, Debug, Eq, PartialEq, Hash)]
pub enum Suit {
    Spade,
    Heart,
    Diamond,
    Club,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Side {
    Bid,
    Offer,
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