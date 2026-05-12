let pyodide: any = null

self.onmessage = async (e: MessageEvent) => {
  const { type, files, stdin } = e.data

  if (type === 'init') {
    try {
      const dynamicImport = new Function('url', 'return import(url)')
      const m = await dynamicImport('/compilers/pyodide/pyodide.mjs')
      pyodide = await m.loadPyodide({ indexURL: '/compilers/pyodide/' })
      self.postMessage({ type: 'ready' })
    } catch (err: any) {
      self.postMessage({ type: 'error', message: err.message })
    }
    return
  }

  if (type === 'run') {
    try {
      await pyodide.runPythonAsync(
        `import sys, io\nsys.stdout = io.StringIO()\nsys.stdin = io.StringIO(${JSON.stringify(stdin ?? '')})`
      )
      for (const [path, content] of Object.entries(files as Record<string, string>))
        pyodide.FS.writeFile('/' + path, content)
      await pyodide.runPythonAsync(
        `import sys\nif '/' not in sys.path: sys.path.insert(0, '/')`
      )
      const keys = Object.keys(files as Record<string, string>)
      const entry = keys.includes('main.py') ? 'main.py' : keys[0]
      await pyodide.runPythonAsync(`exec(open('/${entry}').read())`)
      const output: string = await pyodide.runPythonAsync('sys.stdout.getvalue()')
      self.postMessage({ type: 'done', output: output || 'Программа выполнена (нет вывода)' })
    } catch (err: any) {
      self.postMessage({ type: 'done', output: `❌ Ошибка:\n${err.message}` })
    }
  }
}
