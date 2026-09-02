import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'

const collectFiles = async (directory: string, root = directory): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(entries.map(async (entry) => {
    const path = resolve(directory, entry.name)
    return entry.isDirectory() ? collectFiles(path, root) : [path.slice(root.length).replaceAll('\\', '/')]
  }))
  return files.flat()
}

const offlineManifestPlugin = (): Plugin => ({
  name: 'chonchetrip-offline-manifest',
  apply: 'build',
  async closeBundle() {
    const outputDirectory = resolve(import.meta.dirname, 'dist')
    const files = (await collectFiles(outputDirectory))
      .filter((file) => file !== '/offline-assets.json')
      .sort()
    const hash = createHash('sha256')
    for (const file of files) {
      hash.update(file)
      hash.update(await readFile(resolve(outputDirectory, file.slice(1))))
    }

    const urls = files.filter((file) => file !== '/sw.js')
    const core = ['/', ...urls.filter((file) => (
      file === '/index.html'
      || file === '/manifest.webmanifest'
      || /^\/assets\/index-[^/]+\.(?:css|js)$/.test(file)
      || /^\/assets\/(?:chonchetrip-icon\.png|chonchetrip-splash\.webp|kitsune-guide\.webp|kitsu-tail\.webp)$/.test(file)
      || /^\/assets\/(?:osaka|kyoto|tokyo|fuji)-cover\.webp$/.test(file)
      || file.startsWith('/assets/fonts/')
    ))]
    const coreSet = new Set(core)
    const trip = urls.filter((file) => !coreSet.has(file))
    const version = hash.digest('hex').slice(0, 16)
    const manifest = {
      version,
      core,
      trip,
      external: [],
    }
    const workerPath = resolve(outputDirectory, 'sw.js')
    const workerSource = await readFile(workerPath, 'utf8')
    await writeFile(workerPath, workerSource.replaceAll('__CHONCHETRIP_BUILD_VERSION__', version))
    await writeFile(resolve(outputDirectory, 'offline-assets.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), offlineManifestPlugin()],
})
