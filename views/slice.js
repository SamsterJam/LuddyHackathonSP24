document.getElementById('sliceBtn').addEventListener('click', () => {
    const configFileInput = document.getElementById('configFile');

    if (configFileInput.files.length === 0) {
        alert('Please select a config file.');
        return;
    }

    const configFile = configFileInput.files[0].path;

    window.electronAPI.loadConfig(configFile).then((response) => {
        console.log(response);
    }).catch((error) => {
        console.error(error);
        alert('An error occurred while slicing the PDF.');
    });
});