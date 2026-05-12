let SQL: any = null

self.onmessage = async (e: MessageEvent) => {
  const { type, files } = e.data

  if (type === 'init') {
    try {
      const text = await fetch('/compilers/sqlite/sql-wasm.js').then(r => r.text())
      // eslint-disable-next-line no-new-func
      ;(new Function(text))()
      const initSqlJs = (globalThis as any).initSqlJs
      if (!initSqlJs) throw new Error('initSqlJs не найдена после загрузки sql-wasm.js')
      SQL = await initSqlJs({ locateFile: (f: string) => `/compilers/sqlite/${f}` })
      self.postMessage({ type: 'ready' })
    } catch (err: any) {
      self.postMessage({ type: 'error', message: err.message })
    }
    return
  }

  if (type === 'run') {
    const output: string[] = []
    const db = new SQL.Database()
    try {
      const sqlFiles = Object.entries(files as Record<string, string>)
        .filter(([p]) => p.endsWith('.sql'))
        .sort(([a], [b]) => a.localeCompare(b))

      if (sqlFiles.length === 0) {
        self.postMessage({ type: 'done', output: '⚠️ Нет .sql файлов для выполнения' })
        db.close()
        return
      }

      for (const [path, code] of sqlFiles) {
        output.push(`-- ${path}`)
        const res = db.exec(code)
        if (res.length === 0) {
          output.push(`✅ Выполнено (изменено строк: ${db.getRowsModified()})`)
        } else {
          res.forEach((r: any) => {
            const header = r.columns.join(' | ')
            const sep = '-'.repeat(Math.max(header.length, 10))
            const rows = r.values.map((v: any) => v.join(' | ')).join('\n')
            output.push(`${header}\n${sep}\n${rows}`)
          })
        }
        output.push('')
      }
      self.postMessage({ type: 'done', output: output.join('\n') })
    } catch (err: any) {
      self.postMessage({ type: 'done', output: `❌ Ошибка SQLite: ${err.message}` })
    } finally {
      db.close()
    }
  }
}
