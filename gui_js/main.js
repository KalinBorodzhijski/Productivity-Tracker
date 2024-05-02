const { app, BrowserWindow, ipcMain } = require('electron');
const { exec } = require('child_process');
const path = require('path');

const flaskAppPath = path.join(__dirname, 'server.exe');
const serverWorkingDirectory = __dirname;
console.log(__dirname)

let flaskApp = exec(flaskAppPath, { cwd: serverWorkingDirectory });

flaskApp.stdout.on('data', (data) => {
  console.log(`Flask: ${data}`);
});

flaskApp.stderr.on('data', (data) => {
  console.error(`Flask Error: ${data}`);
});

flaskApp.on('close', (code) => {
  console.log(`Flask process exited with code ${code}`);
});


let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webviewTag: true
        }
    });

    mainWindow.loadFile('./google_calendar_page/google-calendar.html');
    mainWindow.setMenu(null);
}

ipcMain.on('navigate', (event, page) => {
  mainWindow.loadFile(page);
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    killFlaskApp();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
    killFlaskApp();
});

function killFlaskApp() {
  if (flaskApp) {
    const isWindows = process.platform === "win32";
    if (isWindows) {
      exec(`taskkill /pid ${flaskApp.pid} /T /F`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error killing Flask server: ${error}`);
        }
      });
    } else {
      flaskApp.kill();
    }
  }
}