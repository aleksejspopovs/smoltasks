#[macro_use]
extern crate diesel;

use scrypt;

use diesel::r2d2::{ConnectionManager, Pool, PooledConnection};
use diesel::sqlite::SqliteConnection;
use diesel::RunQueryDsl;
use diesel::result::{Error, DatabaseErrorKind};

pub mod api;
pub mod models;
pub mod schema;

pub type DbPool = Pool<ConnectionManager<SqliteConnection>>;
pub type DbConnection = PooledConnection<ConnectionManager<SqliteConnection>>;

no_arg_sql_function!(last_insert_rowid, diesel::sql_types::Bigint);

fn create_user(conn: DbConnection, username: String, password: String) -> Option<models::UserId> {
    let scrypt_params = scrypt::ScryptParams::recommended();
    let password_hash = scrypt::scrypt_simple(&password, &scrypt_params)
        .expect("OsRng shouldn't fail");

    let new_user = models::NewUser {username, password_hash};

    let result = diesel::insert_into(schema::users::table)
        .values(&new_user)
        .execute(&conn);

    match result {
        Ok(_) => {
            let id = diesel::select(last_insert_rowid).first(&conn).unwrap();
            Some(id)
        }
        Err(Error::DatabaseError(DatabaseErrorKind::UniqueViolation, _)) => None,
        Err(_) => {
            // TODO
            panic!("unexpected error");
        }
    }
}

// fn auth_user(pool: DbPool, username: String, password: String) -> Option<models::AuthToken> {

// }
