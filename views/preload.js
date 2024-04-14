const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("electronAPI", {
    loadConfig: rawConfig => ipcRenderer.invoke("config:loadConfig", rawConfig),
    debug: data => ipcRenderer.invoke("debug", data)
})