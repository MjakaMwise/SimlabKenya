# SIMLAB PostgreSQL setup

These files create a PostgreSQL database for the SIMLAB Virtual Chemistry Lab
on a server you control.

## Start PostgreSQL

On the server, install Docker Engine and the Docker Compose plugin. Then:

```sh
cd postgres
cp .env.example .env
```

Edit `.env` and replace the example password with a long, unique random value.
Keep `.env` private; it contains a database credential. Start the database with:

```sh
docker compose up -d
docker compose ps
docker compose logs postgres
```

The database listens on `127.0.0.1:5432` on the host, and the initial schema is
loaded from `001_schema.sql` when the data volume is first created. The named
Docker volume keeps database files across container restarts.

To connect from an API running on the same server, use a connection string in
the API's private environment configuration, following this shape:

```text
postgresql://simlab_app:YOUR_PASSWORD@127.0.0.1:5432/simlab
```

Do not commit `.env` or put the connection string in browser code. Do not open
port 5432 to the public internet. If a future API runs on a different host,
configure a private network or a tightly restricted TLS connection first.

## Important: connection to the current lab

The current Teachers Bench Worker still uses Cloudflare D1 and its SQLite SQL
dialect. This PostgreSQL schema is an infrastructure foundation; starting this
container does not connect the live site to PostgreSQL or copy existing D1 data.
The next migration step is to add a server-side API on the PostgreSQL host,
adapt the Worker/API flow and SQL for PostgreSQL, and then migrate existing data.
Keep D1 enabled until that migration has been deployed and verified.

The application stores timestamps as Unix epoch milliseconds and serialized
JSON values as text to match the current Worker data model.

## Initialization behavior

PostgreSQL runs files in `/docker-entrypoint-initdb.d` only when the data
directory is empty. If you change the schema after the first startup, create a
versioned migration and apply it deliberately; editing `001_schema.sql` alone
will not alter an existing database. Do not delete the Docker volume to apply a
schema change unless you intend to erase its data.
