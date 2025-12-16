use std::net::SocketAddr;
use tokio::net::TcpListener;
mod app;
mod types;

#[tokio::main]
async fn main() {
    // 构建应用路由
    let app = app::create_app();

    // 监听地址
    let addr = SocketAddr::from(([127, 0, 0, 1], 8080));
    let listener = TcpListener::bind(addr).await.expect("监听失败");
    println!("服务器已启动：http://{}", listener.local_addr().unwrap());

    // 启动服务（axum 0.8 使用 axum::serve）
    axum::serve(listener, app.into_make_service())
        .await
        .expect("服务器启动失败");
}
