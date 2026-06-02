# Finance Management PWA

Scaffold inicial do aplicativo PWA de gerenciamento financeiro pessoal.

Stack: React, TypeScript, Vite, TailwindCSS, PWA, Firebase, Firestore, Firebase Auth, Zustand, date-fns, Recharts

Scripts:

```bash
npm install
npm run dev
```

Build e testar localmente:

```bash
npm run build    # gera a pasta dist
npm run serve    # serve o conteúdo de dist em http://localhost:5000 por padrão
```

CI / Teste de build:

```bash
npm run test:build
```

Deploy no Vercel:

1. Instale a CLI do Vercel: `npm i -g vercel` (opcional)
2. Faça login: `vercel login`
3. Faça deploy: `vercel --prod` (o `vercel.json` já está configurado para usar `npm run build` e publicar `dist`)


Configurações de ambiente (exemplo `.env`):

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

PWA:

- O projeto inclui configuração para PWA via `vite-plugin-pwa`.
- Manifest e ícones estão em `manifest.webmanifest`, `pwa-192x192.svg` e `pwa-512x512.svg`.
- O service worker é gerado automaticamente pelo plugin durante o build.

# finance_management