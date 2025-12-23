use std::collections::HashMap;
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::{mpsc::*, Mutex};
use log;
use figgie_core::{Game, Action, Event};

pub type Dispatchers = Arc<Mutex<Vec<Arc<Mutex<Dispatcher>>>>>;
pub type HumanParticipants = Arc<Mutex<Vec<Participant>>>;

#[derive(Debug)]
pub struct Participant {
    pub player_id: String,
    pub action_sender: Sender<Action>,
    pub event_receiver: Receiver<Event>,
}

pub fn create_participant(
    player_id: String,
    dispatcher_sender: Sender<Action>,
) -> (Participant, Sender<Event>) {
    let (event_sender, event_receiver) = channel(32);

    let participant = Participant {
        player_id: player_id,
        action_sender: dispatcher_sender,
        event_receiver: event_receiver,
    };

    (participant, event_sender)
}

#[derive(Debug)]
pub struct Dispatcher {
    pub room_id: String,
    pub game: Game,
    // dispatcher 接收所有参与者发来的 action
    pub receiver: Receiver<Action>,
    // dispatcher 给每个参与者发 event
    pub participants: HashMap<String, Sender<Event>>,
    pub last_activity: Instant,
}

impl Dispatcher {
    pub fn register(
        &mut self,
        player_id: String,
        event_sender: Sender<Event>,
    ) {
        self.participants.insert(player_id, event_sender);
        self.last_activity = Instant::now();
    }

    pub async fn run(&mut self) {
        println!("Dispatcher for room {} started", self.room_id);

        while let Some(action) = self.receiver.recv().await {
            self.last_activity = Instant::now();
            let events = self.game.handle_action(action);
            self.handover_events(events.clone()).await;
            if !events.is_empty() {
                match events[0] {
                    Event::GameEnded{..} => break,
                    _ => {},
                }
            }
        }

        println!("Dispatcher for room {} stopped", self.room_id);
    }

    pub async fn handover_events(&self, events: Vec<Event>) {
        for event in events {
            match event.target_player() {
                // 🎯 定向发送
                Some(player_id) => {
                    if let Some(tx) = self.participants.get(player_id) {
                        let _ = tx.send(event).await;
                    } else {
                        log::warn!(
                            "target participant not found, room id: {}, player id: {}", self.room_id, player_id
                        );
                    }
                }

                // 📢 群发
                None => {
                    for tx in self.participants.values() {
                        let _ = tx.send(event.clone()).await;
                    }
                }
            }
        }
    }
}
