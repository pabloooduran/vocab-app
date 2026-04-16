'use strict';

const path = require('path');
const fs = require('fs');
const net = require('net');

// Write log to a safe absolute path
const FIXED_LOG = path.join(require('os').homedir(), 'gre-debug.log');
function writeLog(msg) {
  try { fs.appendFileSync(FIXED_LOG, `[${new Date().toISOString()}] ${msg}\n`); } catch (_) {}
}

writeLog('=== main.cjs (dynamic import) starting ===');

// Find a free TCP port
function findFreePort(preferred) {
  preferred = preferred || 3001;
  return new Promise(function(resolve, reject) {
    const server = net.createServer();
    server.listen(preferred, '127.0.0.1', function() {
      const port = server.address().port;
      server.close(function() { resolve(port); });
    });
    server.on('error', function() {
      findFreePort(preferred + 1).then(resolve, reject);
    });
  });
}

// Use dynamic import to load electron/main (works in packaged + dev)
async function main() {
  writeLog('Loading electron/main via dynamic import...');

  let electronMain;
  try {
    electronMain = await import('electron/main');
    writeLog('electron/main loaded, keys: ' + Object.keys(electronMain).join(','));
  } catch (e) {
    writeLog('Failed to import electron/main: ' + e.message);
    // Fallback: try require
    try {
      const mod = require('electron');
      writeLog('require(electron) type: ' + typeof mod);
      if (typeof mod === 'object' && mod.app) {
        electronMain = mod;
      }
    } catch (e2) {
      writeLog('require(electron) also failed: ' + e2.message);
    }
    if (!electronMain) {
      writeLog('FATAL: cannot load electron APIs');
      process.exit(1);
    }
  }

  const app = electronMain.app || electronMain.default?.app;
  const BrowserWindow = electronMain.BrowserWindow || electronMain.default?.BrowserWindow;
  const dialog = electronMain.dialog || electronMain.default?.dialog;

  writeLog('app type: ' + typeof app);

  if (!app || typeof app.whenReady !== 'function') {
    writeLog('FATAL: app.whenReady is not a function. app = ' + JSON.stringify(app));
    process.exit(1);
  }

  process.on('uncaughtException', function(err) {
    writeLog('UNCAUGHT: ' + (err.stack || err.message));
    try { if (dialog) dialog.showErrorBox('GRE Vocab Error', err.message); } catch (_) {}
    try { if (app) app.quit(); } catch (_) {}
  });

  let mainWindow;

  app.whenReady().then(async function() {
    writeLog('App ready!');
    const isDev = !app.isPackaged;
    const userData = app.getPath('userData');
    writeLog('userData: ' + userData);

    process.env.SQLITE_DB_PATH = path.join(userData, 'gre_vocab.db');

    if (isDev) {
      process.env.VOCAB_JSON_PATH = path.join(__dirname, '..', 'backend', 'src', 'data', 'gre_vocab.json');
    } else {
      process.env.VOCAB_JSON_PATH = path.join(process.resourcesPath, 'gre_vocab.json');
    }

    process.env.SERVE_STATIC = 'true';
    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = 'gre_vocab_electron_app_secret_key_2024';
    }

    let port;
    try {
      port = await findFreePort(3001);
      writeLog('Port: ' + port);
      const backendPath = path.join(__dirname, '..', 'backend', 'src', 'app.js');
      writeLog('Loading backend: ' + backendPath);
      const { startServer } = require(backendPath);
      await startServer(port);
      writeLog('Backend started on port ' + port);
    } catch (err) {
      writeLog('Backend error: ' + (err.stack || err.message));
      if (dialog) {
        dialog.showErrorBox('GRE Vocab — Startup Error', 'Failed to start the backend server:\n\n' + err.message);
      }
      app.quit();
      return;
    }

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

    mainWindow.loadURL('http://127.0.0.1:' + port);
    writeLog('Window created');

    mainWindow.on('closed', function() {
      mainWindow = null;
    });
  });

  app.on('window-all-closed', function() {
    app.quit();
  });
}

main().catch(function(err) {
  writeLog('FATAL main() error: ' + (err.stack || err.message));
  process.exit(1);
});
