import { app, BrowserWindow, ipcMain } from "electron/main";
import { fileURLToPath } from 'url';
import * as path from "path";
import * as fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        autoHideMenuBar: true,
        webPreferences: {
            devTools: false,
            preload: path.join(__dirname, "views", "preload.js") // Corrected path
        }
    });

    win.loadFile("views/index.html");
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
	
	ipcMain.handle("slice-pdf", async (_, data) => {
        const { configFile, pdfFile, outputDir } = data;
        console.log(`Config File: ${configFile}`);
        console.log(`PDF File: ${pdfFile}`);
        console.log(`Output Directory: ${outputDir}`);

        // Here you would add the logic to slice the PDF using the provided config
        // For example, you might read the config file and use a PDF library to slice the PDF
        // This is a placeholder for your slicing logic
        try {
            // Your slicing logic here
            // For example: await slicePdf(configFile, pdfFile, outputDir);
            return 'PDF slicing completed successfully!';
        } catch (error) {
            console.error('Error slicing PDF:', error);
            throw error;
        }
    });
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit()
	}
})