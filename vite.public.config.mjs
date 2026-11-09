import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
export default defineConfig({root:fileURLToPath(new URL('./static',import.meta.url)),base:'./',publicDir:fileURLToPath(new URL('./public',import.meta.url)),plugins:[react()],build:{outDir:fileURLToPath(new URL('./public-build',import.meta.url)),emptyOutDir:true}});
