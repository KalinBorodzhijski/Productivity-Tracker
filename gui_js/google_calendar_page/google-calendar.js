const { ipcRenderer } = require('electron');

window.navigateTo = function(page) {
  ipcRenderer.send('navigate', page);
};

const resizeWebview = () => {
  const webview = document.getElementById('myWebview'); 
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  webview.style.width = `${windowWidth}px`;
  webview.style.height = `${windowHeight-50}px`;

  ipcRenderer.send('webview-resized', 'Webview is resized!');
};

window.addEventListener('resize', () => {
  resizeWebview();
});

document.addEventListener('DOMContentLoaded', () => {
  resizeWebview();
});
