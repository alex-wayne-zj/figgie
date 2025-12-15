// lib.rs
pub mod types;
pub mod action;
pub mod state;
pub mod engine;
pub mod rules;
pub mod event;

// 对外暴露的“核心概念”
pub use types::*;
pub use action::*;
pub use state::*;
pub use engine::*;
pub use event::*;