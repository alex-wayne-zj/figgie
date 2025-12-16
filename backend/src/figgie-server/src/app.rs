use crate::types::*;
use figgie_core::*;

use axum::{
    routing::{get, post},
    response::IntoResponse,
    http::StatusCode,
    Router, Json
};
use serde_json::json;

pub fn create_app() -> Router {
    Router::new()
        .route("/", get(hello_figgie))
        .route("/start", post(start_game))
}

async fn hello_figgie() -> impl IntoResponse {
    (StatusCode::OK, [("content-type", "text/plain; charset=utf-8")], "Hello, Figgie!")
}

// TODO: understand State & AppState
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
        room_id: req.room_id,
        players: req.players.into_iter().map(|p| Info {
            id: p.id,
            name: p.name,
        }).collect(),
        starting_cash: 350,
        ante_amount: if player_num == 4 { 50 } else { 40 },
        pot: 200,
        trading_duration_secs: 240,
    };

    let game = Game::new(config);

    println!("{:?}", game);

    (
        StatusCode::OK,
        Json(json!({"success": true}))
    )
}
