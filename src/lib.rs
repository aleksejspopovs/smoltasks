use chrono::offset::Utc;

use scrypt::{scrypt_check, scrypt_simple, ScryptParams};

use sqlx::postgres::PgPool;

use getrandom;
use hex;
use sha2::{Digest, Sha256};

use std::error::Error;

pub mod api;
pub mod models;

pub type Db = PgPool;

fn hash_password(password: &str) -> String {
    let params = ScryptParams::recommended();
    scrypt_simple(&password, &params).expect("OsRng shouldn't fail")
}

fn hash_token(token: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(token.as_bytes());
    let token_hash = hasher.finalize();

    hex::encode(&token_hash)
}

fn generate_and_hash_auth_token() -> (String, String) {
    let mut token: [u8; 16] = [0; 16];
    getrandom::getrandom(&mut token).expect("random shouldn't fail");

    let token = hex::encode(&token);
    let token_hash = hash_token(&token);

    (token, token_hash)
}

enum CreateUserResult {
    Ok,
    UsernameExists,
}

async fn create_user(
    db: Db,
    username: &str,
    password: &str,
) -> Result<CreateUserResult, Box<dyn Error>> {
    let password_hash = hash_password(password);

    let result = sqlx::query!(
        "INSERT INTO users (username, password_hash) VALUES ($1, $2)",
        username,
        password_hash
    )
    .execute(&db)
    .await;

    match result {
        Ok(_) => Ok(CreateUserResult::Ok),
        Err(sqlx::Error::Database(err)) => {
            // unique_violation
            // from https://www.postgresql.org/docs/12/errcodes-appendix.html
            if err.code() == Some("23505") {
                Ok(CreateUserResult::UsernameExists)
            } else {
                Err(Box::new(sqlx::Error::Database(err)))
            }
        }
        Err(err) => Err(Box::new(err)),
    }
}

enum AuthUserResult {
    Ok(String),
    InvalidCredentials,
}

async fn auth_user(
    db: Db,
    username: &str,
    password: &str,
) -> Result<AuthUserResult, Box<dyn Error>> {
    let user = sqlx::query_as!(
        models::User,
        "SELECT * FROM users WHERE username = $1",
        username
    )
    .fetch_optional(&db)
    .await?;

    if user.is_none() {
        return Ok(AuthUserResult::InvalidCredentials);
    }

    let user = user.unwrap();

    match scrypt_check(&password, &user.password_hash) {
        Ok(()) => {
            let (token, token_hash) = generate_and_hash_auth_token();
            sqlx::query!(
                "INSERT INTO auth (user_id, token_hash, created) VALUES ($1, $2, $3)",
                user.id,
                token_hash,
                Utc::now()
            )
            .execute(&db)
            .await?;

            Ok(AuthUserResult::Ok(token))
        }
        Err(scrypt::errors::CheckError::HashMismatch) => Ok(AuthUserResult::InvalidCredentials),
        Err(err) => Err(Box::new(err)),
    }
}

async fn verify_token(db: Db, token: &str) -> Result<Option<models::User>, Box<dyn Error>> {
    let token_hash = hash_token(token);

    Ok(sqlx::query_as!(
        models::User,
        "SELECT users.* FROM auth JOIN users ON auth.user_id = users.id WHERE token_hash = $1",
        token_hash
    )
    .fetch_optional(&db)
    .await?)
}

async fn verify_todo_id(
    db: Db,
    user: &models::User,
    todo_id: models::TodoId,
) -> Result<bool, Box<dyn Error>> {
    Ok(
        sqlx::query!("SELECT user_id FROM todos WHERE id = $1", todo_id)
            .fetch_optional(&db)
            .await?
            .map_or(false, |x| x.user_id == user.id),
    )
}

async fn get_active_todos(
    db: Db,
    user: &models::User,
) -> Result<Vec<models::Todo>, Box<dyn Error>> {
    Ok(sqlx::query_as!(
        models::Todo,
        "SELECT * FROM todos WHERE user_id = $1 AND NOT done",
        user.id
    )
    .fetch_all(&db)
    .await?)
}

async fn create_todo(
    db: Db,
    user: &models::User,
    todo: &models::TodoEditable,
) -> Result<models::TodoId, Box<dyn Error>> {
    // grab a connection explicitly so that we can call
    // last_insert_row_id on it after inserting.
    let mut conn = db.acquire().await?;

    Ok(sqlx::query!(
        "INSERT INTO todos (user_id, title, notes, not_before, due, done)
        VALUES ($1, $2, $3, $4, $5, false)
        RETURNING id",
        user.id,
        todo.title,
        todo.notes,
        todo.not_before,
        todo.due,
    )
    .fetch_one(&mut conn)
    .await?
    .id)
}

async fn mark_todo_done(
    db: Db,
    todo_id: models::TodoId,
    done: bool,
) -> Result<(), Box<dyn Error>> {
    sqlx::query!(
        "UPDATE todos SET done = $1 WHERE id = $2",
        done,
        todo_id,
    )
    .execute(&db)
    .await?;

    Ok(())
}

async fn update_todo(
    db: Db,
    todo_id: models::TodoId,
    todo: &models::TodoEditable,
) -> Result<(), Box<dyn Error>> {
    sqlx::query!(
        "UPDATE todos SET title = $1, notes = $2, not_before = $3, due = $4 WHERE id = $5",
        todo.title,
        todo.notes,
        todo.not_before,
        todo.due,
        todo_id,
    )
    .execute(&db)
    .await?;

    Ok(())
}
