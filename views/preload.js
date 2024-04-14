const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("electronAPI", {
    loadConfig: rawConfig => ipcRenderer.invoke("config:loadConfig", rawConfig),
    saveBounds: bounds => ipcRenderer.invoke("config:saveBounds", bounds),
    setInputFile: fileName => ipcRenderer.invoke("config:setInputFile", fileName)
})