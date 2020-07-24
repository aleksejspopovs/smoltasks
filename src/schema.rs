table! {
    auth (id) {
        id -> Integer,
        user_id -> Integer,
        token_hash -> Text,
        created -> Integer,
    }
}

table! {
    todos (id) {
        id -> Integer,
        user_id -> Integer,
        title -> Text,
        notes -> Text,
        not_before -> Nullable<Integer>,
        due -> Nullable<Integer>,
        done -> Integer,
    }
}

table! {
    users (id) {
        id -> Integer,
        username -> Text,
        password_hash -> Text,
    }
}

joinable!(auth -> users (user_id));
joinable!(todos -> users (user_id));

allow_tables_to_appear_in_same_query!(
    auth,
    todos,
    users,
);
