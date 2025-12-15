use crate::state::{GameState, Player};
use crate::action::{Action, Quote};
use crate::types::{PlayerId, Suit};
use std::collections::HashMap;

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum EnginePhase {
    Setup,
    Trading,
    Scoring,
    Finished,
}

#[derive(Clone, Debug)]
pub struct GameConfig {
    pub num_players: usize,
    pub starting_cash: u32,
    pub ante_amount: u32,
    pub pot: u32,
    pub common_suit: Suit,
    pub goal_suit: Suit,
    pub suit_card_counts: HashMap<Suit, u8>,
    pub trading_duration_secs: u32, // for reference
}

#[derive(Clone, Debug)]
pub struct GameEngine {
    pub state: GameState,
    pub phase: EnginePhase,
    pub config: GameConfig,
    pub round: u32,
    #[cfg(test)]
    pub goal_suit_override: Option<Suit>,
}

impl GameEngine {
    /// Initializes a new game, sets up player cash, antes, deck, and suit/card distribution.
    pub fn new(num_players: usize) -> Self {
        assert!(num_players == 4 || num_players == 5, "Game requires 4 or 5 players");

        let starting_cash = 350;
        let ante_amount = 40; // each ante $40 = $200 pot
        let pot = num_players as u32 * ante_amount;
        let trading_duration_secs = 4 * 60;

        // 生成花色：两套10张, 一套8张, 一套12张
        let suits = [Suit::Spade, Suit::Heart, Suit::Diamond, Suit::Club];
        // 随机决定哪一个花色是common, 再确定goal
        let mut rng = rand::thread_rng();

        // 随机分配 suit 长度：哪两个10, 哪个8, 哪个12
        let mut suit_types = vec![10u8, 10u8, 8u8, 12u8];
        suit_types.shuffle(&mut rng);
        let mut suit_card_counts = HashMap::new();
        for (s, n) in suits.iter().zip(suit_types.iter()) {
            suit_card_counts.insert(*s, *n);
        }

        // 找到12张的作为common
        let (&common_suit, _) = suit_card_counts.iter().find(|(_, &num)| num == 12).unwrap();

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
        let mut players: Vec<Player> = Vec::with_capacity(num_players);
        for pid in 0..num_players {
            players.push(Player {
                id: pid,
                name: format!("Player{}", pid + 1),
                cash: starting_cash - ante_amount,
                hand: PlayerHand { cards: HashMap::new() },
                active: true,
                // ... other state fields
            });
        }

        // 发牌：把40张平均分配
        for (i, suit) in deck.iter().enumerate() {
            let pidx = i % num_players;
            let player = &mut players[pidx];
            *player.hand.cards.entry(*suit).or_insert(0) += 1;
        }

        let config = GameConfig {
            num_players,
            starting_cash,
            ante_amount,
            pot,
            common_suit,
            goal_suit,
            suit_card_counts,
            trading_duration_secs,
        };

        GameEngine {
            state: GameState {
                players,
                quotes: vec![],
                pot,
                common_suit,
                goal_suit,
                round: 1,
                trading_end_time: None, // To be initialized when phase turns to Trading
                // ...other state fields
            },
            phase: EnginePhase::Setup,
            config,
            round: 1,
            goal_suit_override: None,
        }
    }

    /// 开始一局交易回合（进入Trading阶段，并记录结束时间戳）
    pub fn start_trading(&mut self) {
        assert_eq!(self.phase, EnginePhase::Setup);
        self.phase = EnginePhase::Trading;
        // 这里可插入：self.state.trading_end_time = Some(now + 4分钟)
        // (省略具体时间实现, 留接口)
    }

