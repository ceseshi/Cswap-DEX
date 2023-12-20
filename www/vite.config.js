import { defineConfig, loadEnv } from 'vite'
import { vitePluginFtp } from 'vite-plugin-ftp'

export default defineConfig(({ command, mode }) => {
  process.env = {...process.env, ...loadEnv(mode, process.cwd())};

  return {
    plugins: [
      vitePluginFtp({
        host: process.env.VITE_FTP_HOST,
        port: process.env.VITE_FTP_PORT,
        user: process.env.VITE_FTP_USER,
        password: process.env.VITE_FTP_PASS,
        remoteDir: process.env.VITE_FTP_DIR,
      })
    ],
  }
})