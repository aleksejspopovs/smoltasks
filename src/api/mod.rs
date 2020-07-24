mod todos;
mod users;

use serde::Serialize;

use warp::http::StatusCode;
use warp::{http::header::HeaderValue, reject::Reject, Filter, Rejection, Reply};

use std::convert::Infallible;

use crate::{models, verify_todo_id, verify_token, Db};

#[derive(Debug, Serialize)]
struct ApiError {
    help_text: String,
}

impl Reject for ApiError {}

fn api_error(help_text: &str) -> Rejection {
    warp::reject::custom(ApiError {
        help_text: help_text.to_string(),
    })
}

#[derive(Debug, Serialize)]
struct ServerError {
    help_text: String,
}

impl Reject for ServerError {}

fn server_error(err: Box<dyn std::error::Error>) -> Rejection {
    warp::reject::custom(ServerError {
        help_text: format!("{:?}", err),
    })
}

async fn handle_rejection(err: Rejection) -> Result<impl Reply, Rejection> {
    if let Some(err) = err.find::<ApiError>() {
        return Ok(warp::reply::with_status(
            warp::reply::json(err),
            StatusCode::BAD_REQUEST,
        ));
    } else if let Some(err) = err.find::<ServerError>() {
        return Ok(warp::reply::with_status(
            warp::reply::json(err),
            StatusCode::INTERNAL_SERVER_ERROR,
        ));
    }
    Err(err)
}

fn with_db(db: Db) -> impl Filter<Extract = (Db,), Error = Infallible> + Clone {
    warp::any().map(move || db.clone())
}

fn with_auth(db: Db) -> impl Filter<Extract = (models::User,), Error = Rejection> + Clone {
    // TODO: use type system to enforce auth by replacing
    // models::User with a type whose only constructor does the
    // check below
    with_db(db)
        .and(warp::header::value("x-smoltasks-token"))
        .and_then(|db: Db, token: HeaderValue| async move {
            match token.to_str() {
                Ok(token) => {
                    match verify_token(db, &token).await {
                        Ok(Some(user)) => Ok(user),
                        Ok(None) => Err(api_error("invalid x-smoltasks-token")),
                        // TODO: figure out how to write the converter so that we can use
                        // `.await?` instead of the below?
                        Err(err) => Err(server_error(err)),
                    }
                }
                Err(_) => Err(api_error("invalid x-smoltasks-token")),
            }
        })
}

fn with_todo_id_param(
    db: Db,
) -> impl Filter<Extract = (models::TodoId,), Error = Rejection> + Clone {
    with_db(db.clone())
        .and(with_auth(db))
        .and(warp::path::param())
        .and_then(
            |db: Db, user: models::User, todo_id: models::TodoId| async move {
                match verify_todo_id(db, &user, todo_id).await {
                    Ok(true) => Ok(todo_id),
                    // intentionally don't distinguish between
                    // "does not exist" and "unauthorized".
                    Ok(false) => Err(api_error("note does not exist")),
                    Err(err) => Err(server_error(err)),
                }
            },
        )
}

pub fn routes(db: Db) -> impl Filter<Extract = (impl Reply, ), Error = Rejection> + Clone {
    warp::path("users").and(users::routes(db.clone()))
        .or(warp::path("todos").and(todos::routes(db)))
        .recover(handle_rejection)
}
