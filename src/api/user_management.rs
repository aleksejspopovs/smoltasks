use std::convert::Infallible;

use diesel::sqlite::SqliteConnection;

use serde::{Deserialize, Serialize};
use serde_json::json;

use warp::{Filter, Reply, Rejection};

use crate::{DbPool, DbConnection, create_user};
use crate::api::{api_error, with_db};
use crate::models;
use crate::schema;

#[derive(Deserialize)]
struct SignUpParams {
    username: String,
    password: String,
}

async fn sign_up_handler(conn: DbConnection, params: SignUpParams) -> Result<impl Reply, Rejection> {
    match create_user(conn, params.username, params.password) {
        Some(id) => {
            Ok(format!("{}", id))
        }
        None => {
            Err(api_error("username already exists"))
        }
    }
}

fn sign_up(db: DbPool) -> impl Filter<Extract = (impl Reply, ), Error = Rejection> + Clone {
    warp::path("sign_up")
        .and(warp::path::end())
        .and(with_db(db))
        .and(warp::post())
        .and(warp::body::json())
        .and_then(sign_up_handler)
}

pub fn routes(db: DbPool) -> impl Filter<Extract = (impl Reply, ), Error = Rejection> + Clone {
    sign_up(db)
}
