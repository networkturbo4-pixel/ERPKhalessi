import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import fs from 'fs'
import path from 'path'
import type { ServerResponse } from 'http'

interface SseClient {
  id: string
  clientId: string
  res: ServerResponse
}

function diskStoragePlugin(): Plugin {
  const storageDir = path.resolve(process.cwd(), 'data', 'storage')
  const sseClients = new Map<string, SseClient>()

  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true })
  }

  const broadcastStorageChange = (payload: {
    action: 'set' | 'remove'
    key: string
    value?: string
    large?: boolean
    senderId?: string
  }) => {
    const serialized = `data: ${JSON.stringify({ ...payload, ts: Date.now() })}\n\n`
    for (const [connId, client] of sseClients.entries()) {
      if (payload.senderId && client.clientId === payload.senderId) {
        continue
      }
      try {
        client.res.write(serialized)
      } catch {
        sseClients.delete(connId)
      }
    }
  }

  return {
    name: 'disk-storage-plugin',
    configureServer(server) {
      // Keep-alive heartbeat every 20s so mobile browsers never drop the SSE stream
      const heartbeat = setInterval(() => {
        for (const [connId, client] of sseClients.entries()) {
          try {
            client.res.write(': ping\n\n')
          } catch {
            sseClients.delete(connId)
          }
        }
      }, 20000)

      server.httpServer?.once('close', () => {
        clearInterval(heartbeat)
        sseClients.clear()
      })

      server.middlewares.use(async (req, res, next) => {
        // Servir dinámicamente el Favicon configurado en Identidad durante desarrollo (npm run dev)
        if (req.url?.split('?')[0] === '/api/favicon.php' && req.method === 'GET') {
          const fallbackSvg =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#18181b"/><circle cx="32" cy="32" r="18" fill="none" stroke="#e11d48" stroke-width="4"/></svg>'
          try {
            const settingsFile = path.join(storageDir, 'khalessi_erp_settings_v3.json')
            if (fs.existsSync(settingsFile)) {
              const rawFile = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'))
              const rawValue = typeof rawFile?.value === 'string' ? JSON.parse(rawFile.value) : rawFile
              const cust = rawValue?.customization
              const iconSrc =
                cust?.favicon || cust?.storeHeaderLogo || cust?.logoDark || cust?.logoLight || ''
              if (typeof iconSrc === 'string' && iconSrc.startsWith('data:image/')) {
                const match = iconSrc.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/)
                if (match) {
                  res.setHeader('Content-Type', match[1])
                  res.setHeader('Cache-Control', 'no-cache')
                  res.statusCode = 200
                  res.end(Buffer.from(match[2], 'base64'))
                  return
                }
              }
              if (typeof iconSrc === 'string' && /^https?:\/\//i.test(iconSrc)) {
                res.statusCode = 302
                res.setHeader('Location', iconSrc)
                res.end()
                return
              }
            }
          } catch {
            // fallback SVG below
          }
          res.setHeader('Content-Type', 'image/svg+xml')
          res.statusCode = 200
          res.end(fallbackSvg)
          return
        }

        // Proxy para Factúralo PRO (resuelve bloqueo de CORS de api.facturalo.pe en el navegador)
        if (req.url?.startsWith('/api/facturalo-proxy')) {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')

          if (req.method === 'OPTIONS') {
            res.statusCode = 204
            res.end()
            return
          }

          if (req.method === 'POST') {
            const chunks: Buffer[] = []
            req.on('data', c => chunks.push(Buffer.from(c)))
            req.on('end', async () => {
              try {
                const bodyStr = Buffer.concat(chunks).toString('utf-8')
                const payload = JSON.parse(bodyStr || '{}')
                const { targetUrl, method = 'GET', headers = {}, body } = payload

                if (!targetUrl || typeof targetUrl !== 'string') {
                  res.setHeader('Content-Type', 'application/json')
                  res.statusCode = 400
                  res.end(JSON.stringify({ ok: false, error: 'targetUrl es requerido' }))
                  return
                }

                let parsedTarget: URL
                try {
                  parsedTarget = new URL(targetUrl)
                } catch {
                  res.setHeader('Content-Type', 'application/json')
                  res.statusCode = 400
                  res.end(JSON.stringify({ ok: false, error: 'targetUrl inválido' }))
                  return
                }

                const allowedSuffixes = ['facturalo.pe', 'apisperu.com', 'apis.net.pe', 'sunat.gob.pe']
                const host = parsedTarget.hostname.toLowerCase()
                const isAllowedHost = allowedSuffixes.some(
                  suffix => host === suffix || host.endsWith(`.${suffix}`)
                )
                if (parsedTarget.protocol !== 'https:' || !isAllowedHost) {
                  res.setHeader('Content-Type', 'application/json')
                  res.statusCode = 403
                  res.end(JSON.stringify({ ok: false, error: 'URL de destino no permitida (solo HTTPS Factúralo/SUNAT)' }))
                  return
                }

                const fetchHeaders: Record<string, string> = { ...headers }
                if (body && !fetchHeaders['Content-Type']) {
                  fetchHeaders['Content-Type'] = 'application/json'
                }

                const upstreamRes = await fetch(targetUrl, {
                  method,
                  headers: fetchHeaders,
                  body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
                })

                const upstreamText = await upstreamRes.text()
                let parsedData: any = null
                try {
                  parsedData = JSON.parse(upstreamText)
                } catch {
                  parsedData = upstreamText
                }

                res.setHeader('Content-Type', 'application/json')
                res.statusCode = 200
                res.end(
                  JSON.stringify({
                    ok: upstreamRes.ok,
                    status: upstreamRes.status,
                    data: parsedData,
                  })
                )
              } catch (err: any) {
                res.setHeader('Content-Type', 'application/json')
                res.statusCode = 500
                res.end(JSON.stringify({ ok: false, error: err?.message || 'Error en proxy Factúralo' }))
              }
            })
            return
          }
        }

        // Servir /version.json desde release/version.json en entorno local
        if (req.url?.startsWith('/version.json') && req.method === 'GET') {
          const releaseVersionPath = path.resolve(process.cwd(), 'release', 'version.json')
          if (fs.existsSync(releaseVersionPath)) {
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.setHeader('Cache-Control', 'no-store')
            res.statusCode = 200
            res.end(fs.readFileSync(releaseVersionPath, 'utf-8'))
            return
          }
        }

        // Mock /api/system-update.php para desarrollo local con Vite
        if (req.url?.startsWith('/api/system-update')) {
          const urlObj = new URL(req.url, 'http://localhost')
          const action = urlObj.searchParams.get('action') || 'check'
          const releaseVersionPath = path.resolve(process.cwd(), 'release', 'version.json')
          const localVersion = fs.existsSync(releaseVersionPath)
            ? JSON.parse(fs.readFileSync(releaseVersionPath, 'utf-8'))
            : { buildId: 'dev-local', builtAt: new Date().toISOString(), message: 'Entorno de desarrollo Vite' }

          if (action === 'check') {
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.statusCode = 200
            res.end(
              JSON.stringify({
                success: true,
                installed_build: localVersion.buildId,
                installed: localVersion,
                remote: localVersion,
                latest_commit: localVersion.buildId,
                message: localVersion.message || 'Release sincronizado',
                date: localVersion.builtAt || new Date().toISOString(),
                update_available: false,
                capabilities: { curl: true, writable: true, mode: 'manifest-sha256-direct' },
              })
            )
            return
          }

          if (action === 'deploy' && req.method === 'POST') {
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.statusCode = 200
            res.end(
              JSON.stringify({
                success: true,
                message: '¡Sincronización verificada en entorno local!',
                build_id: localVersion.buildId,
                files_updated: 0,
                files_unchanged: localVersion.totalFiles || 65,
                files_cleaned: 0,
                db_migration: { connected: true, tables_verified: 10, columns_added: 0, details: [] },
                steps: [
                  `Manifiesto verificado: build ${localVersion.buildId} (${localVersion.totalFiles || 65} archivos indexados).`,
                  'Comparación SHA-256 completada: todos los archivos locales coinciden con el build activo.',
                  'Base de datos verificada: 10 tablas comprobadas, 0 columnas nuevas pendientes (datos 100% intactos).',
                ],
              })
            )
            return
          }
        }

        // Mock /api/auth.php para desarrollo local
        if (req.url?.startsWith('/api/auth')) {
          if (req.method === 'POST') {
            const chunks: Buffer[] = []
            req.on('data', c => chunks.push(Buffer.from(c)))
            req.on('end', () => {
              try {
                const body = JSON.parse(Buffer.concat(chunks).toString('utf-8'))
                const pin = String(body.pin || '')
                if (pin === '230825' || pin.length >= 4) {
                  res.setHeader('Content-Type', 'application/json')
                  res.statusCode = 200
                  res.end(
                    JSON.stringify({
                      success: true,
                      token: 'local-dev-admin-token',
                      expires: Math.floor(Date.now() / 1000) + 86400 * 7,
                    })
                  )
                  return
                }
              } catch {}
              res.setHeader('Content-Type', 'application/json')
              res.statusCode = 401
              res.end(JSON.stringify({ success: false, error: 'Credencial no autorizada' }))
            })
            return
          }
        }

        // Mock /realtime para desarrollo local con Vite (SSE y broadcast)
        if (req.url?.startsWith('/realtime')) {
          const urlObj = new URL(req.url, 'http://localhost')
          if (urlObj.pathname === '/realtime/stream') {
            const clientId = urlObj.searchParams.get('clientId') || ''
            const connId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

            res.writeHead(200, {
              'Content-Type': 'text/event-stream; charset=utf-8',
              'Cache-Control': 'no-cache, no-transform',
              Connection: 'keep-alive',
              'X-Accel-Buffering': 'no',
            })
            res.write(`data: ${JSON.stringify({ action: 'connected', clientId, connectedAt: new Date().toISOString() })}\n\n`)

            sseClients.set(connId, { id: connId, clientId, res })

            req.on('close', () => {
              sseClients.delete(connId)
            })
            return
          }

          if (urlObj.pathname === '/realtime/broadcast' && req.method === 'POST') {
            const chunks: Buffer[] = []
            req.on('data', c => chunks.push(Buffer.from(c)))
            req.on('end', () => {
              try {
                const body = JSON.parse(Buffer.concat(chunks).toString('utf-8'))
                broadcastStorageChange(body)
                res.setHeader('Content-Type', 'application/json')
                res.statusCode = 200
                res.end(JSON.stringify({ success: true }))
              } catch {
                res.statusCode = 400
                res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }))
              }
            })
            return
          }
        }

        if (!req.url?.startsWith('/api/storage')) {
          return next()
        }

        const urlObj = new URL(req.url, 'http://localhost')
        const pathname = urlObj.pathname
        const parts = pathname.split('/').filter(Boolean)

        // GET /api/storage/stream -> Real-Time SSE Synchronization Channel
        if (req.method === 'GET' && parts.length === 3 && parts[2] === 'stream') {
          const clientId = urlObj.searchParams.get('clientId') || ''
          const connId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

          res.writeHead(200, {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
          })
          res.write(`event: connected\ndata: ${JSON.stringify({ connId, ts: Date.now() })}\n\n`)

          sseClients.set(connId, { id: connId, clientId, res })

          req.on('close', () => {
            sseClients.delete(connId)
          })
          return
        }

        // GET /api/storage -> returns Record<string, string>
        if (req.method === 'GET' && parts.length === 2) {
          try {
            const files = fs.readdirSync(storageDir)
            const result: Record<string, string> = {}
            for (const file of files) {
              if (file.endsWith('.json')) {
                const key = decodeURIComponent(file.slice(0, -5))
                result[key] = fs.readFileSync(path.join(storageDir, file), 'utf-8')
              }
            }
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Cache-Control', 'no-store')
            res.statusCode = 200
            res.end(JSON.stringify(result))
            return
          } catch (err) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: String(err) }))
            return
          }
        }

        // GET /api/storage/:key
        if (req.method === 'GET' && parts.length === 3) {
          const key = decodeURIComponent(parts[2])
          const filePath = path.join(storageDir, `${encodeURIComponent(key)}.json`)
          if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8')
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Cache-Control', 'no-store')
            res.statusCode = 200
            res.end(JSON.stringify({ data: content }))
          } else {
            res.statusCode = 404
            res.end(JSON.stringify({ error: 'Not found' }))
          }
          return
        }

        // DELETE /api/storage/:key
        if (req.method === 'DELETE' && parts.length === 3) {
          const key = decodeURIComponent(parts[2])
          const senderId = String(req.headers['x-client-id'] || '')
          const filePath = path.join(storageDir, `${encodeURIComponent(key)}.json`)
          try {
            const existed = fs.existsSync(filePath)
            if (existed) {
              fs.unlinkSync(filePath)
              broadcastStorageChange({ action: 'remove', key, senderId })
            }
            res.setHeader('Content-Type', 'application/json')
            res.statusCode = 200
            res.end(JSON.stringify({ success: true }))
          } catch (err) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: String(err) }))
          }
          return
        }

        // POST /api/storage/:key
        if (req.method === 'POST' && parts.length === 3) {
          const key = decodeURIComponent(parts[2])
          const senderId = String(req.headers['x-client-id'] || '')
          const chunks: Buffer[] = []
          req.on('data', chunk => {
            chunks.push(Buffer.from(chunk))
          })
          req.on('end', () => {
            try {
              const body = Buffer.concat(chunks).toString('utf-8')
              const parsed = JSON.parse(body)
              const dataToSave =
                typeof parsed.data === 'string' ? parsed.data : JSON.stringify(parsed.data)
              const filePath = path.join(storageDir, `${encodeURIComponent(key)}.json`)

              let prevContent: string | null = null
              if (fs.existsSync(filePath)) {
                try {
                  prevContent = fs.readFileSync(filePath, 'utf-8')
                } catch {
                  prevContent = null
                }
              }

              if (prevContent !== dataToSave) {
                fs.writeFileSync(filePath, dataToSave, 'utf-8')
                const isLarge = dataToSave.length >= 180_000
                broadcastStorageChange({
                  action: 'set',
                  key,
                  value: isLarge ? undefined : dataToSave,
                  large: isLarge,
                  senderId,
                })
              }

              res.setHeader('Content-Type', 'application/json')
              res.statusCode = 200
              res.end(JSON.stringify({ success: true }))
            } catch (err) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: String(err) }))
            }
          })
          return
        }

        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), diskStoragePlugin()],
  server: {
    host: true,
    watch: {
      ignored: ['**/data/**', '**/data/storage/**', '**/*.json'],
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/mapbox-gl')) {
            return 'vendor-mapbox';
          }
          if (id.includes('node_modules/leaflet')) {
            return 'vendor-leaflet';
          }
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1200,
  },
})
