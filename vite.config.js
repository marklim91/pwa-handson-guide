const { defineConfig } = require('vite');
const path = require('node:path');

// new.html lives in public/ so the legacy Node server can keep serving the rest of the site.
module.exports = defineConfig({
  root: path.join(__dirname, 'public'),
  publicDir: false,
  server: { host: '127.0.0.1', port: 5173, open: '/new.html' },
  preview: { host: '127.0.0.1', port: 4173 },
  build: {
    outDir: path.join(__dirname, 'dist-new'),
    emptyOutDir: true,
    rollupOptions: { input: path.join(__dirname, 'public', 'new.html') },
  },
});
