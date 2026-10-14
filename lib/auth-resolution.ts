type Listener = () => void

let pending = false
const listeners = new Set<Listener>()

function emit() {
  listeners.forEach((listener) => listener())
}

/** True from the OAuth callback until the session is applied or sign-in fails. */
export function oauthResolutionPending(): boolean {
  return pending
}

export function beginOAuthResolution() {
  if (pending) return
  pending = true
  emit()
}

export function finishOAuthResolution() {
  if (!pending) return
  pending = false
  emit()
}

export function subscribeOAuthResolution(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Test helper. */
export function resetOAuthResolution() {
  pending = false
  listeners.clear()
}
