use sqlx::{pool::PoolConnection, Cursor, Row, SqliteConnection};

use std::error::Error;

pub async fn last_insert_rowid(
    conn: &mut PoolConnection<SqliteConnection>,
) -> Result<i32, Box<dyn Error>> {
    // TODO: this should be much simpler after the next sqlx release
    // when sqlx::query! is fixed on sqlite
    let mut cursor = sqlx::query("SELECT last_insert_rowid() as id").fetch(conn);

    let row = cursor
        .next()
        .await?
        .expect("last_insert_rowid() returns a row");
    Ok(row.get(0))
}
