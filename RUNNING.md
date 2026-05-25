# Migration and Running Guide

This project is a Node.js/Express application. It can run on Windows and Ubuntu after installing Node.js 20 LTS and npm.

## Files to Copy

Copy the whole project directory to the new computer.

Required files and folders:

- `app.js`
- `package.json`
- `package-lock.json`
- `db/`
- `middleware/`
- `routes/`
- `views/`
- `public/`
- `scripts/`
- `test/`

Optional but useful:

- `xss防御系统.db`: keep it if you want to migrate existing demo data.
- `logs/`: keep it if you want to migrate existing attack logs.

Do not copy `node_modules` unless you have to. It is better to reinstall dependencies on the new machine.

## Runtime Dependencies

Install:

- Node.js 20 LTS or newer
- npm, included with Node.js

Project npm dependencies are installed from `package.json`:

- `express`
- `ejs`
- `helmet`
- `cookie-parser`
- `express-validator`
- `dompurify`
- `jsdom`
- `sql.js`
- `nodemon`, development only

## Windows Setup

Install Node.js 20 LTS:

```powershell
winget install OpenJS.NodeJS.LTS
```

If `winget` is unavailable, install Node.js 20 LTS from:

```text
https://nodejs.org/
```

Open PowerShell in the project directory and install dependencies:

```powershell
npm ci
```

If `npm ci` fails because the lock file is incompatible, use:

```powershell
npm install
```

Run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\start-windows.ps1
```

Run on another port:

```powershell
.\scripts\start-windows.ps1 -Port 3001
```

Force reinstall dependencies and run:

```powershell
.\scripts\start-windows.ps1 -Install
```

## Ubuntu Setup

Install Node.js 20 LTS:

```bash
sudo apt update
sudo apt install -y curl ca-certificates
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Check versions:

```bash
node -v
npm -v
```

In the project directory, install dependencies:

```bash
npm ci
```

If `npm ci` fails because the lock file is incompatible, use:

```bash
npm install
```

Run:

```bash
chmod +x scripts/start-ubuntu.sh
./scripts/start-ubuntu.sh
```

Run on another port:

```bash
./scripts/start-ubuntu.sh 3001
```

Or:

```bash
PORT=3001 ./scripts/start-ubuntu.sh
```

Force reinstall dependencies and run:

```bash
INSTALL_DEPS=1 ./scripts/start-ubuntu.sh
```

## Manual Run

These commands work on both Windows and Ubuntu:

```bash
npm ci
npm start
```

The default URL is:

```text
http://localhost:3000
```

Admin login:

```text
http://localhost:3000/admin/login
```

Default admin account:

```text
admin / admin123
```

You can override the admin account before starting:

Windows PowerShell:

```powershell
$env:ADMIN_USERNAME="admin"
$env:ADMIN_PASSWORD="your-password"
.\scripts\start-windows.ps1
```

Ubuntu:

```bash
ADMIN_USERNAME=admin ADMIN_PASSWORD=your-password ./scripts/start-ubuntu.sh
```

## Common Problems

Port 3000 is already in use on Windows:

```powershell
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

Port 3000 is already in use on Ubuntu:

```bash
ss -ltnp | grep :3000
kill <PID>
```

If the browser shows old pages, use a hard refresh:

```text
Ctrl + F5
```
