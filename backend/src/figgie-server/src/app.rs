use crate::types::*;
use crate::dispatcher::*;
use crate::robots::*;
use figgie_core::*;
use futures::channel::mpsc;
use futures::{StreamExt, SinkExt};
use tokio::sync::mpsc::*;
use std::collections::HashMap;
use std::time::Instant;

use axum::{
    routing::{get, post},
    response::IntoResponse,
    http::StatusCode,
    extract::Path,
    extract::ws::{WebSocketUpgrade, Message},
    Router, Json
};
use serde_json::json;

pub fn create_app() -> Router {
    Router::new()
        .route("/", get(hello_figgie))
        .route("/start", post(start_game))
        .route("/ws/{room_id}/{player_id}", get(ws_connect))
}

async fn hello_figgie() -> impl IntoResponse {
    (StatusCode::OK, [("content-type", "text/plain; charset=utf-8")], "Hello, Figgie!")
}

async fn start_game(Json(req): Json<StartGameRequest>,) -> impl IntoResponse {
    let player_num = req.players.len();
    if player_num != 4 && player_num != 5 {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Figgie requires 5 players" })),
        );
    }
    println!("{:?}", req);

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
    println!("{:?}", &game);

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
            println!("is robot");
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
            println!("is human");
        }
    }

    (
        StatusCode::OK,
        Json(json!({"success": true}))
    )
}

async fn ws_connect(
    ws: WebSocketUpgrade,
    Path((room_id, player_id)): Path<(String, String)>,
) -> impl IntoResponse {
    ws.on_upgrade(move | mut socket| async move {
        println!("room_id = {}, player_id = {}", room_id, player_id);

        // while let Some(Ok(msg)) = socket.next().await {
        //     match msg {
        //         Message::Text(text) => {
        //             println!("recv raw text: {}", text);

        //             // ① 解析 JSON
        //             let action: ClientAction = match serde_json::from_str(&text) {
        //                 Ok(v) => v,
        //                 Err(e) => {
        //                     eprintln!("json parse error: {}", e);
        //                     continue;
        //                 }
        //             };

        //             println!("parsed action: {:?}", action);

        //             // ② 构造一个返回给前端的 JSON
        //             let resp = serde_json::json!({
        //                 "ok": true,
        //                 "echo_action": action.action,
        //                 "player_id": player_id,
        //             });

        //             // ③ 发回前端
        //             let _ = socket
        //                 .send(Message::Text(resp.to_string()))
        //                 .await;
        //         }

        //         Message::Close(_) => {
        //             println!("client disconnected");
        //             break;
        //         }

        //         _ => {}
        //     }
        // }
    })
}