const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const treeKill = require('tree-kill');

const flaskAppPath = path.join(__dirname, 'server.exe');
const serverWorkingDirectory = __dirname;

let flaskApp = spawn(flaskAppPath, { cwd: serverWorkingDirectory });

flaskApp.on('spawn', () => {
  console.log('Flask app process ID:', flaskApp.pid);
});

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

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('window-all-closed', () => {
  killFlaskApp();  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function killFlaskApp() {
  if (flaskApp && flaskApp.pid) {
    console.log(`Attempting to kill Flask server and its child processes with PID: ${flaskApp.pid}`);

    treeKill(flaskApp.pid, 'SIGKILL', (err) => {
      if (err) {
        console.error('Failed to kill Flask server and its child processes:', err);
      } else {
        console.log('Successfully killed Flask server and its child processes.');
      }
    });
  } else {
    console.log('Flask app process is not running or PID is unavailable.');
  }
}