use serde::Deserialize;

use warp::{Filter, Rejection, Reply};

use crate::api::{server_error, with_auth, with_db, with_todo_id_param};
use crate::{create_todo, get_active_todos, models, Db};

async fn active_handler(db: Db, user: models::User) -> Result<impl Reply, Rejection> {
    let todos = get_active_todos(db, &user).await;

    match todos {
        Ok(todos) => Ok(warp::reply::json(&todos)),
        Err(err) => Err(server_error(err)),
    }
}

fn active(db: Db) -> impl Filter<Extract = (impl Reply,), Error = Rejection> + Clone {
    warp::path::end()
        .and(warp::get())
        .and(with_db(db.clone()))
        .and(with_auth(db))
        .and_then(active_handler)
}

#[derive(Deserialize)]
struct NoteParams {
    title: String,
    notes: String,
    not_before: Option<models::Date>,
    due: Option<models::Date>,
}

async fn create_handler(
    db: Db,
    user: models::User,
    params: NoteParams,
) -> Result<impl Reply, Rejection> {
    let todo = create_todo(
        db,
        &user,
        &params.title,
        &params.notes,
        params.not_before,
        params.due,
    )
    .await;

    match todo {
        Ok(id) => Ok(warp::reply::json(&id)),
        Err(err) => Err(server_error(err)),
    }
}

fn create(db: Db) -> impl Filter<Extract = (impl Reply,), Error = Rejection> + Clone {
    warp::path::end()
        .and(warp::put())
        .and(with_db(db.clone()))
        .and(with_auth(db))
        .and(warp::body::json())
        .and_then(create_handler)
}

pub fn routes(db: Db) -> impl Filter<Extract = (impl Reply,), Error = Rejection> + Clone {
    active(db.clone())
        .or(create(db.clone()))
        // .or(done(db.clone()))
        // .or(update(db))
}
