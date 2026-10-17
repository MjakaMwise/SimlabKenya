# VPS Deployment Runbook

One VPS runs three containers via `docker compose`: **web** (Caddy + built React app, HTTPS), **api** (Express) and **db** (Postgres 16). See `docs/OCEAN_SHUJAA_BACKEND_PLAN.md` for the architecture.

## 1. Quick path: `start-setup.sh`

On a fresh Ubuntu/Debian VPS, create the DNS `A` records for `simlabkenya.co.ke` and `www.simlabkenya.co.ke` pointing at the VPS IP, then:

```bash
git clone <repo-url> SimlabKenya && cd SimlabKenya
./start-setup.sh
```

The script is safe to re-run; finished steps are skipped. It:

1. **Preflight** – OS, sudo, disk (≥5 GB), memory.
2. **Installs what is missing** – git, curl, openssl, ufw, Docker Engine and the compose plugin.
3. **Firewall** – allows SSH (first, so you are never locked out), 80 and 443 only.
4. **Configures `.env`** – copies `.env.example` (existing `.env` values are the prompt defaults: Enter keeps them, typing changes them; nothing is overwritten silently), generates missing `POSTGRES_PASSWORD` and `JWT_SECRET` (and, after the image build, the `VAPID_*` keys that Team Desk push notifications need; existing keys are never replaced), asks for the domain and Resend values, validates them, sets mode 600.
5. **Verifies before deploying** – project files, `docker compose config`, ports 80/443 free, DNS points at this server, then builds the images.
6. **Deploys** – starts Postgres, applies `db/init/*.sql`, creates the first admin, starts API + web.
7. **Verifies after deploying** – API health, tables exist, an admin exists, **the Resend key works and (optionally) a real test email is delivered**, public form validates input, admin routes reject anonymous requests, Postgres not exposed, HTTPS site responds.
8. **Installs a daily backup cron** (02:00, keeps 14).

Options: `--skip-email-check`, `--verify-only` (checks, changes nothing), `--yes` (no prompts; put values in `.env` or the environment), `--skip-firewall`, `--skip-dns-check`, `--skip-cron`.

For unattended runs set `ADMIN_BOOTSTRAP_EMAIL` and `ADMIN_BOOTSTRAP_PASSWORD` in `.env`; the script removes the password from `.env` after creating the account.

## 2. Admin login

Admin accounts live in the VPS Postgres (`admin_users`), on the VPS. Signing in is password → 6-digit code emailed through Resend → 8-hour session. The code step is enforced by the server.

```bash
# create another admin, or reset a password
docker compose run --rm api npx tsx server/scripts/create-admin.ts
```

### Checking that email works

Every email (login codes, orders, abstracts, Ocean Shujaa) goes through Resend. Three ways to verify:

```bash
./deploy/test-email.sh                  # checks the Resend key only
./deploy/test-email.sh you@example.com  # also sends a real test message
docker compose logs api | grep "\[Email\]"   # the API checks the login at every start
```

Admin → Settings → Notifications also has a **Send test email** button. Failures say why (missing or invalid `RESEND_API_KEY`, or `EMAIL_FROM` not on a domain verified at resend.com/domains).

### Forgot the admin password / lock-out

On the VPS, from the repo folder:

```bash
./deploy/reset-admin.sh                     # prompts for the new password
./deploy/reset-admin.sh --email a@b.c --generate   # random password, shown once
./deploy/reset-admin.sh --list              # list admins
./deploy/reset-admin.sh --revoke-all        # sign every admin out everywhere
./deploy/reset-admin.sh --delete a@b.c      # remove an admin (never the last one)
```

A reset also discards pending login codes and signs that admin out on all devices. Login codes still need Resend to be working (`RESEND_API_KEY`).

Existing Supabase admin passwords are **not** migrated; create the account again with the script. Changing `JWT_SECRET` signs every admin out. Supabase is no longer used anywhere: shop products and orders are also in the VPS Postgres (`db/init/003_shop.sql`, seeded with the 5 starter products).

## 3. Manual path (what the script automates)

```bash
curl -fsSL https://get.docker.com | sudo sh && sudo usermod -aG docker $USER   # re-login after
sudo ufw allow OpenSSH && sudo ufw allow 80,443/tcp && sudo ufw enable
cp .env.example .env && nano .env      # openssl rand -hex 48 for JWT_SECRET, openssl rand -hex 24 for POSTGRES_PASSWORD
docker compose up -d --build
docker compose run --rm api npx tsx server/scripts/create-admin.ts
```

The `db/init/*.sql` files run automatically on an empty database. On an existing database apply them by hand (they are idempotent):
`docker compose exec -T db psql -U simlab simlab < db/init/002_admin_auth.sql`

## 3b. Bringing over old Supabase data (optional, one-off)

If the old shop has real orders or edited products, export each table from the Supabase dashboard (Table editor → Export as CSV), copy the files to the VPS and load them:

```bash
docker compose exec -T db psql -U simlab simlab -c "\copy orders FROM STDIN WITH CSV HEADER" < orders.csv
# products: empty the seeded catalogue first if you are importing your own
docker compose exec -T db psql -U simlab simlab -c "TRUNCATE products" 
docker compose exec -T db psql -U simlab simlab -c "\copy products FROM STDIN WITH CSV HEADER" < products.csv
```

Column names are identical to the old Supabase tables. Admin accounts are not imported; create them with `create-admin.ts`.

## 4. Updating the site

```bash
cd SimlabKenya && ./deploy/deploy.sh
```

## 5. Backups and restore

```bash
./deploy/backup.sh                                   # manual backup into ./backups
crontab -e   # add:  0 2 * * * /home/<user>/SimlabKenya/deploy/backup.sh >> /home/<user>/backup.log 2>&1

# restore (replaces current data)
gunzip -c backups/simlab-XXXX.sql.gz | docker compose exec -T db psql -U simlab simlab
# uploads (abstract files, shop pictures)
docker compose exec -T api tar -C /data -xzf - < backups/uploads-XXXX.tar.gz
```

Copy `backups/` off the server regularly (e.g. `rsync` to another machine).

## 6. Troubleshooting

| Symptom | Check |
|---|---|
| Site not loading over HTTPS | `docker compose logs web` — usually DNS not pointing at the VPS yet |
| `/api/...` returns 502 | `docker compose logs api` — missing `.env` values (e.g. `JWT_SECRET` or `RESEND_API_KEY` missing) |
| API cannot reach DB | `docker compose logs db`; confirm `POSTGRES_PASSWORD` was not changed after the volume was created (the volume keeps the original password) |
| Abstract or shop-image uploads fail | `docker compose logs api`; check the `uploads` volume is mounted (`docker compose exec api ls -ld /data/uploads` should be owned by `node`) |
| Admin login says "Failed to send verification code" | Run `./deploy/test-email.sh`; check `RESEND_API_KEY`, `EMAIL_FROM` and `docker compose logs api` |
| API exits at start with JWT_SECRET error | Set `JWT_SECRET` (32+ chars) in `.env` |

## 7. After cut-over

Everything runs on the VPS: Postgres (data), the `uploads` volume (abstract files and shop pictures), Resend (email). There is no Firebase, Cloudinary, Supabase, Vercel or Gmail SMTP dependency.
