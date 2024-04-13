const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("electronAPI", {
    setInputFile: file => ipcRenderer.invoke("config:setInputFile", file)
})