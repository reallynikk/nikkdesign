# nikk — portfolio

Portfolio of graphic designer Nikita Ivanov, https://reallynikk.ru/.

React, Vite and Three.js. Node.js 22 or later.

```sh
npm ci
npm run dev
npm run build
```

Cloudflare Worker: `nikkdesign`. `wrangler.jsonc` builds the app and serves `dist/client` as static assets. Deploy with `npx wrangler deploy`, or use the existing Cloudflare Git integration. Build command for Git integration: `npm ci && npm run build`; deploy command: `npx wrangler deploy`.

The original site remains in Git history. The old `css`, `js` and `images` folders are retained for reference, but are outside the deployed assets directory.

Social preview: `public/assets/social-preview.png` (1199×630). Open Graph, Twitter metadata, canonical URL, robots and sitemap are included. Project detail pages are currently brief previews; complete case studies will be added later.

