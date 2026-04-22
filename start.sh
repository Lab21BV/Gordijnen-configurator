#!/usr/bin/env bash
# Gordijn Configurator — lokale server
# Gebruik: ./start.sh [poort]   (standaard poort 8080)

PORT=${1:-8080}
DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "  Gordijn Configurator — L@b21#2026!"
echo "  ─────────────────────────────────"
echo "  Server:  http://localhost:$PORT"
echo "  Map:     $DIR"
echo "  Stop:    Ctrl+C"
echo ""

cd "$DIR"

# Probeer Python 3, dan Python 2, dan Node
if command -v python3 &>/dev/null; then
  python3 -m http.server "$PORT"
elif command -v python &>/dev/null; then
  python -m SimpleHTTPServer "$PORT"
elif command -v node &>/dev/null; then
  node -e "
    const http = require('http'), fs = require('fs'), path = require('path');
    http.createServer((req,res) => {
      const f = path.join('$DIR', req.url === '/' ? 'index.html' : req.url);
      fs.readFile(f, (e,d) => {
        if(e){ res.writeHead(404); res.end('Not found'); return; }
        const ext = path.extname(f);
        const ct = {'.html':'text/html','.css':'text/css','.js':'application/javascript'}[ext]||'text/plain';
        res.writeHead(200,{'Content-Type':ct});
        res.end(d);
      });
    }).listen($PORT, () => console.log('Listening on http://localhost:$PORT'));
  "
else
  echo "  FOUT: Python 3, Python 2 of Node.js vereist."
  echo "  Open index.html direct in de browser als alternatief."
  exit 1
fi
