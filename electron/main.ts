require('update-electron-app')({
  logger: require('electron-log')
})
import {
  app,
  BrowserWindow,
  Notification,
  Tray,
  Menu,
  nativeImage,
} from "electron";
import path from "node:path";
import { glob } from "glob";
import {
  setupTitlebar,
  attachTitlebarToWindow,
} from "custom-electron-titlebar/main";

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.js
// │
app.setAppUserModelId(process.execPath);

//TitleBar personalization module
setupTitlebar();


process.env.DIST = path.join(__dirname, "../dist");
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, "../public");
let win: BrowserWindow | null;
// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];

function createWindow() {
  win = new BrowserWindow({
    width: 1080,
    minWidth: 680,
    height: 840,
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    titleBarStyle: "hidden",
    titleBarOverlay: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });
  attachTitlebarToWindow(win);

  // Test active push message to Renderer-process.
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(process.env.DIST, "index.html"));
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

//Tray, taskbar and notification styling

const NOTIFICATION_TITLE = "Basic Notification";
const NOTIFICATION_BODY = "Notification from the Main process";

function showNotification() {
  new Notification({
    title: NOTIFICATION_TITLE,
    body: NOTIFICATION_BODY,
  }).show();
}

let tray;

app
  .whenReady()
  .then(createWindow)
  .then(showNotification)
  .then(() => {
    const icon = nativeImage.createFromPath("./src/assets/light.png");
    tray = new Tray(icon);

    const contextMenu = Menu.buildFromTemplate([
      { label: "Item1", type: "radio" },
      { label: "Item2", type: "radio" },
      { label: "Item3", type: "radio", checked: true },
      { label: "Item4", type: "radio" },
    ]);

    tray.setContextMenu(contextMenu);
    tray.setToolTip("This is my application");
    tray.setTitle("This is my title");

    app.setUserTasks([
      {
        program: process.execPath,
        arguments: "--new-window",
        iconPath: process.execPath,
        iconIndex: 0,
        title: "New Window",
        description: "Create a new window",
      },
    ]);

    // Make this app a single instance app.
    //
    // The main window will be restored and focused instead of a second window
    // opened when a person attempts to launch a second instance.
    //
    // Returns true if the current version of the app should quit instead of
    // launching.
    function makeSingleInstance() {
      if (process.mas) return;

      app.requestSingleInstanceLock();

      app.on("second-instance", () => {
        if (win) {
          if (win.isMinimized()) win.restore();
          win.focus();
        }
      });
    }

    // Require each JS file in the main-process dir
    function loadDemos() {
      const files = glob.sync(path.join(__dirname, "main-process/**/*.js"));
      files.forEach((file) => {
        require(file);
      });
    }
    function initialize() {
      makeSingleInstance();
      loadDemos();
    }
    initialize();
  });
