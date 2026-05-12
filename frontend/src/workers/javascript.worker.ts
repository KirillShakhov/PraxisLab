self.onmessage = async (e: MessageEvent) => {
  const { type, files } = e.data

  if (type === 'init') {
    self.postMessage({ type: 'ready' })
    return
  }

  if (type === 'run') {
    const logs: string[] = []
    const orig = { log: console.log, error: console.error, warn: console.warn }
    console.log = (...a: any[]) => logs.push(a.map(String).join(' '))
    console.error = (...a: any[]) => logs.push('❌ ' + a.map(String).join(' '))
    console.warn = (...a: any[]) => logs.push('⚠️ ' + a.map(String).join(' '))

    try {
      const keys = Object.keys(files as Record<string, string>)
      const entry = keys.includes('main.js') ? 'main.js' : keys[0]
      const helpers = keys
        .filter(k => k !== entry)
        .map(k => (files as Record<string, string>)[k])
        .join('\n\n')
      const code = helpers + '\n\n' + (files as Record<string, string>)[entry]
      // eslint-disable-next-line no-new-func
      ;(new Function(code))()
      self.postMessage({ type: 'done', output: logs.join('\n') || 'Программа выполнена (логов нет)' })
    } catch (err: any) {
      self.postMessage({ type: 'done', output: `❌ Ошибка выполнения:\n${err.message}` })
    } finally {
      console.log = orig.log
      console.error = orig.error
      console.warn = orig.warn
    }
  }
}
