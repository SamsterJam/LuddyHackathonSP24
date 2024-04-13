import { app, BrowserWindow, ipcMain } from "electron/main"

import * as path from "path"

function createWindow() {
	const win = new BrowserWindow({
		width: 800,
		height: 600,
		autoHideMenuBar: true,
		webPreferences: {
			devTools: false,
			preload: path.dirname("views/preload.js")
		}
	})

  win.loadFile("views/index.html")
}

app.whenReady().then(() => {
	createWindow()

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow()
		}
	})

	ipcMain.handle("config:setInputFile", (_, fileName) => {
		console.log(fileName)
	})
})

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit()
	}
})