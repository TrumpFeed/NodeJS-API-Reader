create table twitter(
id TEXT PRIMARY KEY,
full_text TEXT,
created_at timestamp
);

create table cnn(
id TEXT PRIMARY KEY,
full_text TEXT,
created_at timestamp,
origlink TEXT,
summary TEXT
);
