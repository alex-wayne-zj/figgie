use axum::{
    routing::{get, post},
    response::IntoResponse,
    http::StatusCode,
    Router, Json,
};
use std::net::SocketAddr;
use tokio::net::TcpListener;
use serde_json::json;

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

#[tokio::main]
async fn main() {
    // 构建应用路由
    let app = Router::new()
        .route("/", get(hello_figgie))
        .route("/start", post(start_game_handler));

    // 监听地址
    let addr = SocketAddr::from(([127, 0, 0, 1], 8080));
    let listener = TcpListener::bind(addr).await.expect("监听失败");
    println!("服务器已启动：http://{}", listener.local_addr().unwrap());

    // 启动服务（axum 0.8 使用 axum::serve）
    axum::serve(listener, app.into_make_service())
        .await
        .expect("服务器启动失败");
}
