const PARAMETER = 'scenario'
const VERSION = 1
const MAX_LENGTH = 7000

function bytesToBase64Url(bytes) {
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

function base64UrlToBytes(value) {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (value.length % 4)) % 4)
  const binary = atob(padded)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

export function useShareState() {
  function createShareUrl(state) {
    const payload = JSON.stringify({ version: VERSION, state: clone(state) })
    const encoded = bytesToBase64Url(new TextEncoder().encode(payload))
    if (encoded.length > MAX_LENGTH) throw new Error('This scenario is too large to fit in a share link.')
    const url = new URL(window.location.href)
    url.pathname = '/'
    url.search = ''
    url.hash = ''
    url.searchParams.set(PARAMETER, encoded)
    return `${url.pathname}${url.search}`
  }

  function readShareState() {
    try {
      const encoded = new URL(window.location.href).searchParams.get(PARAMETER)
      if (!encoded || encoded.length > MAX_LENGTH) return null
      const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(encoded)))
      if (payload.version !== VERSION || !payload.state || typeof payload.state !== 'object') return null
      return payload.state
    } catch {
      return null
    }
  }

  return { createShareUrl, readShareState }
}
