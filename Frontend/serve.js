const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(8000, () => {
  console.log('🚀 Frontend running on http://localhost:8000');
});
// Remove Google Translate Banner
function removeGoogleBanner() {
    const banner = document.querySelector('.goog-te-banner-frame');
    if (banner) banner.remove();
    document.body.style.top = '0px';
    document.body.style.position = 'static';
}

setInterval(removeGoogleBanner, 500);