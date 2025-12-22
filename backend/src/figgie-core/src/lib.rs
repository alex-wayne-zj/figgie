// lib.rs
pub mod types;
pub mod action;
pub mod engine;
pub mod event;
mod utils;

// 对外暴露的“核心概念”
pub use types::*;
pub use action::*;
pub use engine::*;
pub use event::*;