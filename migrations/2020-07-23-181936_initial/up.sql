CREATE TABLE users (
	id INTEGER PRIMARY KEY NOT NULL,
	username TEXT UNIQUE NOT NULL,
	password_hash TEXT NOT NULL
);

CREATE INDEX user_by_username ON users (username);

CREATE TABLE auth (
	id INTEGER PRIMARY KEY NOT NULL,
	user_id INTEGER NOT NULL,
	token_hash TEXT UNIQUE NOT NULL,
	created INTEGER NOT NULL,
	FOREIGN KEY (user_id)
		REFERENCES users(id)
		ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX auth_by_token_hash ON auth (token_hash);
CREATE INDEX auth_by_user_id ON auth (user_id);

CREATE TABLE todos (
	id INTEGER PRIMARY KEY NOT NULL,
	user_id INTEGER NOT NULL,
	title TEXT NOT NULL,
	notes TEXT NOT NULL,
	not_before INTEGER,
	due INTEGER,
	done INTEGER NOT NULL DEFAULT 0,
	FOREIGN KEY (user_id)
		REFERENCES users(id)
		ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX todos_by_user_id ON todos (user_id);
CREATE INDEX todos_active_by_user_id ON todos (user_id) WHERE done > 0;
