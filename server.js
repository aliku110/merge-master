const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.json': 'application/json',
};

http.createServer((req, res) => {
  let file = req.url === '/' ? '/index.html' : req.url;
  file = path.join(__dirname, file);
  if (!fs.existsSync(file)) {
    res.writeHead(404);
    return res.end('Not found');
  }
  const ext = path.extname(file);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, '0.0.0.0', () => {
  console.log(`🍉 合成大师 running on port ${PORT}`);
});