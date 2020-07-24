use warp::{http::Uri, Filter};

use dotenv::dotenv;
use sqlx::postgres::PgPool;
use std::env;

use smoltasks::api::routes as api_routes;

#[tokio::main]
async fn main() {
    dotenv().ok();

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    let pool = PgPool::builder()
        .max_size(5)
        .build(&database_url)
        .await
        .expect("can build db pool");

    let api = warp::path("api").and(api_routes(pool));
    let client = warp::path("client")
        .and(warp::fs::dir("web_client"));
    let index = warp::path::end()
        .map(|| {
            warp::redirect::redirect(Uri::from_static("/client/"))
        });

    let routes = index.or(client.or(api));

    warp::serve(routes).run(([127, 0, 0, 1], 3030)).await;
}
