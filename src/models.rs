use crate::schema::users;

pub type UserId = i64;
pub type AuthToken = String;

#[derive(Insertable)]
#[table_name="users"]
pub struct NewUser {
    pub username: String,
    pub password_hash: String,
}
