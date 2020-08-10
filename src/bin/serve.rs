use warp::{http::Uri, Filter};

use dotenv::dotenv;
use sqlx::postgres::PgPool;
use std::env;
use std::net::SocketAddr;

use smoltasks::api::routes as api_routes;

#[tokio::main]
async fn main() {
    dotenv().ok();

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let bind_addr: SocketAddr = env::var("BIND_ADDR")
        .expect("BIND_ADDR must be set")
        .parse()
        .expect("BIND_ADDR is valid addr");
    let client_path = env::var("CLIENT_PATH").unwrap_or("web_client".to_string());

    let pool = PgPool::builder()
        .max_size(5)
        .build(&database_url)
        .await
        .expect("can build db pool");

    let api = warp::path("api").and(api_routes(pool));
    let client = warp::path("client")
        .and(warp::fs::dir(client_path));
    let index = warp::path::end()
        .map(|| {
            warp::redirect::redirect(Uri::from_static("/client/"))
        });

    let routes = index.or(client.or(api));

    warp::serve(routes).run(bind_addr).await;
}
