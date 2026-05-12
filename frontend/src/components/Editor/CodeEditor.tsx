import React, { useRef } from 'react';
import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';
import { MessagePackHubProtocol } from '@microsoft/signalr-protocol-msgpack';
import { HubConnectionBuilder, LogLevel, HubConnectionState } from '@microsoft/signalr';
import { Box } from '@mui/material';

interface CodeEditorProps {
    roomId: string;
    language: string;
    initialCode?: string | null; // начальный код из шаблона лабораторной
    onEditorReady?: (editor: any) => void;
}

export default function CodeEditor({ roomId, language, initialCode, onEditorReady }: CodeEditorProps) {
    const editorRef = useRef(null);
    const ydocRef = useRef(null);
    const connectionRef = useRef(null);

    // Уникальный ключ для каждой комнаты
    const LOCAL_STORAGE_KEY = `praxis_code_${roomId}`;

    const handleEditorDidMount = async (editor, monaco) => {
        editorRef.current = editor;

        if (onEditorReady) {
            onEditorReady(editor);
        }

        const ydoc = new Y.Doc();
        ydocRef.current = ydoc;
        const ytext = ydoc.getText('monaco');

        // 1. Приоритет источников кода: localStorage > initialCode (шаблон лабы)
        const savedCode = localStorage.getItem(LOCAL_STORAGE_KEY);
        const startCode = savedCode ?? initialCode ?? null;
        if (startCode) {
            ytext.insert(0, startCode);
        }

        const connection = new HubConnectionBuilder()
            .withUrl('/sync-hub')
            .withAutomaticReconnect()
            .withHubProtocol(new MessagePackHubProtocol())
            // Отключаем лишний спам SignalR в консоли (оставляем только Warning и Error)
            .configureLogging(LogLevel.Warning)
            .build();

        connectionRef.current = connection;

        connection.on('UserJoined', (connectionId) => {
            console.log(`[Комната] Подключился новый участник: ${connectionId}`);
        });

        connection.on('UserLeft', (connectionId) => {
            console.log(`[Комната] Участник покинул лабораторию: ${connectionId}`);
        });

        connection.on('ReceiveDocumentUpdate', (updateAsArray) => {
            const update = new Uint8Array(updateAsArray);
            Y.applyUpdate(ydoc, update, 'signalr');
        });

        // 2. УСПОКОИТЕЛЬ SIGNALR (Fail-Fast)
        const startConnection = async () => {
            if (!navigator.onLine) {
                console.log('🌐 Офлайн-режим: Локальная разработка. Код сохраняется в браузере.');
                return; // Даже не пытаемся подключиться
            }

            try {
                await connection.start();
                await connection.invoke('JoinRoom', roomId);
                console.log('✅ SignalR подключен. Совместная работа активна.');
            } catch (err) {
                console.warn('⚠️ Сервер синхронизации недоступен. Переход в режим локальной разработки.');
            }
        };

        // Запускаем подключение
        await startConnection();

        // 3. ПЕРЕХВАТ ИЗМЕНЕНИЙ (Сохранение + Отправка)
        ydoc.on('update', (update, origin) => {
            // ВСЕГДА сохраняем текущий текст в LocalStorage при любых изменениях
            localStorage.setItem(LOCAL_STORAGE_KEY, ytext.toString());

            // ОТПРАВЛЯЕМ на сервер ТОЛЬКО если это наши изменения И мы подключены
            if (origin !== 'signalr' && connection.state === HubConnectionState.Connected) {
                connection.invoke('SendDocumentUpdate', roomId, update)
                    .catch(err => console.error('Ошибка отправки:', err));
            }
        });

        // Биндим Yjs к Monaco
        new MonacoBinding(ytext, editorRef.current.getModel(), new Set([editorRef.current]));
    };

    return (
        <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden', height: '100%' }}>
            <Editor
                height="60vh"
                theme="vs-dark"
                language={language}
                onMount={handleEditorDidMount}
                options={{
                    minimap: { enabled: false },
                    fontSize: 16,
                    padding: { top: 16 },
                    scrollBeyondLastLine: false
                }}
            />
        </Box>
    );
}