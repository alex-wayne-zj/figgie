use tokio::select;
use tokio::time::{sleep_until, Duration, Instant};
use rand::{SeedableRng, rngs::SmallRng, Rng};
use figgie_core::*;
use tokio::sync::mpsc::*;
use log;

const PAUSE_SECONDS: u64 = 3;
const RANDOM_DELAY_LOWER_BOUND: u64 = 2;
const RANDOM_DELAY_UPPER_BOUND: u64 = 8;
const EXECUTE_QUOTE_POSSIBILITY: f64 = 0.2;
const RANDOM_PRICE_LOWER_BOUND: u32 = 3;
const RANDOM_PRICE_UPPER_BOUND: u32 = 18;

struct RobotState {
    id: String,
    hand: Hand,
    quotes: Vec<Quote>,
    cash: i32,
}

enum LoopControl {
    Start,
    Continue,
    Pause,
    Break,
}

impl RobotState {
    pub fn new(id: String, hand: Hand, cash: i32) -> Self {
        Self {
            id,
            hand,
            cash,
            quotes: Vec::new(),
        }
    }
}

fn apply_event(state: &mut RobotState, event: Event) -> LoopControl {
    match event {
        Event::TradeExecuted { buyer, seller, suit, price } => {
            if buyer == state.id {
                *state.hand.cards.entry(suit).or_insert(0) += 1;
                state.cash -= price as i32;
            }

            // 只是保险机制，正常来说前端和引擎会保证不会出现这样的交易
            if seller == state.id {
                let entry = state.hand.cards.entry(suit).or_insert(0);
                if *entry > 0 {
                    *entry -= 1;
                    state.cash += price as i32;
                }
            }
            state.quotes.clear();
            LoopControl::Continue
        }
        Event::QuotePlaced { quote } => {
            state.quotes.push(quote);
            LoopControl::Continue
        }
        Event::RoundStarted { round_id, server_time, player } => {
            state.hand = player.hand;
            state.cash = player.cash;
            state.quotes.clear();
            LoopControl::Start
        }
        Event::RoundEnded { round_id, players, server_time, goal_suit } => {
            let engine_player = players
                .iter()
                .find(|p| p.info.id == state.id)
                .expect("robot player not found in RoundEnded");
            
            for (suit, count) in &engine_player.hand.cards {
                let local = state.hand.cards.get(suit).copied().unwrap_or(0);
                assert!(
                    local == *count,
                    "hand mismatch for {:?}: local={}, engine={}",
                    suit,
                    local,
                    count
                );
            }

            // 反向检查：本地有但引擎没有的花色，一般来说不存在这种情况
            for (suit, count) in &state.hand.cards {
                let engine = engine_player.hand.cards.get(suit).copied().unwrap_or(0);
                assert!(
                    engine == *count,
                    "hand mismatch for {:?}: local={}, engine={}",
                    suit,
                    count,
                    engine
                );
            }

            let cash1 = state.cash;
            let my_goal_count = state.hand.cards.get(&goal_suit).copied().unwrap_or(0);
            let mut cash2 = cash1 + (my_goal_count as i32) * CARD_VALUE_PER_GOAL_SUIT;

            let goal_counts: Vec<u8> = players
                .iter()
                .map(|p| p.hand.cards.get(&goal_suit).copied().unwrap_or(0))
                .collect();

            let max_goal = goal_counts.iter().copied().max().unwrap_or(0);

            let winner_count = goal_counts.iter().filter(|&&c| c == max_goal).count() as i32;

            if my_goal_count == max_goal {
                let total_goal_cards: u8 = goal_counts.iter().copied().sum();

                let bonus = match total_goal_cards {
                    10 => 100,
                    8 => 120,
                    _ => {
                        log::warn!(
                            "unexpected total goal suit count: {}",
                            total_goal_cards
                        );
                        0
                    }
                };
                cash2 += bonus / winner_count;
            }

            assert!(
                cash2 == engine_player.cash,
                "cash mismatch: local_calc={}, engine={}",
                cash2,
                engine_player.cash
            );

            state.cash = engine_player.cash;
            state.hand = engine_player.hand.clone();
            state.quotes.clear();
            LoopControl::Pause
        }
        Event::QuoteCanceled { quote} => {
            state.quotes.retain(|q| {
                !(q.player_id == quote.player_id && q.suit == quote.suit && q.side == quote.side && q.price == quote.price)
            });
            LoopControl::Continue
        }
        Event::GameEnded { players } => {
            state.quotes.clear();
            LoopControl::Break
        }
        _ => LoopControl::Continue
    }
}

pub async fn robot_loop(
    player_id: String,
    hand: Hand,
    cash: i32,
    mut event_rx: Receiver<Event>,
    action_tx: Sender<Action>,
) {
    println!("Robot loop starting...");
    let mut rng = SmallRng::from_entropy();
    let mut state = RobotState::new(player_id, hand, cash);
    let mut next_action_at = Instant::now() + random_delay(&mut rng);
    let mut paused = false;

    loop {
        select! {
            Some(event) = event_rx.recv() => {
                match apply_event(&mut state, event) {
                    LoopControl::Continue => {},
                    LoopControl::Pause => { paused = true },
                    LoopControl::Start => { paused = false },
                    LoopControl::Break => break,
                }
            }

            _ = sleep_until(next_action_at) => {
                if paused {
                    // 不发 action，但要重置下一次 wakeup
                    next_action_at = Instant::now() + Duration::from_secs(PAUSE_SECONDS);
                    continue;
                }
                let action = decide_action(&state, &mut rng);
                let _ = action_tx.send(action).await;

                next_action_at = Instant::now() + random_delay(&mut rng);
            }
        }
    }

    println!("Robot loop ended...");
}

fn random_delay(rng: &mut impl Rng) -> Duration {
    Duration::from_secs(rng.gen_range(RANDOM_DELAY_LOWER_BOUND..=RANDOM_DELAY_UPPER_BOUND))
}

fn decide_action(state: &RobotState, rng: &mut impl Rng) -> Action {
    let hittable_quotes: Vec<&Quote> = state
        .quotes
        .iter()
        .filter(|q| *q.player_id != state.id)
        .collect();

    let robot_id = state.id.clone();
    
    // 按概率去成交已有 quote
    if !hittable_quotes.is_empty() && rng.gen_bool(EXECUTE_QUOTE_POSSIBILITY) {
        let quote = hittable_quotes[rng.gen_range(0..hittable_quotes.len())];

        let hit_quote = Quote {
            player_id: robot_id.clone(),
            suit: quote.suit,
            side: match quote.side {
                Side::Bid => Side::Offer,
                Side::Offer => Side::Bid,
            },
            price: quote.price,
        };

        return Action::PlaceQuote(hit_quote);
    }

    Action::PlaceQuote(Quote {
        player_id: robot_id,
        suit: random_suit(),
        side: if rng.gen_bool(0.5) { Side::Bid } else { Side::Offer },
        price: rng.gen_range(RANDOM_PRICE_LOWER_BOUND..=RANDOM_PRICE_UPPER_BOUND),
    })
}

pub fn random_suit() -> Suit {
    match rand::thread_rng().gen_range(0..4) {
        0 => Suit::Spade,
        1 => Suit::Heart,
        2 => Suit::Diamond,
        _ => Suit::Club,
    }
}
