import crypto from 'crypto'
import { NextResponse } from 'next/server'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://adel-resort.ph'
const APP_SECRET = process.env.FACEBOOK_APP_SECRET || process.env.META_APP_SECRET

function base64UrlDecode(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(base64, 'base64')
}

function parseSignedRequest(signedRequest) {
  const [encodedSig, payload] = signedRequest.split('.')
  if (!encodedSig || !payload) {
    throw new Error('Malformed signed request')
  }

  const signature = base64UrlDecode(encodedSig)
  const expected = crypto.createHmac('sha256', APP_SECRET).update(payload).digest()

  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(signature, expected)
  ) {
    throw new Error('Invalid signed request signature')
  }

  return JSON.parse(base64UrlDecode(payload).toString('utf8'))
}

async function readSignedRequest(request) {
  const contentType = request.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    const body = await request.json().catch(() => ({}))
    return body?.signed_request || ''
  }

  const bodyText = await request.text()
  const params = new URLSearchParams(bodyText)
  return params.get('signed_request') || ''
}

function responseFor(userId) {
  return NextResponse.json({
    url: `${SITE_URL}/data-deletion`,
    confirmation_code: userId ? `facebook-${userId}` : 'facebook-data-deletion-request',
  })
}

export async function GET() {
  return responseFor()
}

export async function POST(request) {
  const signedRequest = await readSignedRequest(request)

  if (!signedRequest || !APP_SECRET) {
    return responseFor()
  }

  try {
    const payload = parseSignedRequest(signedRequest)
    return responseFor(payload?.user_id)
  } catch {
    return NextResponse.json({ error: 'Invalid signed_request' }, { status: 400 })
  }
}
