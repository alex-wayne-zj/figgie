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