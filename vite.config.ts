import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
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

        // Google Wallet Loyalty Pass API (dev mirror of public/api/google-wallet.php)
        if (req.url?.split('?')[0] === '/api/google-wallet.php') {
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.setHeader('Cache-Control', 'no-store')

          const findServiceAccount = (): { client_email: string; private_key: string } | null => {
            const candidates = [
              process.env.GOOGLE_WALLET_SA_PATH || '',
              path.resolve(process.cwd(), 'data', 'google-wallet-sa.json'),
              path.resolve(process.cwd(), 'public', 'api', 'storage', 'google-wallet-sa.json'),
            ].filter(Boolean)
            for (const p of candidates) {
              try {
                if (fs.existsSync(p)) {
                  const parsed = JSON.parse(fs.readFileSync(p, 'utf-8'))
                  if (parsed?.client_email && parsed?.private_key) return parsed
                }
              } catch {
                // ignore invalid file
              }
            }
            return null
          }

          const b64url = (input: Buffer | string) =>
            Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

          const signJwt = (header: Record<string, unknown>, payload: Record<string, unknown>, privateKey: string) => {
            const head = b64url(JSON.stringify(header))
            const body = b64url(JSON.stringify(payload))
            const signer = crypto.createSign('RSA-SHA256')
            signer.update(`${head}.${body}`)
            signer.end()
            const sig = b64url(signer.sign(privateKey))
            return `${head}.${body}.${sig}`
          }

          const sanitizeId = (val: string) =>
            val.replace(/[^A-Za-z0-9_.\-]/g, '_').replace(/^_+|_+$/g, '').slice(0, 64) || 'item'

          if (req.method === 'GET') {
            const sa = findServiceAccount()
            res.statusCode = 200
            res.end(
              JSON.stringify({
                success: true,
                configured: Boolean(sa),
                serviceAccountEmail: sa?.client_email || null,
                mode: sa ? 'production' : 'unconfigured',
              })
            )
            return
          }

          if (req.method === 'POST') {
            const chunks: Buffer[] = []
            req.on('data', c => chunks.push(Buffer.from(c)))
            req.on('end', async () => {
              try {
                const body = JSON.parse(Buffer.concat(chunks).toString('utf-8') || '{}')
                const sa = findServiceAccount()
                if (!sa) {
                  res.statusCode = 503
                  res.end(
                    JSON.stringify({
                      success: false,
                      code: 'SERVICE_ACCOUNT_MISSING',
                      error: 'No se encontró google-wallet-sa.json en data/google-wallet-sa.json.',
                    })
                  )
                  return
                }

                const issuerId = String(body.issuerId || '').replace(/[^0-9]/g, '')
                const rawCustomerId = String(body.customerId || '').trim()
                const customerId = rawCustomerId ? sanitizeId(rawCustomerId) : ''
                if (!issuerId) {
                  res.statusCode = 400
                  res.end(JSON.stringify({ success: false, error: 'issuerId es obligatorio.' }))
                  return
                }
                if (body.action !== 'send-promo' && !customerId) {
                  res.statusCode = 400
                  res.end(JSON.stringify({ success: false, error: 'customerId es obligatorio.' }))
                  return
                }

                const classSuffix = sanitizeId(String(body.classSuffix || 'khalessi_loyalty_v1'))
                const classId = `${issuerId}.${classSuffix}`
                const objectId = `${issuerId}.khalessi_cust_${customerId}`
                const points = Math.max(0, Math.round(Number(body.points || 0)))
                const goal = Math.max(1, Math.round(Number(body.goal || 8)))
                const activeStamps = Math.min(goal, points)
                const remainingStamps = Math.max(0, goal - activeStamps)
                const stampBar =
                  goal <= 12
                    ? `${'● '.repeat(activeStamps)}${'○ '.repeat(remainingStamps)}`.trim()
                    : `${activeStamps} / ${goal}`
                const stampPizzaBar =
                  goal <= 12
                    ? `${'🍕 '.repeat(activeStamps)}${'⚪ '.repeat(remainingStamps)}`.trim()
                    : `${'🍕'.repeat(Math.min(8, activeStamps))} (${activeStamps}/${goal})`
                const stampStatusText =
                  remainingStamps === 0
                    ? '¡Cartilla completa! Ya puedes canjear tu premio en tienda o web.'
                    : `Llevas ${activeStamps} de ${goal} sellos. Te ${remainingStamps === 1 ? 'falta 1 sello' : `faltan ${remainingStamps} sellos`} para tu premio.`

                if (body.action === 'create-save-link') {
                  const issuerName = String(body.issuerName || 'Khalessi Pizza').trim() || 'Khalessi Pizza'
                  const programName = String(body.programName || 'Tarjeta de Puntos Khalessi').trim()
                  const subtitle = String(body.subtitle || '').trim()
                  const customerName = String(body.customerName || 'Cliente Khalessi').trim()
                  const accountId = String(body.customerPhone || customerId).trim() || customerId
                  const hexBg = /^#[0-9A-Fa-f]{6}$/.test(String(body.hexBackgroundColor || ''))
                    ? String(body.hexBackgroundColor)
                    : '#18181b'
                  const rawBarcodeType = String(body.barcodeType || 'QR_CODE')
                  const barcodeType =
                    rawBarcodeType === 'NONE' ? 'NONE' : rawBarcodeType === 'CODE_128' ? 'CODE_128' : 'QR_CODE'

                  const resolvedLogoUrl =
                    typeof body.logoUrl === 'string' && /^https:\/\/.+/i.test(body.logoUrl.trim())
                      ? body.logoUrl.trim()
                      : 'https://www.gstatic.com/images/branding/product/2x/wallet_48dp.png'

                  const loyaltyClass: Record<string, unknown> = {
                    id: classId,
                    issuerName,
                    programName,
                    hexBackgroundColor: hexBg,
                    reviewStatus: 'UNDER_REVIEW',
                    programLogo: {
                      sourceUri: { uri: resolvedLogoUrl },
                      contentDescription: { defaultValue: { language: 'es', value: issuerName } },
                    },
                  }
                  if (typeof body.heroImageUrl === 'string' && /^https:\/\/.+/i.test(body.heroImageUrl.trim())) {
                    loyaltyClass.heroImage = {
                      sourceUri: { uri: body.heroImageUrl.trim() },
                      contentDescription: { defaultValue: { language: 'es', value: programName } },
                    }
                  }
                  if (Array.isArray(body.locations) && body.locations.length > 0) {
                    const validLocs = body.locations
                      .filter(
                        (l: unknown): l is { latitude: number; longitude: number } =>
                          Boolean(l) &&
                          typeof (l as { latitude?: unknown }).latitude === 'number' &&
                          typeof (l as { longitude?: unknown }).longitude === 'number' &&
                          Number.isFinite((l as { latitude: number }).latitude) &&
                          Number.isFinite((l as { longitude: number }).longitude)
                      )
                      .slice(0, 10)
                      .map((l: { latitude: number; longitude: number }) => ({ latitude: l.latitude, longitude: l.longitude }))
                    if (validLocs.length > 0) {
                      loyaltyClass.locations = validLocs
                    }
                  }

                  const loyaltyObject: Record<string, unknown> = {
                    id: objectId,
                    classId,
                    state: 'ACTIVE',
                    accountId,
                    accountName: customerName,
                    loyaltyPoints: { label: 'Puntos', balance: { int: points } },
                    secondaryLoyaltyPoints: { label: 'Sellos', balance: { string: `${stampBar} (${activeStamps}/${goal})` } },
                    textModulesData: [
                      {
                        id: 'stamps_progress',
                        header: `Sellos Marcados (${activeStamps} / ${goal})`,
                        body: `${stampPizzaBar}\n${stampStatusText}`,
                      },
                      {
                        id: 'program_info',
                        header: 'Programa de Puntos',
                        body: subtitle || 'Presenta este código en caja para sumar o canjear puntos.',
                      },
                    ],
                  }
                  if (barcodeType !== 'NONE') {
                    loyaltyObject.barcode = {
                      type: barcodeType,
                      value: `KHALESSI:LOYALTY:${customerId}`,
                      alternateText: accountId,
                    }
                  }

                  const claims: Record<string, unknown> = {
                    iss: sa.client_email,
                    aud: 'google',
                    typ: 'savetowallet',
                    iat: Math.floor(Date.now() / 1000),
                    payload: {
                      loyaltyClasses: [loyaltyClass],
                      loyaltyObjects: [loyaltyObject],
                    },
                  }
                  if (req.headers.origin && /^https:\/\//i.test(req.headers.origin)) {
                    claims.origins = [req.headers.origin]
                  }

                  const jwt = signJwt({ alg: 'RS256', typ: 'JWT' }, claims, sa.private_key)

                  // Si el objeto ya existía en Google Wallet, actualizarlo vía PATCH para reflejar sellos/puntos actuales
                  try {
                    const now = Math.floor(Date.now() / 1000)
                    const assertion = signJwt(
                      { alg: 'RS256', typ: 'JWT' },
                      {
                        iss: sa.client_email,
                        scope: 'https://www.googleapis.com/auth/wallet_object.issuer',
                        aud: 'https://oauth2.googleapis.com/token',
                        iat: now,
                        exp: now + 3600,
                      },
                      sa.private_key
                    )
                    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                      body: new URLSearchParams({
                        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                        assertion,
                      }).toString(),
                    })
                    const tokenJson = (await tokenRes.json()) as { access_token?: string }
                    if (tokenRes.ok && tokenJson.access_token) {
                      await fetch(
                        `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass/${encodeURIComponent(classId)}`,
                        {
                          method: 'PATCH',
                          headers: {
                            Authorization: `Bearer ${tokenJson.access_token}`,
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            issuerName,
                            programName,
                            hexBackgroundColor: hexBg,
                            programLogo: loyaltyClass.programLogo,
                            ...(loyaltyClass.heroImage ? { heroImage: loyaltyClass.heroImage } : {}),
                            ...(loyaltyClass.locations ? { locations: loyaltyClass.locations } : {}),
                          }),
                        }
                      )
                      const usePut = barcodeType === 'NONE'
                      await fetch(
                        `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${encodeURIComponent(objectId)}`,
                        {
                          method: usePut ? 'PUT' : 'PATCH',
                          headers: {
                            Authorization: `Bearer ${tokenJson.access_token}`,
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify(
                            usePut
                              ? loyaltyObject
                              : {
                                  loyaltyPoints: loyaltyObject.loyaltyPoints,
                                  secondaryLoyaltyPoints: loyaltyObject.secondaryLoyaltyPoints,
                                  textModulesData: loyaltyObject.textModulesData,
                                  barcode: loyaltyObject.barcode,
                                }
                          ),
                        }
                      )
                    }
                  } catch {
                    // Si aún no existe (404) o falla red, el JWT savetowallet lo creará al guardar
                  }

                  res.statusCode = 200
                  res.end(
                    JSON.stringify({
                      success: true,
                      saveUrl: `https://pay.google.com/gp/v/save/${jwt}`,
                      classId,
                      objectId,
                    })
                  )
                  return
                }

                if (body.action === 'sync-points') {
                  const now = Math.floor(Date.now() / 1000)
                  const assertion = signJwt(
                    { alg: 'RS256', typ: 'JWT' },
                    {
                      iss: sa.client_email,
                      scope: 'https://www.googleapis.com/auth/wallet_object.issuer',
                      aud: 'https://oauth2.googleapis.com/token',
                      iat: now,
                      exp: now + 3600,
                    },
                    sa.private_key
                  )
                  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                      assertion,
                    }).toString(),
                  })
                  const tokenJson = (await tokenRes.json()) as { access_token?: string }
                  if (!tokenRes.ok || !tokenJson.access_token) {
                    res.statusCode = 502
                    res.end(JSON.stringify({ success: false, error: 'Error obteniendo token OAuth2 de Google.' }))
                    return
                  }
                  const patchRes = await fetch(
                    `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${encodeURIComponent(objectId)}`,
                    {
                      method: 'PATCH',
                      headers: {
                        Authorization: `Bearer ${tokenJson.access_token}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        loyaltyPoints: { label: 'Puntos', balance: { int: points } },
                        secondaryLoyaltyPoints: { label: 'Sellos', balance: { string: `${stampBar} (${activeStamps}/${goal})` } },
                        textModulesData: [
                          {
                            id: 'stamps_progress',
                            header: `Sellos Marcados (${activeStamps} / ${goal})`,
                            body: `${stampPizzaBar}\n${stampStatusText}`,
                          },
                        ],
                      }),
                    }
                  )
                  if (patchRes.status === 404) {
                    res.statusCode = 200
                    res.end(JSON.stringify({ success: true, synced: false, reason: 'object_not_found' }))
                    return
                  }
                  if (!patchRes.ok) {
                    res.statusCode = 502
                    res.end(JSON.stringify({ success: false, error: 'Error sincronizando puntos en Google Wallet.' }))
                    return
                  }
                  res.statusCode = 200
                  res.end(JSON.stringify({ success: true, synced: true, objectId, points }))
                  return
                }

                if (body.action === 'send-promo') {
                  const header = String(body.header || '').trim().slice(0, 80)
                  const rawBodyText = String(body.body || '').trim().slice(0, 400)
                  const promoUrl = String(body.promoUrl || '').trim()
                  if (!header || !rawBodyText) {
                    res.statusCode = 400
                    res.end(JSON.stringify({ success: false, error: 'Título y mensaje son obligatorios.' }))
                    return
                  }
                  const finalBody =
                    promoUrl && /^https:\/\/.+/i.test(promoUrl) ? `${rawBodyText}\n${promoUrl}` : rawBodyText
                  const messageType = body.messageType === 'TEXT' ? 'TEXT' : 'TEXT_AND_NOTIFY'
                  const targetCust = String(body.targetCustomerId || '').trim()
                  const targetEndpoint = targetCust
                    ? `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${encodeURIComponent(
                        `${issuerId}.khalessi_cust_${sanitizeId(targetCust)}`
                      )}/addMessage`
                    : `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass/${encodeURIComponent(
                        classId
                      )}/addMessage`

                  const now = Math.floor(Date.now() / 1000)
                  const assertion = signJwt(
                    { alg: 'RS256', typ: 'JWT' },
                    {
                      iss: sa.client_email,
                      scope: 'https://www.googleapis.com/auth/wallet_object.issuer',
                      aud: 'https://oauth2.googleapis.com/token',
                      iat: now,
                      exp: now + 3600,
                    },
                    sa.private_key
                  )
                  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                      assertion,
                    }).toString(),
                  })
                  const tokenJson = (await tokenRes.json()) as { access_token?: string }
                  if (!tokenRes.ok || !tokenJson.access_token) {
                    res.statusCode = 502
                    res.end(JSON.stringify({ success: false, error: 'Error obteniendo token OAuth2 de Google.' }))
                    return
                  }

                  const msgId = `promo_${Date.now()}`
                  const msgRes = await fetch(targetEndpoint, {
                    method: 'POST',
                    headers: {
                      Authorization: `Bearer ${tokenJson.access_token}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      message: {
                        id: msgId,
                        header,
                        body: finalBody,
                        messageType,
                      },
                    }),
                  })
                  const msgText = await msgRes.text()
                  if (!msgRes.ok) {
                    let googleErr = 'Error enviando notificación a Google Wallet.'
                    try {
                      const parsedErr = JSON.parse(msgText) as { error?: { message?: string } }
                      if (parsedErr?.error?.message) googleErr = parsedErr.error.message
                    } catch {
                      // keep default
                    }
                    res.statusCode = 502
                    res.end(JSON.stringify({ success: false, error: googleErr }))
                    return
                  }

                  res.statusCode = 200
                  res.end(JSON.stringify({ success: true, messageId: msgId }))
                  return
                }

                res.statusCode = 400
                res.end(JSON.stringify({ success: false, error: 'Acción no reconocida.' }))
              } catch (err) {
                res.statusCode = 500
                res.end(JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'Error interno' }))
              }
            })
            return
          }
        }

        // Marketing Web Push API (dev mirror of public/api/marketing-push.php)
        if (req.url?.split('?')[0] === '/api/marketing-push.php') {
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.setHeader('Cache-Control', 'no-store')

          const dataDir = path.resolve(process.cwd(), 'data')
          if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
          const vapidFile = path.join(dataDir, 'marketing-vapid.json')
          const subsFile = path.join(dataDir, 'marketing_push_subscriptions.json')
          const campaignsFile = path.join(dataDir, 'marketing_scheduled_campaigns.json')
          const cronKeyFile = path.join(dataDir, 'marketing-cron-key.txt')

          const b64url = (input: Buffer | string) =>
            Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
          const b64urlDecode = (str: string) => {
            const pad = str.length % 4
            const padded = pad ? str + '='.repeat(4 - pad) : str
            return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
          }

          const readJson = <T,>(filePath: string, fallback: T): T => {
            try {
              if (!fs.existsSync(filePath)) return fallback
              return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T
            } catch {
              return fallback
            }
          }
          const writeJson = (filePath: string, val: unknown) => {
            fs.writeFileSync(filePath, JSON.stringify(val, null, 2))
          }

          const getOrCreateCronKey = () => {
            if (fs.existsSync(cronKeyFile)) {
              const k = fs.readFileSync(cronKeyFile, 'utf-8').trim()
              if (k) return k
            }
            const k = crypto.randomBytes(16).toString('hex')
            fs.writeFileSync(cronKeyFile, k)
            return k
          }

          const getOrCreateVapid = (): { publicKey: string; privatePem: string; publicPem: string } => {
            const existing = readJson<{ publicKey?: string; privatePem?: string; publicPem?: string }>(vapidFile, {})
            if (existing.publicKey && existing.privatePem && existing.publicPem) {
              return { publicKey: existing.publicKey, privatePem: existing.privatePem, publicPem: existing.publicPem }
            }
            const { publicKey: pubKeyObj, privateKey: privKeyObj } = crypto.generateKeyPairSync('ec', {
              namedCurve: 'prime256v1',
            })
            const privatePem = privKeyObj.export({ type: 'pkcs8', format: 'pem' }).toString()
            const publicPem = pubKeyObj.export({ type: 'spki', format: 'pem' }).toString()
            const jwk = pubKeyObj.export({ format: 'jwk' }) as { x: string; y: string }
            const rawPub = Buffer.concat([Buffer.from([0x04]), b64urlDecode(jwk.x), b64urlDecode(jwk.y)])
            const vapid = {
              publicKey: b64url(rawPub),
              privatePem,
              publicPem,
              createdAt: new Date().toISOString(),
            }
            writeJson(vapidFile, vapid)
            return vapid
          }

          const encryptWebPush = (plaintext: string, uaPubB64: string, authB64: string): Buffer => {
            const uaPub = b64urlDecode(uaPubB64)
            const authSecret = b64urlDecode(authB64)
            const ecdh = crypto.createECDH('prime256v1')
            ecdh.generateKeys()
            const asPub = ecdh.getPublicKey()
            const sharedSecret = ecdh.computeSecret(uaPub)

            const salt = crypto.randomBytes(16)
            const prkKey = crypto.createHmac('sha256', authSecret).update(sharedSecret).digest()
            const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0', 'utf8'), uaPub, asPub, Buffer.from([0x01])])
            const ikm = crypto.createHmac('sha256', prkKey).update(keyInfo).digest()

            const prk = crypto.createHmac('sha256', salt).update(ikm).digest()
            const cek = crypto
              .createHmac('sha256', prk)
              .update(Buffer.from('Content-Encoding: aes128gcm\0\x01', 'utf8'))
              .digest()
              .subarray(0, 16)
            const nonce = crypto
              .createHmac('sha256', prk)
              .update(Buffer.from('Content-Encoding: nonce\0\x01', 'utf8'))
              .digest()
              .subarray(0, 12)

            const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce)
            const encrypted = Buffer.concat([cipher.update(Buffer.concat([Buffer.from(plaintext, 'utf8'), Buffer.from([0x02])])), cipher.final()])
            const tag = cipher.getAuthTag()
            const rs = Buffer.alloc(4)
            rs.writeUInt32BE(4096, 0)
            return Buffer.concat([salt, rs, Buffer.from([65]), asPub, encrypted, tag])
          }

          const signVapidJwt = (endpoint: string, privatePem: string) => {
            const u = new URL(endpoint)
            const aud = `${u.protocol}//${u.host}`
            const head = b64url(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))
            const body = b64url(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 43200, sub: 'mailto:marketing@pizzakhalessi.com' }))
            const sig = crypto.sign('sha256', Buffer.from(`${head}.${body}`), { key: privatePem, dsaEncoding: 'ieee-p1363' })
            return `${head}.${body}.${b64url(sig)}`
          }

          const dispatchPush = async (campaign: Record<string, unknown>) => {
            type SubItem = { endpoint: string; keys: { p256dh: string; auth: string }; customerId?: string; customerPhone?: string }
            const subs = readJson<SubItem[]>(subsFile, [])
            if (subs.length === 0) return { sent: 0, failed: 0, total: 0 }
            const targetCustId = String(campaign.targetCustomerId || '').trim()
            const targetPhone = String(campaign.targetCustomerPhone || '').replace(/\D+/g, '')
            const targets = subs.filter(s => {
              if (!targetCustId && !targetPhone) return true
              const subPhone = String(s.customerPhone || '').replace(/\D+/g, '')
              return (targetCustId && s.customerId === targetCustId) || (targetPhone && subPhone && subPhone === targetPhone)
            })
            const vapid = getOrCreateVapid()
            const jsonPayload = JSON.stringify({
              title: String(campaign.title || 'Pizza Khalessi'),
              body: String(campaign.body || ''),
              url: String(campaign.targetUrl || '/'),
              ...(campaign.imageUrl ? { image: String(campaign.imageUrl) } : {}),
              tag: `khalessi-mkt-${String(campaign.id || Date.now())}`,
            })
            let sent = 0
            let failed = 0
            const expired = new Set<string>()
            for (const sub of targets) {
              try {
                const jwt = signVapidJwt(sub.endpoint, vapid.privatePem)
                const bodyBuf = encryptWebPush(jsonPayload, sub.keys.p256dh, sub.keys.auth)
                const pushRes = await fetch(sub.endpoint, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/octet-stream',
                    'Content-Encoding': 'aes128gcm',
                    TTL: '86400',
                    Urgency: 'high',
                    Authorization: `vapid t=${jwt}, k=${vapid.publicKey}`,
                  },
                  body: new Uint8Array(bodyBuf),
                })
                if (pushRes.ok) sent++
                else {
                  failed++
                  if (pushRes.status === 404 || pushRes.status === 410) expired.add(sub.endpoint)
                }
              } catch {
                failed++
              }
            }
            if (expired.size > 0) {
              writeJson(subsFile, subs.filter(s => !expired.has(s.endpoint)))
            }
            return { sent, failed, total: targets.length }
          }

          const urlObj = new URL(req.url, 'http://localhost')
          const queryAction = urlObj.searchParams.get('action') || 'stats'

          if (req.method === 'GET') {
            if (queryAction === 'vapid-public-key') {
              const vapid = getOrCreateVapid()
              res.statusCode = 200
              res.end(JSON.stringify({ success: true, publicKey: vapid.publicKey }))
              return
            }
            if (queryAction === 'stats') {
              const subs = readJson<Array<Record<string, unknown>>>(subsFile, [])
              const byPlatform = { android: 0, ios: 0, windows: 0, macos: 0, other: 0 }
              for (const s of subs) {
                const p = String(s.platform || 'other') as keyof typeof byPlatform
                byPlatform[p in byPlatform ? p : 'other']++
              }
              res.statusCode = 200
              res.end(JSON.stringify({ success: true, totalSubscribers: subs.length, byPlatform, subscribers: subs, cronKey: getOrCreateCronKey() }))
              return
            }
            if (queryAction === 'campaigns') {
              res.statusCode = 200
              res.end(JSON.stringify({ success: true, campaigns: readJson(campaignsFile, []) }))
              return
            }
            if (queryAction === 'run-scheduled') {
              const campaigns = readJson<Array<Record<string, unknown>>>(campaignsFile, [])
              const now = Date.now()
              let processed = 0
              let sent = 0
              for (const c of campaigns) {
                if (c.status === 'scheduled' && new Date(String(c.scheduledAt || '')).getTime() <= now) {
                  processed++
                  const r = await dispatchPush(c)
                  c.status = 'sent'
                  c.sentAt = new Date().toISOString()
                  c.sentCount = r.sent
                  c.failedCount = r.failed
                  sent += r.sent
                }
              }
              if (processed > 0) writeJson(campaignsFile, campaigns)
              res.statusCode = 200
              res.end(JSON.stringify({ success: true, processed, sent }))
              return
            }
            res.statusCode = 400
            res.end(JSON.stringify({ success: false, error: 'Acción GET no soportada.' }))
            return
          }

          if (req.method === 'POST') {
            const chunks: Buffer[] = []
            req.on('data', c => chunks.push(Buffer.from(c)))
            req.on('end', async () => {
              try {
                const body = JSON.parse(Buffer.concat(chunks).toString('utf-8') || '{}') as Record<string, unknown>
                const action = String(body.action || '')
                if (action === 'subscribe') {
                  const sub = body.subscription as { endpoint?: string; keys?: { p256dh?: string; auth?: string } } | undefined
                  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
                    res.statusCode = 400
                    res.end(JSON.stringify({ success: false, error: 'Suscripción inválida.' }))
                    return
                  }
                  const subs = readJson<Array<Record<string, unknown>>>(subsFile, [])
                  const rec = {
                    id: `push-${crypto.createHash('sha1').update(sub.endpoint).digest('hex').slice(0, 12)}`,
                    endpoint: sub.endpoint,
                    keys: sub.keys,
                    customerId: String(body.customerId || '').trim(),
                    customerName: String(body.customerName || '').trim(),
                    customerPhone: String(body.customerPhone || '').trim(),
                    platform: String(body.platform || 'other'),
                    tenantId: String(body.tenantId || '').trim(),
                    createdAt: new Date().toISOString(),
                  }
                  const idx = subs.findIndex(s => s.endpoint === sub.endpoint)
                  if (idx >= 0) subs[idx] = { ...subs[idx], ...rec }
                  else subs.unshift(rec)
                  writeJson(subsFile, subs)
                  res.statusCode = 200
                  res.end(JSON.stringify({ success: true, id: rec.id, totalSubscribers: subs.length }))
                  return
                }
                if (action === 'send-push') {
                  const r = await dispatchPush(body)
                  res.statusCode = 200
                  res.end(JSON.stringify({ success: true, ...r }))
                  return
                }
                if (action === 'schedule') {
                  const campaign = body.campaign as Record<string, unknown>
                  const campaigns = readJson<Array<Record<string, unknown>>>(campaignsFile, [])
                  campaigns.unshift(campaign)
                  writeJson(campaignsFile, campaigns.slice(0, 100))
                  res.statusCode = 200
                  res.end(JSON.stringify({ success: true, campaign }))
                  return
                }
                if (action === 'cancel' || action === 'delete') {
                  const id = String(body.id || '')
                  let campaigns = readJson<Array<Record<string, unknown>>>(campaignsFile, [])
                  if (action === 'delete') campaigns = campaigns.filter(c => c.id !== id)
                  else campaigns = campaigns.map(c => (c.id === id && c.status === 'scheduled' ? { ...c, status: 'cancelled' } : c))
                  writeJson(campaignsFile, campaigns)
                  res.statusCode = 200
                  res.end(JSON.stringify({ success: true, campaigns }))
                  return
                }
                if (action === 'run-scheduled') {
                  const campaigns = readJson<Array<Record<string, unknown>>>(campaignsFile, [])
                  const now = Date.now()
                  let processed = 0
                  let sent = 0
                  for (const c of campaigns) {
                    if (c.status === 'scheduled' && new Date(String(c.scheduledAt || '')).getTime() <= now) {
                      processed++
                      const r = await dispatchPush(c)
                      c.status = 'sent'
                      c.sentAt = new Date().toISOString()
                      c.sentCount = r.sent
                      c.failedCount = r.failed
                      sent += r.sent
                    }
                  }
                  if (processed > 0) writeJson(campaignsFile, campaigns)
                  res.statusCode = 200
                  res.end(JSON.stringify({ success: true, processed, sent }))
                  return
                }
                res.statusCode = 400
                res.end(JSON.stringify({ success: false, error: 'Acción POST no reconocida.' }))
              } catch (err) {
                res.statusCode = 500
                res.end(JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'Error interno' }))
              }
            })
            return
          }
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
