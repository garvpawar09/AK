
const https = require('https');

const API_KEY = "AIzaSyDbqpaEqaDApwQbikSCUu1zkZaAzThgRdo";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const fs = require('fs');
            fs.writeFileSync('models.json', data);
            console.log("Written to models.json");
        } catch (e) {
            console.error(e.message);
        }
    });
}).on('error', err => {
    console.error("Error: ", err.message);
});
