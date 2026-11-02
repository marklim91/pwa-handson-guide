const http = require('http');
const fs = require('fs');
const path = require('path');
const { createLoginHandler } = require('./login-api');
const { createDashboardStore } = require('./dashboard-store');
const { createDashboardHandlers } = require('./dashboard-api');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const ROUTE_ALIASES = {
  '/': '/index.html',
  '/파코v3': '/index.html',
  '/dge.go.kr/pco': '/index.html',
  '/dge.go.kr/pco/파코v3': '/index.html',
  '/dashboard': '/dashboard.html',
  '/대시보드': '/dashboard.html',
  '/dge.go.kr/pco/대시보드': '/dashboard.html',
  '/my-learning': '/my-learning.html',
  '/new': '/new.html',
  '/studio': '/new.html',
  '/스튜디오': '/new.html',
  '/내학습': '/my-learning.html',
  '/v3_4': '/v3_4/index.html',
  '/v3_4/': '/v3_4/index.html',
  '/파코v3_4': '/v3_4/index.html',
  '/dge.go.kr/pco/파코v3_4': '/v3_4/index.html',
  '/v3_4/coach': '/v3_4/coach.html',
  '/파코v3_4/ai코치': '/v3_4/coach.html',
  '/dge.go.kr/pco/파코v3_4/ai코치': '/v3_4/coach.html',
  '/v3_4/roadmap': '/v3_4/roadmap.html',
  '/파코v3_4/레벨-로드맵': '/v3_4/roadmap.html',
  '/dge.go.kr/pco/파코v3_4/레벨-로드맵': '/v3_4/roadmap.html',
  '/v2': '/v2.html',
  '/파코v2': '/v2.html',
  '/dge.go.kr/pco/파코v2': '/v2.html',
  '/pwa-sample': '/pwa-sample/index.html',
  '/pwa-sample/': '/pwa-sample/index.html'
};

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function createServer({ loginHandler, dashboardStore = createDashboardStore(), dashboardOptions = {} } = {}) {
  const verifyLogin = loginHandler || createLoginHandler({ onVerified: dashboardStore.login });
  const dashboardHandler = createDashboardHandlers({ ...dashboardOptions, store: dashboardStore });
  const dashboardRoutes = new Set([
    '/api/dashboard', '/api/presence', '/api/session',
    '/api/me/learning',
    '/api/session/heartbeat', '/api/session/logout',
  ]);
  return http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (parsedUrl.pathname === '/api/login/verify') {
      verifyLogin(req, res);
      return;
    }
    if (dashboardRoutes.has(parsedUrl.pathname)) {
      dashboardHandler(req, res, parsedUrl);
      return;
    }
    const decodedPath = decodeURIComponent(parsedUrl.pathname);
    const targetRel = ROUTE_ALIASES[decodedPath] || decodedPath;

    const safePath = path.normalize(targetRel).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.join(PUBLIC_DIR, safePath);

    if (!filePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found: ' + decodedPath);
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });
      fs.createReadStream(filePath).pipe(res);
    });
  });
}

if (require.main === module) {
  const dashboardStore = createDashboardStore({
    filePath: process.env.DASHBOARD_DATA_FILE || path.join(__dirname, 'data', 'dashboard.json'),
  });
  createServer({ dashboardStore }).listen(PORT, () => {
    console.log(`파코(파이썬 코치) WebApp 서버 실행 중: http://localhost:${PORT}`);
  });
}

module.exports = { createServer };