    /// 交易时段，玩家行动
    pub fn step(&mut self, player: PlayerId, action: Action) -> Result<(), String> {
        if self.phase != EnginePhase::Trading {
            return Err("Not in trading phase.".to_string());
        }

        if !crate::rules::is_action_legal(&self.state, player, &action) {
            return Err("Illegal action".to_string());
        }

        match action {
            Action::PlaceQuote(q) => {
                self.place_quote(player, q);
            }
            Action::CancelAll => {
                self.cancel_all_quotes(player);
            }
            Action::NoOp => {}
        }
        Ok(())
    }

    /// 提前结束交易环节（4分钟结束后/所有玩家都无挂单等）
    pub fn end_trading(&mut self) {
        assert_eq!(self.phase, EnginePhase::Trading);
        self.phase = EnginePhase::Scoring;
        // 任何剩余的订单都清空
        self.state.quotes.clear();
    }

    /// 按规则计分结算
    pub fn score_and_distribute_pot(&mut self) -> HashMap<PlayerId, u32> {
        assert_eq!(self.phase, EnginePhase::Scoring);
        let goal = self.config.goal_suit;
        let pot = self.state.pot;
        let mut player_goal_counts: HashMap<PlayerId, u8> = HashMap::new();

        // 先发bonus：每张goal suit得$10，从pot扣
        for player in &mut self.state.players {
            let count = player.hand.cards.get(&goal).copied().unwrap_or(0);
            player_goal_counts.insert(player.id, count);
        }
        let total_goal_cards = player_goal_counts.values().copied().sum::<u8>();
        let mut payouts: HashMap<PlayerId, u32> = HashMap::new();
        let mut total_bonus = 0;

        for player in &mut self.state.players {
            let goal_count = player_goal_counts[&player.id];
            let bonus = (goal_count as u32) * 10;
            player.cash += bonus;
            payouts.insert(player.id, bonus);
            total_bonus += bonus;
        }

        // 然后找goal牌最多者（可以多人并列），分配剩余pot
        let max_goal = player_goal_counts.values().copied().max().unwrap_or(0);
        let winners: Vec<PlayerId> = player_goal_counts.iter()
            .filter(|(_, &cnt)| cnt == max_goal && max_goal > 0)
            .map(|(&pid, _)| pid)
            .collect();

        let rest_pot = if pot > total_bonus { pot - total_bonus } else { 0 };
        let share = if !winners.is_empty() { rest_pot / winners.len() as u32 } else { 0 };

        for &pid in &winners {
            let player = self.state.players.iter_mut().find(|p| p.id == pid).unwrap();
            player.cash += share;
            *payouts.get_mut(&pid).unwrap() += share;
        }

        self.state.pot = 0;
        self.phase = EnginePhase::Finished;

        payouts
    }

    /// 用于外部检查谁赢了
    pub fn winners(&self) -> Vec<PlayerId> {
        let goal = self.config.goal_suit;
        let mut player_goal_counts: HashMap<PlayerId, u8> = HashMap::new();
        for player in &self.state.players {
            let count = player.hand.cards.get(&goal).copied().unwrap_or(0);
            player_goal_counts.insert(player.id, count);
        }
        let max_goal = player_goal_counts.values().copied().max().unwrap_or(0);
        player_goal_counts.iter()
            .filter(|(_, &cnt)| cnt == max_goal && max_goal > 0)
            .map(|(&pid, _)| pid)
            .collect()
    }

    fn place_quote(&mut self, player: PlayerId, quote: Quote) {
        self.state.quotes
            .retain(|(pid, q)| !(*pid == player && q.suit == quote.suit && q.side == quote.side));
        self.state.quotes.push((player, quote));
    }

    fn cancel_all_quotes(&mut self, player: PlayerId) {
        self.state.quotes.retain(|(pid, _)| *pid != player);
    }

    /// 检查某个玩家是否有未成交挂单
    pub fn has_active_quotes(&self, player: PlayerId) -> bool {
        self.state.quotes.iter().any(|(pid, _)| *pid == player)
    }

    pub fn is_game_finished(&self) -> bool {
        self.phase == EnginePhase::Finished
    }
}
