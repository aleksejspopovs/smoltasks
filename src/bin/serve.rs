use warp::Filter;

use diesel::prelude::*;
use diesel::r2d2::{ConnectionManager, Pool};
use dotenv::dotenv;
use std::env;

use smoltasks::api::routes as api_routes;

#[tokio::main]
async fn main() {
    dotenv().ok();

    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");

    let manager = ConnectionManager::new(database_url);
    let pool = Pool::builder()
        .max_size(15)
        .build(manager)
        .unwrap();

    let api = warp::path("api")
        .and(api_routes(pool));

    let routes = api;

    warp::serve(routes)
        .run(([127, 0, 0, 1], 3030))
        .await;
}
