import http from 'http';
import fs from 'fs';
import path from 'path';

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/save') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { filename, base64 } = data;
        const buffer = Buffer.from(base64.split(',')[1], 'base64');
        
        const publicDir = path.resolve('public/icons');
        const distDir = path.resolve('../dist/icons');
        
        fs.mkdirSync(publicDir, { recursive: true });
        fs.mkdirSync(distDir, { recursive: true });
        
        fs.writeFileSync(path.join(publicDir, filename), buffer);
        fs.writeFileSync(path.join(distDir, filename), buffer);
        
        console.log(`Saved ${filename}`);
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ status: 'ok' }));
      } catch (err) {
        console.error(err);
        res.writeHead(500, {
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(err.message);
      }
    });
  } else if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
  } else {
    // Serve HTML generator page
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Colorr Icon Generator</title>
        <style>
          body {
            font-family: system-ui, sans-serif;
            background: #f3f4f6;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
          }
          .card {
            background: white;
            padding: 30px;
            border-radius: 16px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.05);
            text-align: center;
          }
          canvas {
            display: none;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h2 id="status">Generating Icons...</h2>
          <canvas id="canvas"></canvas>
        </div>
        <script>
          const canvas = document.getElementById('canvas');
          const ctx = canvas.getContext('2d');
          
          function drawIcon(size) {
            canvas.width = size;
            canvas.height = size;
            ctx.clearRect(0, 0, size, size);
            
            // Draw a high-quality radial gradient background circle (Purple to Blue)
            const gradient = ctx.createRadialGradient(
              size * 0.4, size * 0.4, size * 0.1,
              size * 0.5, size * 0.5, size * 0.5
            );
            gradient.addColorStop(0, '#818cf8'); // Indigo/purple
            gradient.addColorStop(1, '#3b82f6'); // Blue
            
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, size * 0.45, 0, 2 * Math.PI);
            ctx.fillStyle = gradient;
            ctx.fill();
            
            // Draw subtle outer white ring
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.lineWidth = Math.max(1.5, size * 0.05);
            ctx.stroke();
            
            // Draw letter "C"
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold ' + (size * 0.5) + 'px system-ui, -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Text shadow for premium look
            ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
            ctx.shadowBlur = Math.max(1, size * 0.05);
            ctx.shadowOffsetY = Math.max(1, size * 0.02);
            
            ctx.fillText('C', size / 2, size / 2 + (size * 0.02));
            
            return canvas.toDataURL('image/png');
          }
          
          async function start() {
            const statusEl = document.getElementById('status');
            const sizes = [16, 32, 48, 128];
            try {
              for (const size of sizes) {
                const base64 = drawIcon(size);
                const res = await fetch('/save', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ filename: 'icon' + size + '.png', base64 })
                });
                if (!res.ok) throw new Error('Failed to save size ' + size);
              }
              statusEl.innerText = 'Icons Generated Successfully!';
            } catch (err) {
              statusEl.innerText = 'Error: ' + err.message;
            }
          }
          
          start();
        </script>
      </body>
      </html>
    `);
  }
});

server.listen(9999, () => {
  console.log('Icon generator server is running at http://localhost:9999');
});
