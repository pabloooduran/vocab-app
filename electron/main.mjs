// Electron 28+ requires ES modules for the main process to access electron/main
import { app, BrowserWindow, dialog } from 'electron/main';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import net from 'node:net';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Crash logging helper - write to multiple places to ensure we get it
function writeLog(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  const paths = [
    path.join(__dirname, 'gre-vocab.log'),
    'C:\\Users\\FX517\\gre-vocab-crash.log',
  ];
  for (const p of paths) {
    try { fs.appendFileSync(p, line); } catch (_) {}
  }
}

process.on('uncaughtException', (err) => {
  writeLog(`UNCAUGHT: ${err.stack || err.message}`);
});
process.on('unhandledRejection', (reason) => {
  writeLog(`UNHANDLED REJECTION: ${reason}`);
});

writeLog(`Starting. app type: ${typeof app}, app keys: ${app ? Object.keys(app).join(',') : 'null'}`);

// Find a free TCP port starting from `preferred`
function findFreePort(preferred = 3001) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(preferred, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
    server.on('error', () => {
      findFreePort(preferred + 1).then(resolve, reject);
    });
  });
}

let mainWindow;

app.whenReady().then(async () => {
  const isDev = !app.isPackaged;

  // ── Configure backend environment ──────────────────────────────────────────
  const userData = app.getPath('userData');

  // Writable DB path (persists between app updates)
  process.env.SQLITE_DB_PATH = path.join(userData, 'gre_vocab.db');

  // Bundled vocabulary JSON
  if (isDev) {
    process.env.VOCAB_JSON_PATH = path.join(
      __dirname, '..', 'backend', 'src', 'data', 'gre_vocab.json'
    );
  } else {
    // electron-builder places extraResources at process.resourcesPath
    process.env.VOCAB_JSON_PATH = path.join(process.resourcesPath, 'gre_vocab.json');
  }

  // Tell Express to serve the built React app as static files
  process.env.SERVE_STATIC = 'true';

  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'gre_vocab_electron_app_secret_key_2024';
  }

  // ── Start Express backend ─────────────────────────────────────────────────
  let port;
  try {
    port = await findFreePort(3001);
    const backendPath = path.join(__dirname, '..', 'backend', 'src', 'app.js');
    const { startServer } = require(backendPath);
    await startServer(port);
  } catch (err) {
    dialog.showErrorBox(
      'GRE Vocab — Startup Error',
      `Failed to start the backend server:\n\n${err.message}`
    );
    app.quit();
    return;
  }

  // ── Create browser window ─────────────────────────────────────────────────
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 800,
    minHeight: 600,
    title: 'GRE Vocab',
    backgroundColor: '#FDF8F0',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: isDev,
    },
    autoHideMenuBar: true,
  });

  mainWindow.loadURL(`http://127.0.0.1:${port}`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
