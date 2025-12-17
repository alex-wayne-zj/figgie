// use tokio::select;
// use tokio::time::{sleep, Duration, Instant};
// use rand::{thread_rng, Rng};

// #[derive(Default)]
// struct RobotState {
//     hand: Hand,
//     quotes: Vec<(PlayerId, Quote)>,
//     cash: i32,
// }

// fn apply_event(state: &mut RobotState, event: Event) {
//     match event {
//         Event::HandUpdated(hand) => state.hand = hand,
//         Event::QuotesUpdated(quotes) => state.quotes = quotes,
//         Event::CashUpdated(cash) => state.cash = cash,
//         Event::TradeExecuted { .. } => { /* 可选 */ }
//         _ => {}
//     }
// }

// pub async fn robot_loop(
//     player_id: PlayerId,
//     mut event_rx: Receiver<Event>,
//     action_tx: Sender<Action>,
// ) {
//     let mut rng = thread_rng();
//     let mut state = RobotState::default();

//     // 下一次出手时间
//     let mut next_action_at = Instant::now() + random_delay(&mut rng);

//     loop {
//         select! {
//             // 1️⃣ 优先接收 event，更新本地状态
//             Some(event) = event_rx.recv() => {
//                 apply_event(&mut state, event);
//             }

//             // 2️⃣ 到时间了，做一次决策
//             _ = sleep_until(next_action_at) => {
//                 let action = decide_action(&state, &mut rng);
//                 let _ = action_tx.send(action).await;

//                 next_action_at = Instant::now() + random_delay(&mut rng);
//             }
//         }
//     }
// }

// fn random_delay(rng: &mut impl Rng) -> Duration {
//     Duration::from_secs(rng.gen_range(3..=8))
// }

// fn decide_action(state: &RobotState, rng: &mut impl Rng) -> Action {
//     if !state.quotes.is_empty() && rng.gen_bool(0.6) {
//         let (_, quote) = state.quotes[rng.gen_range(0..state.quotes.len())].clone();
//         return Action::PlaceQuote(quote);
//     }

//     Action::PlaceQuote(Quote {
//         suit: random_suit(rng),
//         side: if rng.gen_bool(0.5) { Side::Buy } else { Side::Sell },
//         price: rng.gen_range(3..=17),
//     })
// }
