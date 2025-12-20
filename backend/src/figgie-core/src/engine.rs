use crate::state::{GameState, Player, Info, Hand};
use crate::types::*;
use crate::action::*;
use crate::event::*;
use crate::rules::*;
use std::collections::HashMap;
use rand;
use rand::seq::SliceRandom;

pub static CARD_VALUE_PER_GOAL_SUIT: i32 = 10;

#[derive(Clone, Debug)]
pub struct GameConfig {
    pub room_name: String,
    pub room_id: String,
    pub players: Vec<Info>,
    pub starting_cash: u32,
    pub ante_amount: u32,
    pub pot: u32,
    pub trading_duration_secs: u32,
}

#[derive(Debug)]
pub struct Game {
    pub round: u32,
    pub game_config: GameConfig,
    pub common_suit: Suit,
    pub goal_suit: Suit,
    pub state: GameState,
}

impl Game {
    pub fn new(config: GameConfig) -> Self {

        let suits = [Suit::Spade, Suit::Heart, Suit::Diamond, Suit::Club];
        let mut rng = rand::thread_rng();

        // 随机分配 suit 长度：哪两个10, 哪个8, 哪个12
        let mut suit_types = vec![10u8, 10u8, 8u8, 12u8];
        suit_types.shuffle(&mut rng);
        let mut suit_card_counts = HashMap::new();
        for (s, n) in suits.iter().zip(suit_types.iter()) {
            suit_card_counts.insert(*s, *n);
        }

        // 找到12张的作为common
        // let (&common_suit, _) = suit_card_counts.iter().find(|(_, &num)| num == 12).unwrap();
        let common_suit = suit_card_counts
            .iter()
            .find(|(_, num)| **num == 12)
            .map(|(suit, _)| *suit)
            .unwrap();

        // goal suit：与common同色的另一花色
        fn is_red(s: Suit) -> bool {
            matches!(s, Suit::Heart | Suit::Diamond)
        }
        fn is_black(s: Suit) -> bool {
            matches!(s, Suit::Spade | Suit::Club)
        }
        let goal_suit = suits
            .iter()
            .filter(|&&s| {
                s != common_suit &&
                ((is_red(s) && is_red(common_suit)) || (is_black(s) && is_black(common_suit)))
            })
            .next()
            .copied()
            .unwrap();

        // 构建40牌
        let mut deck: Vec<Suit> = Vec::with_capacity(40);
        for (suit, count) in &suit_card_counts {
            for _ in 0..*count {
                deck.push(*suit);
            }
        }
        deck.shuffle(&mut rng);

        // 玩家初始化
        let num_players = config.players.len();
        let mut players: Vec<Player> = Vec::with_capacity(num_players);
        for info in config.players.clone() {
            players.push(Player {
                info: Info{ id: info.id, name: info.name},
                cash: (config.starting_cash - config.ante_amount) as i32,
                hand: Hand { cards: HashMap::new() },
            });
        }

        // 发牌：把40张平均分配
        for (i, suit) in deck.iter().enumerate() {
            let pidx = i % num_players;
            let player = &mut players[pidx];
            *player.hand.cards.entry(*suit).or_insert(0) += 1;
        }

        Game {
            round: 1,
            game_config: config,
            common_suit: common_suit,
            goal_suit: goal_suit,
            state: GameState {
                players,
                quotes: vec![]
            }
        }
    }

    pub fn handle_action(&mut self, action: Action) -> Vec<Event> {
        let player_id = match &action {
            Action::PlaceQuote(q) => &q.player_id,
            Action::CancelQuote(q) => &q.player_id,
        };

        if !is_action_legal(&self.state, player_id.to_string(), &action) {
            return vec![];
        }

        match action {
            Action::PlaceQuote(quote) => {
                // 2️⃣ 尝试撮合
                if let Some(idx) = find_matching_quote(&self.state.quotes, &quote) {
                    let matched = self.state.quotes.remove(idx);

                    let (buyer, seller) = match quote.side {
                        Side::Bid => (quote.player_id.clone(), matched.player_id.clone()),
                        Side::Offer => (matched.player_id.clone(), quote.player_id.clone()),
                    };

                    self.apply_trade(&buyer, &seller, quote.suit, quote.price);

                    return vec![Event::TradeExecuted {
                        buyer,
                        seller,
                        suit: quote.suit,
                        price: quote.price,
                    }];
                }

                // 3️⃣ 没有撮合，检查是否替换现有 quote
                let mut replaced = false;
                self.state.quotes.retain(|q| {
                    if q.suit == quote.suit && q.side == quote.side {
                        let should_replace = match quote.side {
                            Side::Bid => quote.price > q.price,
                            Side::Offer => quote.price < q.price,
                        };
                        if should_replace {
                            replaced = true;
                            false // 移除旧的
                        } else {
                            true // 保留旧的
                        }
                    } else {
                        true // 保留不冲突的
                    }
                });

                if replaced || !self.state.quotes.iter().any(|q| q.suit == quote.suit && q.side == quote.side) {
                    self.state.quotes.push(quote.clone());
                    println!("Engine receive the action: {:?}", quote.clone());
                    vec![Event::QuotePlaced {
                        player: quote.player_id.clone(),
                        quote,
                    }]
                } else {
                    // 没有添加或替换，不返回事件
                    vec![]
                }
            }

            Action::CancelQuote(quote) => {
                let before = self.state.quotes.len();

                self.state.quotes.retain(|q| {
                    !(q.player_id == quote.player_id &&
                      q.suit == quote.suit &&
                      q.side == quote.side &&
                      q.price == quote.price)
                });

                if self.state.quotes.len() == before {
                    return vec![];
                }

                vec![Event::QuoteCanceled {
                    player: quote.player_id.clone(),
                    quote,
                }]
            }
        }
        
    }

