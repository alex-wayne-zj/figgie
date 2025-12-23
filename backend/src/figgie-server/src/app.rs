use crate::types::*;
use crate::dispatcher::*;
use crate::robots::*;
use crate::adapter::*;
use figgie_core::*;

use futures::{StreamExt, SinkExt};
use tokio::sync::mpsc::*;
use tokio::sync::Mutex;
use std::collections::HashMap;
use std::time::Instant;
use std::sync::Arc;
use serde_json::Value;
use serde_json::json;
use log;
use axum::{
    routing::{get, post},
    response::IntoResponse,
    http::StatusCode,
    extract::{Path, State},
    extract::ws::{WebSocketUpgrade, Message},
    Router, Json
};

#[derive(Clone)]
pub struct AppState {
    pub dispatchers: Dispatchers,
    pub human_participants: HumanParticipants,
}

pub fn create_app() -> Router {
    let dispatchers: Dispatchers = Arc::new(Mutex::new(Vec::new()));
    let human_participants: HumanParticipants = Arc::new(Mutex::new(Vec::new()));

    Router::new()
        .route("/start", post(start_game))
        .route("/ws/{room_id}/{player_id}", get(ws_connect))
        .with_state(AppState {
            dispatchers: dispatchers,
            human_participants: human_participants,
        })
}

async fn start_game(State(state): State<AppState>, Json(req): Json<StartGameRequest>,) -> impl IntoResponse {
    let dispatchers = &state.dispatchers;
    let human_participants = &state.human_participants;

    let player_num = req.players.len();
    if player_num != 4 && player_num != 5 {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Figgie requires 5 players" })),
        );
    }
    println!("Game Started...");

    let config = GameConfig {
        room_name: req.room_name,
        room_id: req.room_id.clone(),
        players: req.players.clone().into_iter().map(|p| Info {
            id: p.id,
            name: p.name,
        }).collect(),
        starting_cash: 350,
        ante_amount: if player_num == 4 { 50 } else { 40 },
        pot: 200,
        trading_duration_secs: 240,
    };
    let game = Game::new(config);
    println!("Game Created..");

    let (dispatcher_sender, dispatcher_receiver) = channel(64);
    let mut dispatcher = Dispatcher {
        room_id: req.room_id,
        game: game,
        receiver: dispatcher_receiver,
        participants: HashMap::new(),
        last_activity: Instant::now(),
    };

    for player in req.players.into_iter() {
        let (participant, event_sender) = create_participant(player.id.clone(), dispatcher_sender.clone());
        dispatcher.register(player.id.clone(), event_sender);

        if player.id.starts_with("robot") {
            let player_state = dispatcher
                .game
                .state
                .players
                .iter()
                .find(|p| p.info.id == player.id)
                .expect("robot player not found");
            let hand = player_state.hand.clone();
            let cash = player_state.cash;
            let Participant {
                player_id,
                action_sender,
                event_receiver,
            } = participant;
            tokio::spawn(async move {
                robot_loop(player_id, hand, cash, event_receiver, action_sender).await;
            });
        } else {
            human_participants
                .lock()
                .await
                .push(participant);
        }
    }

    let dispatcher = Arc::new(Mutex::new(dispatcher));
    dispatchers.lock().await.push(dispatcher.clone());

    // 生成初始 RoundStarted events
    let mut dispatcher_lock = dispatcher.lock().await;
    let events = dispatcher_lock.game.start_round(1);
    dispatcher_lock.handover_events(events).await;

    tokio::spawn( {
        let dispatcher = dispatcher.clone();
        async move {
            let mut dispatcher = dispatcher.lock().await; // ✅ 这里是 Future
            dispatcher.run().await;
        }
    });

    (
        StatusCode::OK,
        Json(json!({"success": true}))
    )
}

async fn ws_connect(
    State(state): State<AppState>,
    ws: WebSocketUpgrade,
    Path((room_id, player_id)): Path<(String, String)>,
) -> impl IntoResponse {
    let human_participants = state.human_participants.clone();

    ws.on_upgrade(move | mut socket| async move {
        println!("WebSocket connected, room_id = {}, player_id = {}", room_id, player_id);

        let participant = {
            let mut vec = human_participants.lock().await;
            let idx = vec.iter().position(|p| p.player_id == player_id)
                .expect("participant not found");
            vec.remove(idx) // 直接拿走，防止重复连接
        };

        let mut event_rx = participant.event_receiver;
        let action_tx = participant.action_sender;

        let (mut ws_tx, mut ws_rx) = socket.split();

        // 2️⃣ event → websocket
        let send_task = tokio::spawn(async move {
            while let Some(event) = event_rx.recv().await {
                let json: Value = event_to_json(&event);
                let text = json.to_string();
                let _ = ws_tx.send(Message::Text(text.into())).await;
            }
        });

        // 3️⃣ websocket → action
        let recv_task = tokio::spawn(async move {
            while let Some(Ok(Message::Text(text))) = ws_rx.next().await {
                if let Ok(view) = serde_json::from_str::<ActionView>(&text) {
                    if let Ok(action) = Action::try_from(view) {
                        let _ = action_tx.send(action).await;
                    }
                }
            }
        });

        let _ = tokio::join!(send_task, recv_task);

        println!("Player {} websocket disconnected", player_id);
    })
}