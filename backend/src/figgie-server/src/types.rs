use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct StartGameRequest {
    pub room_name: String,
    pub room_id: String,
    pub players: Vec<PlayerInfo>,
}

#[derive(Debug, Deserialize)]
pub struct PlayerInfo {
    pub id: String,
    pub name: String,
}