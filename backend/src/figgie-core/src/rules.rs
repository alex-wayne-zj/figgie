use crate::{state::GameState, action::{Action, Quote}};
use crate::types::{Suit, Side, PlayerId};

/// 一些可调整的限制常量
const MAX_QUOTE_PRICE: u32 = 100;
const MIN_QUOTE_PRICE: u32 = 1;

/// 获取玩家当前持有某花色的手牌数
fn player_suit_count(state: &GameState, player: PlayerId, suit: Suit) -> u8 {
    state.players
        .iter()
        .find(|p| p.info.id == player)
        .and_then(|p| p.hand.cards.get(&suit).copied())
        .unwrap_or(0)
}

pub fn is_action_legal(
    state: &GameState,
    player: String,
    action: &Action,
) -> bool {
    match action {
        Action::PlaceQuote(q) => {
            if q.price < MIN_QUOTE_PRICE || q.price > MAX_QUOTE_PRICE {
                return false;
            }

            if q.side == Side::Offer {
                // 卖出时，保证手里有对应 suit 的牌即可
                if player_suit_count(state, player, q.suit) == 0 {
                    return false; // 没有要卖出的牌
                }
            }

            true
        }
        Action::CancelAll => {
            // 允许任何玩家随时撤销自己的所有挂单
            true
        }
        Action::NoOp => true,
    }
}
