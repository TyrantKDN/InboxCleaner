import http from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { join, normalize, extname } from 'node:path'

const root = process.argv[2] || 'dist'
const port = 8080
const types = {
  '.yml': 'text/yaml',
  '.exe': 'application/octet-stream',
  '.blockmap': 'application/octet-stream',
  '.json': 'application/json'
}

http
  .createServer(async (req, res) => {
    try {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0])
      const filePath = join(root, normalize(urlPath))
      const s = await stat(filePath)
      if (s.isDirectory()) {
        res.writeHead(403)
        return res.end('directory listing disabled')
      }
      res.writeHead(200, {
        'Content-Type': types[extname(filePath)] || 'application/octet-stream',
        'Content-Length': s.size
      })
      res.end(await readFile(filePath))
      console.log(req.method, urlPath, `(${s.size} bytes)`)
    } catch {
      res.writeHead(404)
      res.end('not found')
      console.log('404', req.url)
    }
  })
  .listen(port, () => console.log(`feed server on http://localhost:${port} serving "${root}"`))
