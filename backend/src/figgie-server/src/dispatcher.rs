use std::collections::HashMap;
use tokio::sync::mpsc::*;
use std::time::{Duration, Instant};
use figgie_core::*;

pub struct Participant {
    pub player_id: PlayerId,
    pub action_sender: Sender<Action>,
    pub event_receiver: Receiver<Event>,
}

pub fn create_participant(
    player_id: PlayerId,
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

pub struct Dispatcher {
    pub room_id: String,
    pub game: Game,
    // dispatcher 接收所有参与者发来的 action
    pub receiver: Receiver<Action>,
    // dispatcher 给每个参与者发 event
    pub participants: HashMap<PlayerId, Sender<Event>>,
    pub last_activity: Instant,
}

impl Dispatcher {
    pub fn register(
        &mut self,
        player_id: PlayerId,
        event_sender: Sender<Event>,
    ) {
        self.participants.insert(player_id, event_sender);
        self.last_activity = Instant::now();
    }

    pub async fn run(mut self) {
        println!("Dispatcher for room {} started", self.room_id);

        while let Some(action) = self.receiver.recv().await {
            self.last_activity = Instant::now();
            let events = self.game.handle_action(action);
            // self.handover_events(events).await;
        }

        println!("Dispatcher for room {} stopped", self.room_id);
    }

    // async fn handover_events(&self, events: Vec<Event>) {
    //     for event in events {
    //         match event {
    //             Event::ToPlayer { player_id, .. } => {
    //                 self.send_to_player(player_id, event).await;
    //             }
    //             Event::Broadcast { .. } => {
    //                 self.broadcast(event).await;
    //             }
    //         }
    //     }
    // }
}
