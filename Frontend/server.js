const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = 5173;
app.listen(PORT, () => {
    console.log(`🎨 Frontend running on http://localhost:${PORT}`);
});
