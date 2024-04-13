const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("electronAPI", {
    slicePdf: data => ipcRenderer.invoke("slice-pdf", data)
})