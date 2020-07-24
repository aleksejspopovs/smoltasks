use serde::Deserialize;

use warp::{Filter, Rejection, Reply};

use crate::api::{api_error, server_error, with_auth, with_db};
use crate::{auth_user, create_user, models, AuthUserResult, CreateUserResult, Db};

use std::convert::Infallible;

#[derive(Deserialize)]
struct SignUpParams {
    username: String,
    password: String,
}

async fn sign_up_handler(db: Db, params: SignUpParams) -> Result<impl Reply, Rejection> {
    match create_user(db, &params.username, &params.password).await {
        Ok(CreateUserResult::Ok) => Ok(warp::reply::json(&true)),
        Ok(CreateUserResult::UsernameExists) => Err(api_error("username already exists")),
        Err(err) => Err(server_error(err)),
    }
}

fn sign_up(db: Db) -> impl Filter<Extract = (impl Reply,), Error = Rejection> + Clone {
    warp::post()
        .and(warp::path("sign_up"))
        .and(warp::path::end())
        .and(with_db(db))
        .and(warp::body::json())
        .and_then(sign_up_handler)
}

#[derive(Deserialize)]
struct AuthParams {
    username: String,
    password: String,
}

async fn login_handler(db: Db, params: AuthParams) -> Result<impl Reply, Rejection> {
    match auth_user(db, &params.username, &params.password).await {
        Ok(AuthUserResult::Ok(token)) => Ok(warp::reply::json(&token)),
        Ok(AuthUserResult::InvalidCredentials) => Err(api_error("username or password wrong")),
        Err(err) => Err(server_error(err)),
    }
}

fn login(db: Db) -> impl Filter<Extract = (impl Reply,), Error = Rejection> + Clone {
    warp::post()
        .and(warp::path("login"))
        .and(warp::path::end())
        .and(with_db(db))
        .and(warp::body::json())
        .and_then(login_handler)
}

async fn whoami_handler(user: models::User) -> Result<impl Reply, Infallible> {
    Ok(warp::reply::json(&user.username))
}

fn whoami(db: Db) -> impl Filter<Extract = (impl Reply,), Error = Rejection> + Clone {
    warp::get()
        .and(warp::path("whoami"))
        .and(warp::path::end())
        .and(with_auth(db))
        .and_then(whoami_handler)
}

pub fn routes(db: Db) -> impl Filter<Extract = (impl Reply,), Error = Rejection> + Clone {
    sign_up(db.clone())
        .or(login(db.clone()))
        .or(whoami(db))
}
