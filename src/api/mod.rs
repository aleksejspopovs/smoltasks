mod user_management;

use serde::Serialize;

use diesel::r2d2::PooledConnection;

use warp::{Filter, Reply, Rejection, reject::Reject};
use warp::http::StatusCode;

use std::convert::Infallible;

use crate::{DbPool, DbConnection};

#[derive(Debug, Serialize)]
struct ApiError {
    help_text: String
}

impl Reject for ApiError {}

fn api_error(help_text: &str) -> Rejection {
    warp::reject::custom(ApiError{help_text: help_text.to_string()})
}

#[derive(Debug, Serialize)]
struct ServerError {
    help_text: String
}

impl Reject for ServerError {}

fn server_error(help_text: &str) -> Rejection {
    warp::reject::custom(ApiError{help_text: help_text.to_string()})
}

async fn handle_rejection(err: Rejection) -> Result<impl Reply, Rejection> {
    if let Some(err) = err.find::<ApiError>() {
        return Ok(warp::reply::with_status(
            warp::reply::json(err),
            StatusCode::BAD_REQUEST
        ))
    } else if let Some(err) = err.find::<ServerError>() {
        return Ok(warp::reply::with_status(
            warp::reply::json(err),
            StatusCode::INTERNAL_SERVER_ERROR
        ))
    }
    Err(err)
}

fn with_db(db: DbPool) -> impl Filter<Extract = (DbConnection,), Error = Rejection> + Clone {
    // warp::any().map(move || db.clone())
    warp::any().map(move || {
        db.get().unwrap()
    })
}

pub fn routes(db: DbPool) -> impl Filter<Extract = (impl Reply, ), Error = Rejection> + Clone {
    user_management::routes(db)
        .recover(handle_rejection)
}
