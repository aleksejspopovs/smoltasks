use warp::{Filter, Rejection, Reply};

use crate::api::{server_error, with_auth, with_db, with_todo_id_param};
use crate::{create_todo, get_active_todos, mark_todo_done, update_todo, models, Db};

async fn active_handler(db: Db, user: models::User) -> Result<impl Reply, Rejection> {
    let todos = get_active_todos(db, &user).await;

    match todos {
        Ok(todos) => {
            let todos: Vec<_> = todos.into_iter().map(models::TodoDisplay::from_todo).collect();
            Ok(warp::reply::json(&todos))
        }
        Err(err) => Err(server_error(err)),
    }
}

fn active(db: Db) -> impl Filter<Extract = (impl Reply,), Error = Rejection> + Clone {
    warp::get()
        .and(warp::path::end())
        .and(with_db(db.clone()))
        .and(with_auth(db))
        .and_then(active_handler)
}

async fn create_handler(
    db: Db,
    user: models::User,
    params: models::TodoEditable,
) -> Result<impl Reply, Rejection> {
    let todo = create_todo(db, &user, &params).await;

    match todo {
        Ok(id) => Ok(warp::reply::json(&id)),
        Err(err) => Err(server_error(err)),
    }
}

fn create(db: Db) -> impl Filter<Extract = (impl Reply,), Error = Rejection> + Clone {
    warp::put()
        .and(warp::path::end())
        .and(with_db(db.clone()))
        .and(with_auth(db))
        .and(warp::body::json())
        .and_then(create_handler)
}

async fn done_handler(
    db: Db,
    todo_id: models::TodoId,
    done: bool,
) -> Result<impl Reply, Rejection> {
    let todo = mark_todo_done(db, todo_id, done).await;

    match todo {
        Ok(_) => Ok(warp::reply::json(&true)),
        Err(err) => Err(server_error(err)),
    }
}

fn done(db: Db) -> impl Filter<Extract = (impl Reply,), Error = Rejection> + Clone {
    warp::post()
        .and(with_db(db.clone()))
        .and(with_todo_id_param(db))
        .and(warp::path("done"))
        .and(warp::path::end())
        .and(warp::body::json())
        .and_then(done_handler)
}

async fn update_handler(
    db: Db,
    todo_id: models::TodoId,
    update: models::TodoEditable,
) -> Result<impl Reply, Rejection> {
    let todo = update_todo(db, todo_id, &update).await;

    match todo {
        Ok(_) => Ok(warp::reply::json(&true)),
        Err(err) => Err(server_error(err)),
    }
}

fn update(db: Db) -> impl Filter<Extract = (impl Reply,), Error = Rejection> + Clone {
    warp::put()
        .and(with_db(db.clone()))
        .and(with_todo_id_param(db))
        .and(warp::path::end())
        .and(warp::body::json())
        .and_then(update_handler)
}

pub fn routes(db: Db) -> impl Filter<Extract = (impl Reply,), Error = Rejection> + Clone {
    active(db.clone())
        .or(create(db.clone()))
        .or(done(db.clone()))
        .or(update(db))
}
