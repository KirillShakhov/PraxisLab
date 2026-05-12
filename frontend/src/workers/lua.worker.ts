let luaEngine: any = null

self.onmessage = async (e: MessageEvent) => {
  const { type, files } = e.data

  if (type === 'init') {
    try {
      const text = await fetch('/compilers/lua/wasmoon.js').then(r => r.text())
      // UMD bundle: detects `typeof globalThis !== 'undefined'` and assigns globalThis.wasmoon
      // eslint-disable-next-line no-new-func
      ;(new Function(text))()
      const wasmoon = (globalThis as any).wasmoon
      if (!wasmoon?.LuaFactory) throw new Error('LuaFactory не найдена в globalThis')
      const factory = new wasmoon.LuaFactory('/compilers/lua/wasmoon.wasm')
      luaEngine = await factory.createEngine()
      self.postMessage({ type: 'ready' })
    } catch (err: any) {
      self.postMessage({ type: 'error', message: err.message })
    }
    return
  }

  if (type === 'run') {
    let output = ''
    try {
      luaEngine.global.set('print', (...args: any[]) => {
        output += args.map(String).join('\t') + '\n'
      })
      const keys = Object.keys(files as Record<string, string>)
      const entry = keys.includes('main.lua') ? 'main.lua' : keys[0]
      await luaEngine.doString((files as Record<string, string>)[entry])
      self.postMessage({ type: 'done', output: output || 'Программа выполнена успешно.' })
    } catch (err: any) {
      self.postMessage({ type: 'done', output: `❌ Ошибка исполнения Lua:\n${err.message}` })
    }
  }
}
