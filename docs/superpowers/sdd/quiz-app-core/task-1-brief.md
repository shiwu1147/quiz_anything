## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/App.test.tsx`
- Create: `src/index.css`
- Create: `src/test/setup.ts`
- Create: `.gitignore`

**Interfaces:**
- Produces: `App` default export (`src/App.tsx`) — a React component, currently a placeholder, replaced by routing in Task 9.

- [ ] **Step 1: Write package.json**

```json
{
  "name": "quiz-anything",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.1",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "jsdom": "^25.0.0",
    "typescript": "^5.5.4",
    "vite": "^5.4.2",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 2: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src", "vite.config.ts"]
}
```

- [ ] **Step 3: Write vite.config.ts**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

- [ ] **Step 4: Write src/test/setup.ts**

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 5: Write index.html**

```html
<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>問答題庫</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Write src/index.css**

Root variables and base styles ported from the reference artifact, shared by every page/component.

```css
:root {
  --ground:      #F2F4EF;
  --surface:     #FCFDFA;
  --surface-2:   #E9EDE5;
  --rule:        #D3DACB;
  --rule-soft:   rgba(31,107,79,.10);
  --ink:         #1B211D;
  --ink-2:       #4E574F;
  --ink-3:       #7C857D;
  --accent:      #1F6B4F;
  --accent-ink:  #12402F;
  --accent-soft: #DCE9E0;
  --accent-line: #9EC4AE;
  --vermilion:   #A93226;
  --verm-soft:   #F6E2DF;
  --verm-line:   #DCA69E;
  --shadow: 0 1px 2px rgba(27,33,29,.05), 0 8px 24px -12px rgba(27,33,29,.18);
  --font-display: "Noto Serif TC","Source Han Serif TC","Songti TC","PMingLiU","MingLiU",serif;
  --font-body: "Noto Sans TC","PingFang TC","Microsoft JhengHei","Heiti TC","Helvetica Neue",sans-serif;
  --font-mono: ui-monospace,"SF Mono",Menlo,Consolas,monospace;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --ground:      #12160F;
    --surface:     #1A1F19;
    --surface-2:   #232921;
    --rule:        #333B31;
    --rule-soft:   rgba(122,193,157,.10);
    --ink:         #E7EBE2;
    --ink-2:       #A9B2A6;
    --ink-3:       #7C857B;
    --accent:      #7AC19D;
    --accent-ink:  #C6E6D5;
    --accent-soft: #1E3229;
    --accent-line: #3E6852;
    --vermilion:   #E3897C;
    --verm-soft:   #33211E;
    --verm-line:   #6E403A;
    --shadow: 0 1px 2px rgba(0,0,0,.3), 0 10px 28px -14px rgba(0,0,0,.7);
  }
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--ground);
  color: var(--ink);
  font-family: var(--font-body);
  font-size: 16px;
  line-height: 1.75;
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 7: Write src/App.tsx (placeholder)**

```tsx
export default function App() {
  return <h1>問答題庫</h1>
}
```

- [ ] **Step 8: Write src/main.tsx**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 9: Write the smoke test src/App.test.tsx**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />)
    expect(screen.getByText('問答題庫')).toBeInTheDocument()
  })
})
```

- [ ] **Step 10: Write .gitignore**

```
node_modules
dist
.vite
```

- [ ] **Step 11: Install dependencies**

Run: `npm install`
Expected: installs without errors, creates `package-lock.json` and `node_modules/`.

- [ ] **Step 12: Run the test suite to verify it passes**

Run: `npm test`
Expected: PASS — 1 test passed (`App > renders without crashing`).

- [ ] **Step 13: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html src .gitignore
git commit -m "chore: scaffold Vite + React + TypeScript project with Vitest"
```

---

