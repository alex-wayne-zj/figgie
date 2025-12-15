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
        .route("/start", post(start_game_handler))
}

async fn hello_figgie() -> impl IntoResponse {
    (StatusCode::OK, [("content-type", "text/plain; charset=utf-8")], "Hello, Figgie!")
}

async fn start_game_handler(Json(_body): Json<serde_json::Value>) -> impl IntoResponse {
    // 不做实际处理，仅返回成功
    (
        StatusCode::OK,
        [("content-type", "application/json")],
        Json(json!({"success": true}))
    )
}
