# Frontend

Клиентская часть DecentralizedVLab: React 19, Vite, Monaco Editor, Yjs, Service Worker и клиентские компиляторы Python, JavaScript, Lua и SQLite.

## Команды

```powershell
npm install
npm run dev
npm run lint
npm run build
```

`npm run build` создаёт production-сборку в `dist` и генерирует Service Worker. Каталог `public/compilers` содержит сторонние WebAssembly-ресурсы и JavaScript-обёртки компиляторов; они исключены из ESLint как vendored-артефакты.

## Офлайн-ресурсы

WebAssembly-движки загружаются по требованию и кэшируются через Cache API. Для работы без сети пользователь должен сначала открыть приложение и загрузить нужные среды исполнения онлайн.
