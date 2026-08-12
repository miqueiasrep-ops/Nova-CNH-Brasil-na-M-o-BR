import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'google-verification-dev',
        transformIndexHtml(html) {
          try {
            const dbPath = path.join(process.cwd(), "database.json");
            if (fs.existsSync(dbPath)) {
              const data = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
              const code = data.googleVerificationCode || "";
              if (code) {
                let metaTag = "";
                let cleanCode = code.trim();
                if (cleanCode.startsWith("<meta") && cleanCode.includes("content=")) {
                  metaTag = cleanCode;
                } else {
                  if (cleanCode.includes("google-site-verification=")) {
                    const match = cleanCode.match(/google-site-verification=["']?([^"'\s>]+)["']?/);
                    if (match && match[1]) {
                      cleanCode = match[1];
                    } else {
                      cleanCode = cleanCode.replace("google-site-verification=", "").replace(/["']/g, "");
                    }
                  }
                  const contentMatch = cleanCode.match(/content=["']([^"']+)["']/);
                  if (contentMatch && contentMatch[1]) {
                    cleanCode = contentMatch[1];
                  }
                  cleanCode = cleanCode.replace(/["']/g, "");
                  metaTag = `<meta name="google-site-verification" content="${cleanCode}" />`;
                }
                return html.replace("<head>", `<head>\n    ${metaTag}`);
              }
            }
          } catch (e) {
            console.error("Erro no plugin google-verification-dev:", e);
          }
          return html;
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
