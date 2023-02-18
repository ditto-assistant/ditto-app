/**
 * This creates a browser window for the React app to open into.
 * official electon dos: https://www.electronjs.org/docs/latest/tutorial/quick-start#opening-your-web-page-in-a-browser-window
 * template from: https://www.section.io/engineering-education/desktop-application-with-react/ and 
 * https://mmazzarolo.com/blog/2021-08-12-building-an-electron-application-using-create-react-app/
 */

const path = require('path');

const { app, BrowserWindow, ipcMain } = require('electron');
const isDev = require('electron-is-dev');

const Store = require('electron-store');
const store = new Store();

// IPC listener
ipcMain.on('electron-store-get', async (event, val) => {
  event.returnValue = store.get(val);
});
ipcMain.on('electron-store-set', async (event, key, val) => {
  store.set(key, val);
});
ipcMain.on('electron-store-has', async (event, val) => {
  event.returnValue = store.has(val);
});

function createWindow() {
  // Create the browser window.
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  // win.loadFile("index.html");
  win.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, '../public/index.html')}`
  );
  // Open the DevTools.
  if (isDev) {
    win.webContents.openDevTools({ mode: 'detach' });
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});