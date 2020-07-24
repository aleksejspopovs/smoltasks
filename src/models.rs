use serde::Serialize;

pub type UserId = i32;
pub type TodoId = i32;
pub type Date = i32; // TODO
pub type Bool = i32; // TODO

pub struct User {
    pub id: UserId,
    pub username: String,
    pub password_hash: String,
}

#[derive(Serialize)]
pub struct Todo {
    pub id: TodoId,
    pub user_id: UserId,
    pub title: String,
    pub notes: String,
    pub not_before: Option<Date>,
    pub due: Option<Date>,
    pub done: Bool,
}
