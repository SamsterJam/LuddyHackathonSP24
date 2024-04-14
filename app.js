import { app, BrowserWindow, ipcMain } from "electron/main";
import { fileURLToPath } from 'url';
import * as path from "path";
import { readFile, writeFile } from "fs/promises";
import { parse, stringify } from "ini"
import { Config } from "./dist/Config.js"
import { Entry } from "./dist/Entry.js"
import { Point } from "./dist/Point.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let config = new Config()

function createWindow() {
    const win = new BrowserWindow({
        width: 1000,
        height: 800,
        autoHideMenuBar: true,
        webPreferences: {
            devTools: false,
            preload: path.join(__dirname, "views", "preload.js")
        }
    });

    win.loadFile("views/index.html");
}

function forgeConfig() {
	let obj = {
		Files: {
			INPUT: config.input,
			OUTPUT: config.output
		},
		OCR: {
			
		}
	}
	for (let i = 1; i <= config.totalEntries; i++) {
		obj.OCR[`Text${i}`] = config.getEntry(i).text
		obj.OCR[`Loc${i}`] = [config.getEntry(i).pointOne.x, config.getEntry(i).pointOne.y, config.getEntry(i).pointTwo.x, config.getEntry(i).pointTwo.y].join(",")
	}
	console.log(obj)
}

app.whenReady().then(() => {
	createWindow()

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length == 0) {
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

		readFile(configFile).then(buff => buff.toString()).then(parse).then(configData => {
			config = new Config(configData.Files.INPUT, configData.Files.OUTPUT)
			let totalEntries = Object.keys(configData.OCR).length/2
			for (let i = 1; i <= totalEntries; i++) {
				const allPoints = configData.OCR[`Loc${i}`].split(",")
				config.addEntry(new Entry(configData.OCR[`Text${i}`], new Point(allPoints[0], allPoints[1]), new Point(allPoints[2], allPoints[3])))
			}
			try {
				return 'PDF slicing completed successfully!';
			} catch (error) {
				console.error('Error slicing PDF:', error);
				throw error;
			}
		}).catch(_ => {
			throw "There was a formatting issue with the provided config file, please try again."
		})
    });
});

app.on("window-all-closed", () => {
	if (process.platform != "darwin") {
		app.quit()
	}
})