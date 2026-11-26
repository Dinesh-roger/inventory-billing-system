# Deploying for free (CI/CD)

CI/CD = GitHub Actions (`.github/workflows/ci.yml`): every push / pull request builds the backend and frontend.
When `main` passes, the backend is redeployed automatically. Netlify redeploys the frontend from GitHub.

Free plans change often. Check each provider's current limits before you rely on them.

## Which option?

| | Option A: Render + Netlify + TiDB Cloud | Option B: Oracle Cloud Always Free VM |
|---|---|---|
| Cost | Free | Free |
| Always on? | No. Backend sleeps after 15 min idle, first request after that takes about a minute | Yes |
| Card needed | Maybe (Render may ask) | Yes (verification only) |
| Effort | Low, all in dashboards | Medium, you manage a Linux server |
| Data | MySQL-compatible TiDB with a free quota | MySQL in Docker on your VM (you do backups) |

For a real shop billing all day, Option B is more comfortable. Option A is fine for demo / light use.

## One-time: push the project to GitHub
```
git init
git add .
git commit -m "Inventory and billing system"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```
Make the repo **private** (it holds your shop's setup). Never commit `.env`.

## Option A: Render + Netlify + TiDB Cloud

### 1. Database (TiDB Cloud Starter, MySQL-compatible)
1. Create a free Starter instance, then open the SQL editor and run: `CREATE DATABASE inventory_db;`
2. Click Connect and note host, port (4000), username and password.
3. Your `DB_URL` will look like:
   `jdbc:mysql://<host>:4000/inventory_db?sslMode=VERIFY_IDENTITY&serverTimezone=Asia/Kolkata`
   (If TLS verification fails, try `sslMode=REQUIRED`.)

### 2. Backend on Render
1. Render > New > Blueprint > pick your repo (uses `render.yaml`), or New > Web Service > Docker with root `backend`.
2. Set environment variables:
   - `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` from step 1
   - `JWT_SECRET` = output of `openssl rand -base64 48`
   - `ADMIN_PASSWORD` = a strong password for the `admin` login
   - `SEED_SAMPLE_DATA` = `false`
   - `CORS_ORIGINS` = your Netlify URL (set after step 3)
   - `SHOP_NAME`, `SHOP_ADDRESS`, `SHOP_PHONE`, `SHOP_GSTIN` for the invoice PDF
3. Render > your service > Settings > Deploy Hook: copy the URL.
4. GitHub repo > Settings > Secrets and variables > Actions > New secret: `RENDER_DEPLOY_HOOK_URL` = that URL.

### 3. Frontend on Netlify
1. Netlify > Add new site > Import from GitHub > pick the repo (build settings come from `netlify.toml`).
2. Site settings > Environment variables: `VITE_API_URL` = your Render URL (no trailing slash), `VITE_SHOP_NAME` = your shop name.
3. Deploy, then put the Netlify URL into `CORS_ORIGINS` on Render and redeploy the backend.

Keeping the backend awake: a free uptime monitor (for example UptimeRobot) pinging `https://<render-url>/v3/api-docs` every 5 to 10 minutes.
This is not an officially supported way to avoid sleeping on Render.

## Option B: Oracle Cloud Always Free VM (always on)
1. Create an Always Free Ampere A1 Ubuntu VM. In the VCN security list allow inbound TCP 80 (and 443 if you add HTTPS).
2. On the VM:
   ```
   sudo apt update && sudo apt install -y docker.io docker-compose-v2 git
   sudo usermod -aG docker $USER   # log out and in again
   sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT   # Oracle Ubuntu images block it by default
   git clone https://github.com/<you>/<repo>.git && cd <repo>
   cp .env.example .env && nano .env
   docker compose up -d --build
   ```
3. Open `http://<vm-public-ip>`. Updating later: `git pull && docker compose up -d --build`.
4. Backups: `docker compose exec db mysqldump -uroot -p"$DB_PASSWORD" inventory_db > backup.sql` (put it in a daily cron job and copy it off the VM).
5. HTTPS is optional but recommended (Cloudflare Tunnel or Caddy are both free).

## Before real customers use it
- Set `ADMIN_PASSWORD` and `JWT_SECRET` (the defaults in the zip are public).
- Set `SEED_SAMPLE_DATA=false` so no demo products or demo `staff/staff123` login are created.
- Use Reports > Export to Excel regularly as an extra backup.
- Free-tier databases can be paused, throttled or removed by the provider. Keep your own backups.
