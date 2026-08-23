# school-store
## 🚀 Démarrage

```bash
npm install
cp .env.example .env
npm run dev




📦 Build et déploiement
GitHub Pages
Dans .env.production, mettre : VITE_BASE_PATH=/nom-du-repo/
npm run build
Pousser le contenu de dist/ sur la branche gh-pages
Dans Settings > Pages : sélectionner la branche gh-pages
Netlify / Vercel / Cloudflare Pages
Connecter le repo
Build command : npm run build
Output dir : dist
Ajouter les variables d'environnement Supabase dans l'interface
Hébergement local (n\'importe quel serveur statique)

```bash
npm run build
npx serve dist
