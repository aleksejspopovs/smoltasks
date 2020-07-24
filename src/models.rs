use serde::{Deserialize, Serialize};
use chrono;

pub type UserId = i32;
pub type TodoId = i32;
pub type Date = chrono::NaiveDate;

pub struct User {
    pub id: UserId,
    pub username: String,
    pub password_hash: String,
}

pub struct Todo {
    pub id: TodoId,
    pub user_id: UserId,
    pub title: String,
    pub notes: String,
    pub not_before: Date,
    pub due: Option<Date>,
    pub done: bool,
}

#[derive(Serialize)]
pub struct TodoDisplay {
    pub id: TodoId,
    pub title: String,
    pub notes: String,
    pub not_before: Date,
    pub due: Option<Date>,
    pub done: bool,
}

impl TodoDisplay {
    pub fn from_todo(todo: Todo) -> Self {
        Self {
            id: todo.id,
            title: todo.title,
            notes: todo.notes,
            not_before: todo.not_before,
            due: todo.due,
            done: todo.done,
        }
    }
}

#[derive(Deserialize)]
pub struct TodoEditable {
    pub title: String,
    pub notes: String,
    pub not_before: Date,
    pub due: Option<Date>,
}
