export interface ExecuteRequest {
  language: string
  files: Record<string, string>
  stdin?: string
}

export interface ExecuteResponse {
  stdout: string
  stderr: string
  durationMs: number
  timedOut: boolean
}

export async function executeOnServer(req: ExecuteRequest): Promise<ExecuteResponse> {
  const res = await fetch('/api/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(`Server execution failed: ${msg}`)
  }
  return res.json()
}
