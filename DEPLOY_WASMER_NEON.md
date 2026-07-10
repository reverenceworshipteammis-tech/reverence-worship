# Deploy Reverence Worship to Wasmer Edge with Neon

This project is now prepared for a Wasmer Edge test deployment using Neon PostgreSQL.

## 1. Create the Neon database

Create a Neon project. If you already created the database but did not copy the connection string, that is okay.

Go back to Neon:

1. Open your Neon project.
2. Click **Dashboard**.
3. Click **Connect** or **Connection Details**.
4. Select **PostgreSQL** / **psql**.
5. Copy either the full connection string or copy these values one by one:

- host
- database name
- username
- password
- port, usually `5432`

Neon requires SSL, so keep:

```env
DB_SSLMODE=require
```

## 2. Import all tables into Neon

Use this file:

```text
database_neon.sql
```

If your Neon database is already partially imported and you see errors like:

```text
relation "permission_requests" does not exist
relation "landing_youtube_videos" does not exist
```

then reset the test database first.

Run this file in Neon SQL Editor:

```text
database_neon_reset_before_import.sql
```

Then run:

```text
database_neon.sql
```

Warning: `database_neon_reset_before_import.sql` deletes all tables/data in the selected Neon database. Use it only for this test deployment database. After reset/import, run the super admin seeder again.

It was generated from `database_dep.sql`, but the local-only commands were removed:

- `DROP DATABASE`
- `CREATE DATABASE`
- `\c reverence_worship`

Those commands are not suitable for Neon because you already create the database from the Neon dashboard.

### Option A: Import using Neon SQL Editor

This is easiest if you do not have `psql` installed.

1. Open Neon dashboard.
2. Open **SQL Editor**.
3. Open [database_neon.sql](database_neon.sql).
4. Copy the SQL content.
5. Paste it into Neon SQL Editor.
6. Run it.

This creates all system tables, indexes, foreign keys, and database structure needed online.

### Option B: Import using `psql`

If you have `psql` installed, run:

```bash
psql "postgresql://USER:PASSWORD@HOST.neon.tech/DBNAME?sslmode=require" -f database_neon.sql
```

Replace:

- `USER`
- `PASSWORD`
- `HOST`
- `DBNAME`

with the values from Neon.

If your password has special characters like `@`, `#`, `?`, `/`, or `:`, use the connection string Neon gives you directly, because Neon encodes the password correctly.

### Neon endpoint/SNI fix for Laravel

If Laravel shows this error:

```text
Endpoint ID is not specified
```

use Neon's Laravel password format:

```env
DB_PASSWORD='endpoint=YOUR_ENDPOINT_ID$YOUR_REAL_PASSWORD'
```

Example:

```env
DB_HOST="ep-your-endpoint-pooler.region.aws.neon.tech"
DB_PASSWORD='endpoint=ep-your-endpoint$your-password'
```

The endpoint ID is the first part of your Neon host, before `-pooler` or before the first dot.

Neon must have the tables before Laravel can use:

```env
SESSION_DRIVER=database
CACHE_STORE=database
QUEUE_CONNECTION=database
```

## 2.1. If you want Laravel-style migration

For this deployment, `database_neon.sql` is the migration source for all tables.

Reason: the current Laravel migrations folder does not contain every table used by the full system. The full database structure is in `database_dep.sql`, and the Neon-safe version is `database_neon.sql`.

So for Neon, do not rely only on:

```bash
php artisan migrate
```

Use `database_neon.sql` first.

After the schema is imported, future small table changes can be added as normal Laravel migrations.

## 2.2. Create the first super admin

The online database needs one first super admin user, otherwise nobody can log in and manage the system.

After importing `database_neon.sql`, run this command locally while your `.env` points to Neon:

```powershell
$env:ADMIN_NAME='Super Admin'
$env:ADMIN_EMAIL='superadmin@reverence.com'
$env:ADMIN_PASSWORD='use-a-strong-password-here'
php artisan db:seed --class=ProductionAdminSeeder --force
```

On macOS/Linux:

```bash
ADMIN_NAME='Super Admin' \
ADMIN_EMAIL='superadmin@reverence.com' \
ADMIN_PASSWORD='use-a-strong-password-here' \
php artisan db:seed --class=ProductionAdminSeeder --force
```

This creates or updates:

- role: `super-admin`
- user: `superadmin@reverence.com`
- role assignment in `role_user`

Do not commit the real password anywhere.

If you run this once with a temporary password, log in immediately and change it.

## 3. Generate a production app key

Run locally:

```bash
php artisan key:generate --show
```

Copy the generated value. You will use it as `APP_KEY`.

## 4. Build production dependencies/assets

Wasmer packages the files that exist in the project. Before deploy:

```bash
composer install --no-dev --optimize-autoloader
npm install
npm run build
php artisan config:clear
php artisan route:clear
php artisan view:clear
```

Important: `public/build` is gitignored, so make sure it exists locally before `wasmer deploy`.

## 5. Update `app.yaml`

Open `app.yaml` and replace:

```yaml
owner: your-wasmer-username
```

with your real Wasmer username/namespace.

After the first deploy, update `APP_URL` as a Wasmer secret with the real Wasmer app URL.

## 6. Set Wasmer secrets

Do not commit real passwords. Set them with the Wasmer CLI:

```bash
wasmer app secrets create APP_KEY "base64:..."
wasmer app secrets create APP_URL "https://your-app.wasmer.app"
wasmer app secrets create DB_HOST "your-neon-host.neon.tech"
wasmer app secrets create DB_DATABASE "your_neon_database"
wasmer app secrets create DB_USERNAME "your_neon_user"
wasmer app secrets create DB_PASSWORD 'endpoint=your_endpoint_id$your_neon_password'
```

If you did not copy the Neon connection string earlier, use the Neon dashboard connection details to fill the commands above:

- `DB_HOST` = Neon host, like `ep-something.region.aws.neon.tech`
- `DB_DATABASE` = database name
- `DB_USERNAME` = role/user name
- `DB_PASSWORD` = password

`DB_PORT` and `DB_SSLMODE` are already in `app.yaml`:

```env
DB_PORT=5432
DB_SSLMODE=require
```

Optional Google login secrets, if Google login should work in production:

```bash
wasmer app secrets create GOOGLE_CLIENT_ID "..."
wasmer app secrets create GOOGLE_CLIENT_SECRET "..."
wasmer app secrets create GOOGLE_REDIRECT_URI "https://your-app.wasmer.app/auth/google/callback"
```

## 7. Test locally with Wasmer

If Wasmer CLI is installed:

```bash
wasmer run .
```

Then open the local URL printed by Wasmer.

## 8. Deploy

```bash
wasmer deploy
```

## 9. After deploy, test these pages

- landing page
- login/register
- Google login, if configured
- dashboards
- permission manager
- intercession forms: create, take, results, manage submissions
- attendance
- contributions
- announcements
- uploads/images

## Notes

- This is for production-style testing. If the app becomes slow or memory-limited, move to a normal Laravel VPS/Render/Railway deployment.
- Wasmer volumes are not configured here. For durable uploads at scale, use S3-compatible storage later.
- Current app config uses database-backed sessions/cache/queue so the app does not rely on local writable storage for those features.
