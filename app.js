import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { fileURLToPath } from 'url';
import { readFile, writeFile, mkdir, rm } from 'fs/promises';
import * as path from 'path';
import { parse, stringify } from 'ini';
import { Config } from './dist/Config.js';
import { Entry } from './dist/Entry.js';
import { Point } from './dist/Point.js';
import { convertPDF } from 'pdf2image';
import sharp from 'sharp';
import Tesseract from 'tesseract.js';
import { PDFDocument, StandardFonts } from "pdf-lib"

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
        density: 72,
        quality: 72,
        outputType: 'png',
        pages: '*',
    };

    try {
        const images = await convertPDF(config.input, options);
		const allImages = await Promise.all(images.map(i => i.path).map(i => readFile(i)))
		let i = 0
        for (let image of allImages) {
            console.log('Processing image: ', image);
            for (const boundary of config.entries) {
                const { pointOne, pointTwo, text } = boundary;
                const croppedImage = await sharp(image)
                    .extract({
                        left: Math.floor(pointOne.x),
                        top: Math.floor(pointOne.y),
                        width: Math.floor(pointTwo.x) - Math.floor(pointOne.x),
                        height: Math.floor(pointTwo.y) - Math.floor(pointOne.y),
                    })
                    .toBuffer();

                const ocrData = await Tesseract.recognize(croppedImage, 'eng');
                const isMatch = ocrData.data.text
                    .toUpperCase()
                    .split(/\s+/)
                    .includes(text.toUpperCase());

                if (isMatch) {
                    result[i + 1] = text;
                    break; // Stop processing other boundaries if a match is found
                }
            }
			i++
        }
		rm("eng.traineddata").catch(e => {})
		images.forEach(i => {
			rm(i.path).catch(e => {})
		})
		splitPDF(result)
    } catch (e) {
		dialog.showErrorBox("Error", "There was a problem with reading the document, please try again.")
    }
}

function splitPDF(pages) {
	readFile(config.input)
	.then(existingPdfBytes => PDFDocument.load(existingPdfBytes))
	.then(async pdfDoc => {
		const terms = Object.values(pages)

        let currentSpliceDoc = null
        let splicedDocs = {}


        for (const term of terms) {
            if(!splicedDocs.hasOwnProperty(term)){
                splicedDocs[term] = await PDFDocument.create()
                const page = splicedDocs[term].addPage([612, 792])
                const {width, height} = page.getSize()
                let fontSize = 30
                const text = term
                const font = await pdfDoc.embedFont(StandardFonts.TimesRoman)

                const textWidth = font.widthOfTextAtSize(text, fontSize)
                if(textWidth > width){
                    fontSize = (width / 2) * 30 / textWidth
                }
                page.drawText(term, {
                    x: width / 2 - textWidth / 2,
                    y: height / 2,
                    size: fontSize,
                    font: font
                })
            }
        }


        for(let i = 0; i < pdfDoc.getPages().length; i++){
            if(pages.hasOwnProperty(i + 1)){ //Changing document to splice to
                currentSpliceDoc = pages[i + 1]
            }
            if(currentSpliceDoc == null){
                continue
            }

            const doc = splicedDocs[currentSpliceDoc]

            const [copiedPage] = await doc.copyPages(pdfDoc, [i])
            doc.addPage(copiedPage)

            console.log(`${currentSpliceDoc} ${i + 1}`)
        }

        for (const key of Object.keys(splicedDocs)) {
			let _path = config.output.endsWith("out") ? createDirectory(config.input) : path.join(config.output, path.basename(config.input))
            console.log(_path)
            _path = _path.replace('.pdf', `_${key}.pdf`)
            console.log(_path)
            savePDF(_path, splicedDocs[key])
        }
	})
	.catch(e => {
		console.log(e)
		dialog.showErrorBox("Error", "There was a problem with splitting the PDF, please try again.")
	})
}

function savePDF(pth, pdf) {
	pdf.save()
	.then(bytes => writeFile(pth, bytes))
	.catch(e => {
		console.log(e)
		dialog.showErrorBox("Error", "Error writing PDF to file")
		return
	})
	dialog.showErrorBox("Success", `PDF file saved successfully at ${pth}`)
}

function createDirectory(givenPath) {
	const dirPath = path.dirname(givenPath)
	const pdfName = path.basename(givenPath)
	const newPath = path.join(dirPath, "out")

	mkdir(newPath, { recursive: true })
	.catch(e => dialog.showErrorBox("Error", "Filesystem Error"))
	return path.join(newPath, pdfName)
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
			console.log()
			if (configData.OCR != null){
				let totalEntries = Object.keys(configData.OCR).length/2
				for (let i = 1; i <= totalEntries; i++) {
					const allPoints = configData.OCR[`Loc${i}`].split(",")
					config.addEntry(new Entry(configData.OCR[`Text${i}`], new Point(allPoints[0], allPoints[1]), new Point(allPoints[2], allPoints[3])))
				}
			}
			ocrScan()
			.catch(e => dialog.showErrorBox("Error", "There was a an issue with slicing your pdf, please try again."))
		}).catch(e => {
			dialog.showErrorBox("Error", "There was a formatting issue with the provided config file, please try again.")
		})
    });

	ipcMain.handle("config:saveBounds", async (event, bounds) => {
		// Process bounds and update the config object
		config.clearEntries();
		for (let bound in bounds) {
			config.addEntry(new Entry(bound, new Point(Math.min(bounds[bound][0], bounds[bound][2]), Math.min(bounds[bound][1], bounds[bound][3])), new Point(Math.max(bounds[bound][0], bounds[bound][2]), Math.max(bounds[bound][1], bounds[bound][3]))));
		}
		config.output = path.join(path.dirname(config.input), "out")
	
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
				await ocrScan()
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