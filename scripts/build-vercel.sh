#!/bin/bash
# Vercel Build Output API v3 build script
# Produces .vercel/output/ with:
#   static/   - Vite-built React SPA (served by Vercel CDN)
#   functions/api.func/ - Express + tRPC serverless function
#   config.json - routing rules

set -e

echo "=== Step 1: Clean previous output ==="
rm -rf .vercel/output

echo "=== Step 2: Build Vite SPA into .vercel/output/static ==="
node_modules/.bin/vite build \
  --outDir "$(pwd)/.vercel/output/static" \
  --emptyOutDir

echo "=== Step 3: Build Express serverless function ==="
mkdir -p .vercel/output/functions/api.func
node_modules/.bin/esbuild server.ts \
  --platform=node \
  --packages=external \
  --bundle \
  --format=cjs \
  --outfile=.vercel/output/functions/api.func/index.js \
  --alias:@shared=./shared

echo "=== Step 4: Write .vc-config.json for the function ==="
cat > .vercel/output/functions/api.func/.vc-config.json << 'EOF'
{
  "runtime": "nodejs20.x",
  "handler": "index.js",
  "launcherType": "Nodejs",
  "shouldAddHelpers": true
}
EOF

echo "=== Step 5: Write Vercel routing config ==="
cat > .vercel/output/config.json << 'EOF'
{
  "version": 3,
  "routes": [
    {
      "src": "/assets/(.*)",
      "headers": { "cache-control": "public, max-age=31536000, immutable" },
      "continue": true
    },
    {
      "handle": "filesystem"
    },
    {
      "src": "/api/(.*)",
      "dest": "/api"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
EOF

echo "=== Build complete ==="
echo "--- .vercel/output/ structure ---"
find .vercel/output -maxdepth 3 | sort