    fn apply_trade(
        &mut self,
        buyer_id: &PlayerId,
        seller_id: &PlayerId,
        suit: Suit,
        price: u32,
    ) {
        let price = price as i32;

        for player in &mut self.state.players {
            if player.info.id == *buyer_id {
                player.cash -= price;
                *player.hand.cards.entry(suit).or_insert(0) += 1;
            }

            if player.info.id == *seller_id {
                player.cash += price;
                *player.hand.cards.entry(suit).or_insert(0) -= 1;
            }
        }
    }

    pub fn start_new_round(&mut self, round: u32) -> Vec<Event> {
        self.round = round;

        // 重新生成 common_suit 和 goal_suit
        let suits = [Suit::Spade, Suit::Heart, Suit::Diamond, Suit::Club];
        let mut rng = rand::thread_rng();

        // 随机分配 suit 长度：哪两个10, 哪个8, 哪个12
        let mut suit_types = vec![10u8, 10u8, 8u8, 12u8];
        suit_types.shuffle(&mut rng);
        let mut suit_card_counts = HashMap::new();
        for (s, n) in suits.iter().zip(suit_types.iter()) {
            suit_card_counts.insert(*s, *n);
        }

        // 找到12张的作为common
        let common_suit = suit_card_counts
            .iter()
            .find(|(_, num)| **num == 12)
            .map(|(suit, _)| *suit)
            .unwrap();

        // goal suit：与common同色的另一花色
        fn is_red(s: Suit) -> bool {
            matches!(s, Suit::Heart | Suit::Diamond)
        }
        fn is_black(s: Suit) -> bool {
            matches!(s, Suit::Spade | Suit::Club)
        }
        let goal_suit = suits
            .iter()
            .filter(|&&s| {
                s != common_suit &&
                ((is_red(s) && is_red(common_suit)) || (is_black(s) && is_black(common_suit)))
            })
            .next()
            .copied()
            .unwrap();

        self.common_suit = common_suit;
        self.goal_suit = goal_suit;

        // 重新发牌
        let mut deck: Vec<Suit> = Vec::with_capacity(40);
        for (suit, count) in &suit_card_counts {
            for _ in 0..*count {
                deck.push(*suit);
            }
        }
        deck.shuffle(&mut rng);

        let num_players = self.state.players.len();
        // 清空手牌
        for player in &mut self.state.players {
            player.hand.cards.clear();
        }

        // 重新发牌
        for (i, suit) in deck.iter().enumerate() {
            let pidx = i % num_players;
            let player = &mut self.state.players[pidx];
            *player.hand.cards.entry(*suit).or_insert(0) += 1;
        }

        // 清空 quotes
        self.state.quotes.clear();

        // 返回 RoundStarted 事件，为每个玩家
        let server_time = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();

        self.state.players.iter().map(|player| {
            Event::RoundStarted {
                round_id: round as u8,
                server_time,
                player: player.clone(),
            }
        }).collect()
    }

    pub fn end_round(&mut self) -> Vec<Event> {
        let goal = self.goal_suit;
        let pot = self.game_config.pot as i32; // 转换为 i32 以匹配 cash

        // 计算每个玩家的 goal_suit 数量
        let mut player_goal_counts: HashMap<PlayerId, u8> = HashMap::new();
        for player in &self.state.players {
            let count = player.hand.cards.get(&goal).copied().unwrap_or(0);
            player_goal_counts.insert(player.info.id.clone(), count);
        }

        // 发放 bonus：每张 goal suit +10 cash
        let mut total_bonus = 0i32;
        for player in &mut self.state.players {
            let goal_count = player_goal_counts[&player.info.id];
            let bonus = (goal_count as i32) * CARD_VALUE_PER_GOAL_SUIT;
            player.cash += bonus;
            total_bonus += bonus;
        }

        // 计算剩余 pot
        let rest_pot = if pot > total_bonus { pot - total_bonus } else { 0 };

        // 找到拥有最多 goal_suit 的玩家
        let max_goal = player_goal_counts.values().copied().max().unwrap_or(0);
        let winners: Vec<PlayerId> = player_goal_counts.iter()
            .filter(|(_, cnt)| **cnt == max_goal && max_goal > 0)
            .map(|(pid, _)| pid.clone())
            .collect();

        // 平分剩余 pot
        let share = if !winners.is_empty() { rest_pot / winners.len() as i32 } else { 0 };

        for winner_id in &winners {
            if let Some(player) = self.state.players.iter_mut().find(|p| p.info.id == *winner_id) {
                player.cash += share;
            }
        }

        // 返回事件
        vec![Event::RoundEnded {
            round_id: self.round as u8,
            players: self.state.players.clone(),
            server_time: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
            goal_suit: goal,
        }]
    }

    pub fn end_game(&mut self) -> Vec<Event> {
        vec![Event::GameEnded {
            players: self.state.players.clone(),
        }]
    }
}
