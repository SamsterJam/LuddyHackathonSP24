import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { fileURLToPath } from 'url';
import * as path from 'path';
import { readFile, writeFile } from 'fs/promises';
import { parse, stringify } from 'ini';
import { Config } from './dist/Config.js';
import { Entry } from './dist/Entry.js';
import { Point } from './dist/Point.js';
import { convertPDF } from 'pdf2image';
import sharp from 'sharp';
import Tesseract from 'tesseract.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let config = new Config();

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 1000,
        autoHideMenuBar: true,
        webPreferences: {
            devTools: false,
            preload: path.join(__dirname, 'views', 'preload.js'),
        },
    });

    win.loadFile('views/index.html');
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
	return stringify(obj)
}

async function ocrScan() {
    const result = {};
    const options = {
        density: 100,
        quality: 100,
        outputType: 'png',
        pages: '*',
    };

    try {
        const images = await convertPDF(config.input, options);
        for (const [index, image] of images.entries()) {
            console.log('Processing image: ', image);
            for (const boundary of config.entries) {
                const { pointOne, pointTwo, text } = boundary;
                const croppedImage = await sharp(image)
                    .extract({
                        left: Math.floor(pointOne.x),
                        top: Math.floor(pointOne.y),
                        width: Math.floor(pointTwo.x - pointOne.x),
                        height: Math.floor(pointTwo.y - pointOne.y),
                    })
                    .toBuffer();

                const ocrData = await Tesseract.recognize(croppedImage, 'eng');
                const isMatch = ocrData.data.text
                    .toUpperCase()
                    .split(/\s+/)
                    .includes(text.toUpperCase());

                if (isMatch) {
                    result[index + 1] = text;
                    break; // Stop processing other boundaries if a match is found
                }
            }
        }
        console.log(result);
    } catch (e) {
        console.error(e);
        // error handling
    }
}



app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.whenReady().then(() => {
	createWindow()

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length == 0) {
			createWindow()
		}
	})

	ipcMain.handle("config:setInputFile", (_, fileName) => {
		config.input = fileName
	})
	
	ipcMain.handle("config:loadConfig", async (_, configFile) => {
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

	ipcMain.handle("config:saveBounds", async (event, bounds) => {
		// Process bounds and update the config object
		config.clearEntries();
		for (let bound in bounds) {
			config.addEntry(new Entry(bound, new Point(Math.min(bounds[bound][0], bounds[bound][2]), Math.min(bounds[bound][1], bounds[bound][3])), new Point(Math.max(bounds[bound][0], bounds[bound][2]), Math.max(bounds[bound][1], bounds[bound][3]))));
		}
	
		// Show save dialog to the user
		const { filePath } = await dialog.showSaveDialog({
			title: 'Save Config File',
			buttonLabel: 'Save',
			filters: [
				{ name: 'Config Files', extensions: ['ini'] },
				{ name: 'All Files', extensions: ['*'] }
			],
			properties: ['createDirectory', 'showOverwriteConfirmation']
		});
	
		// If the user cancels the save dialog, filePath will be undefined
		if (filePath) {
			// Generate the config string
			const configString = forgeConfig();
	
			// Write the config string to the selected file path
			try {
				ocrScan()
				await writeFile(filePath, configString);
				return 'Config file saved successfully!';
			} catch (error) {
				console.error('Error saving config file:', error);
				throw error;
			}
		} else {
			// User canceled the save dialog
			throw 'Save operation was canceled by the user.';
		}
	});

	app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("window-all-closed", () => {
	if (process.platform != "darwin") {
		app.quit()
	}
})