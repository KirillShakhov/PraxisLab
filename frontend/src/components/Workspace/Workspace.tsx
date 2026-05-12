import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Box, Paper, Select, MenuItem, FormControl, InputLabel,
  Button, Chip, Typography, CircularProgress, IconButton,
  Tooltip, Divider, Snackbar, LinearProgress,
} from '@mui/material';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import DescriptionIcon from '@mui/icons-material/Description';
import SpeedIcon from '@mui/icons-material/Speed';
import ShareIcon from '@mui/icons-material/Share';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

import Terminal, { type RunMode } from '../Terminal/Terminal';
import FileTree from '../FileTree/FileTree';
import MultiFileEditor from '../Editor/MultiFileEditor';
import TestPanel from '../TestPanel/TestPanel';
import ParticipantList from '../ParticipantList/ParticipantList';
import ProfilerPanel from '../ProfilerPanel/ProfilerPanel';
import RolePickerDialog from './RolePickerDialog';
import { PythonCompiler } from '../../compilers/python';
import { JavascriptCompiler } from '../../compilers/javascript';
import { SQLiteCompiler } from '../../compilers/sqlite';
import { LuaCompiler } from '../../compilers/lua';
import { useYjsSession } from '../../hooks/useYjsSession';
import { useTestRunner } from '../../hooks/useTestRunner';
import { useProfiler } from '../../hooks/useProfiler';
import { executeOnServer } from '../../api/executeApi';
import type { Lab, User } from '../../types';

const COMPILERS: Record<string, any> = {
  [PythonCompiler.id]: PythonCompiler,
  [JavascriptCompiler.id]: JavascriptCompiler,
  [SQLiteCompiler.id]: SQLiteCompiler,
  [LuaCompiler.id]: LuaCompiler,
};

const STORAGE_KEY = 'praxis_selected_compiler';
const DESC_WIDTH_KEY = 'praxis_desc_width';
const DESC_COLLAPSED_KEY = 'praxis_desc_collapsed';
const MIN_DESC_WIDTH = 200;
const MAX_DESC_WIDTH = 520;

interface WorkspaceProps {
  roomId: string;
  isOnline: boolean;
  lab?: Lab;
  user?: User | null;
  nextLab?: Lab | null;
  labIndex?: number;
  totalLabs?: number;
  completedCount?: number;
  onLabComplete?: () => void;
  onNavigateNext?: () => void;
  onClearSession?: () => void;
}

export default function Workspace({
  roomId, isOnline, lab, user,
  nextLab, labIndex, totalLabs, completedCount,
  onLabComplete, onNavigateNext, onClearSession,
}: WorkspaceProps) {
  const [currentLang, setCurrentLang] = useState(() =>
    lab?.language ?? localStorage.getItem(STORAGE_KEY) ?? ''
  );
  const [output, setOutput] = useState(currentLang ? 'Подключение к комнате...' : 'Выберите язык');
  const [stdin, setStdin] = useState('');
  const [isEngineReady, setIsEngineReady] = useState(false);
  const [status, setStatus] = useState({ isDownloaded: false, isDownloading: false, progress: 0 });
  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [showProfiler, setShowProfiler] = useState(false);
  const [profilerMode, setProfilerMode] = useState<'wasm-only' | 'compare'>('wasm-only');
  const [runMode, setRunMode] = useState<RunMode>('wasm');
  const [isCodeRunning, setIsCodeRunning] = useState(false);
  const [lastDurationMs, setLastDurationMs] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState('');

  // Description panel state
  const [descWidth, setDescWidth] = useState(() => {
    const saved = localStorage.getItem(DESC_WIDTH_KEY)
    return saved ? Math.max(MIN_DESC_WIDTH, Math.min(MAX_DESC_WIDTH, parseInt(saved))) : 280
  });
  const [descCollapsed, setDescCollapsed] = useState(() =>
    localStorage.getItem(DESC_COLLAPSED_KEY) === 'true'
  );

  const descWidthRef = useRef(descWidth);
  const completedCalledRef = useRef(false);
  const onLabCompleteRef = useRef(onLabComplete);

  useEffect(() => { onLabCompleteRef.current = onLabComplete }, [onLabComplete]);

  const updateDescWidth = useCallback((w: number) => {
    descWidthRef.current = w;
    setDescWidth(w);
    localStorage.setItem(DESC_WIDTH_KEY, String(w));
  }, []);

  const toggleDescCollapsed = useCallback((val: boolean) => {
    setDescCollapsed(val);
    localStorage.setItem(DESC_COLLAPSED_KEY, String(val));
  }, []);

  // Drag-to-resize handler
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = descWidthRef.current;

    const onMove = (ev: MouseEvent) => {
      updateDescWidth(Math.max(MIN_DESC_WIDTH, Math.min(MAX_DESC_WIDTH, startWidth + ev.clientX - startX)));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [updateDescWidth]);

  const initialFiles = React.useMemo<Record<string, string>>(() =>
    lab?.files ? Object.fromEntries(lab.files.map(f => [f.path, f.content])) : {},
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [roomId]);

  const {
    ydoc, yfiles, awareness, fileList, activeFile, setActiveFile,
    addFile, deleteFile, getFiles, participants, myRole, setMyRole,
  } = useYjsSession(roomId, isOnline, initialFiles, user);

  const ymeta = ydoc.getMap<string>('meta');

  // Store lab metadata so collaborators joining via link can read it from Yjs
  useEffect(() => {
    if (lab && !ymeta.has('lab')) {
      ymeta.set('lab', JSON.stringify(lab));
    }
  }, [lab]);

  const [yjsLab, setYjsLab] = useState<Lab | null>(() => {
    const stored = ymeta.get('lab');
    return stored ? (JSON.parse(stored) as Lab) : null;
  });

  useEffect(() => {
    const sync = () => {
      const stored = ymeta.get('lab');
      if (stored) setYjsLab(JSON.parse(stored) as Lab);
    };
    sync();
    ymeta.observe(sync);
    return () => ymeta.unobserve(sync);
  }, [ymeta]);

  const resolvedLab = lab ?? yjsLab;

  // When lab syncs from Yjs (collaborator joining via link), set language
  useEffect(() => {
    if (yjsLab?.language && !lab && !currentLang) {
      setCurrentLang(yjsLab.language);
    }
  }, [yjsLab?.language]);

  const compiler = COMPILERS[currentLang] ?? null;
  const { results, running, runTests, summary } = useTestRunner(getFiles, compiler);
  const { result: profilerResult, running: profilerRunning, progress: profilerProgress, runBenchmark } =
    useProfiler(getFiles, compiler, currentLang, profilerMode);

  const hasTests = (resolvedLab?.testCases?.length ?? 0) > 0;
  const hasDescription = !!resolvedLab?.description;

  const allTestsPassed = useMemo(() =>
    hasTests && !running && summary.total > 0 && summary.passed === summary.total,
    [hasTests, running, summary.total, summary.passed],
  );

  // Detect test completion → save progress once
  useEffect(() => {
    if (allTestsPassed && !completedCalledRef.current) {
      completedCalledRef.current = true;
      onLabCompleteRef.current?.();
      setSnackbar('🎉 Все тесты пройдены! Прогресс сохранён.');
    }
  }, [allTestsPassed]);

  useEffect(() => {
    if (fileList.length === 0) return;
    if (!activeFile || !fileList.includes(activeFile)) {
      setActiveFile(fileList[0]);
    }
    setOpenFiles(prev => {
      const valid = prev.filter(p => fileList.includes(p));
      const merged = (valid.includes(activeFile) || !activeFile) ? valid : [...valid, activeFile];
      return merged.length > 0 ? merged : [fileList[0]];
    });
  }, [fileList, activeFile]);

  const checkCompiler = useCallback(async (langId: string) => {
    if (!langId || !COMPILERS[langId]) return;
    const downloaded = await COMPILERS[langId].isDownloaded();
    setStatus(prev => ({ ...prev, isDownloaded: downloaded }));
  }, []);

  useEffect(() => { checkCompiler(currentLang); }, [currentLang, checkCompiler]);

  useEffect(() => {
    const setup = async () => {
      if (!currentLang || !COMPILERS[currentLang]) return;
      const c = COMPILERS[currentLang];
      const downloaded = await c.isDownloaded();
      if (!isOnline && !downloaded) {
        setIsEngineReady(false);
        setOutput(`⚠️ ОФЛАЙН:\nДвижок "${c.name}" не загружен.\nСкачайте движок при наличии сети.`);
        return;
      }
      setIsEngineReady(false);
      try {
        if (isOnline && !downloaded) setOutput(`⏳ Загрузка ${c.name}...`);
        await c.init();
        setIsEngineReady(true);
        setOutput(`✅ ${c.name} готов.`);
      } catch (err: any) {
        setOutput(`❌ Ошибка инициализации:\n${err.message}`);
      }
    };
    if (!status.isDownloading) setup();
  }, [currentLang, status.isDownloaded, status.isDownloading, isOnline]);

  const handleLangChange = (e: any) => {
    const lang = e.target.value;
    setCurrentLang(lang);
    if (!resolvedLab) localStorage.setItem(STORAGE_KEY, lang);
    setIsEngineReady(false);
  };

  const handleDownload = async () => {
    if (!currentLang) return;
    setStatus(prev => ({ ...prev, isDownloading: true, progress: 0 }));
    try {
      await COMPILERS[currentLang].downloadForOffline(
        (p: number) => setStatus(prev => ({ ...prev, progress: p }))
      );
      await checkCompiler(currentLang);
    } catch { alert('Ошибка загрузки'); }
    finally { setStatus(prev => ({ ...prev, isDownloading: false })); }
  };

  const handleReset = () => {
    if (!resolvedLab?.files?.length) return;
    for (const f of resolvedLab.files) {
      if (f.readOnly) continue;
      const ytext = yfiles.get(f.path);
      if (!ytext) continue;
      ytext.delete(0, ytext.length);
      ytext.insert(0, f.content);
    }
    setOutput('Код сброшен к шаблону.');
  };

  const runCode = async () => {
    setIsCodeRunning(true);
    setLastDurationMs(null);
    const t0 = performance.now();

    if (runMode === 'server') {
      setOutput('⏳ Отправка на сервер...');
      try {
        const res = await executeOnServer({ language: currentLang, files: getFiles(), stdin });
        const ms = Math.round(performance.now() - t0);
        setLastDurationMs(ms);
        const header = res.timedOut
          ? `⚠️ Таймаут (${ms} мс)\n`
          : `✅ Сервер: ${res.durationMs.toFixed(1)} мс (RTT+overhead: ${ms} мс)\n`;
        setOutput(header + (res.stdout || '') + (res.stderr ? `\n[stderr]\n${res.stderr}` : ''));
      } catch (err: any) {
        setLastDurationMs(null);
        setOutput(`❌ Ошибка сервера:\n${err.message}`);
      }
    } else {
      if (!isEngineReady) { setOutput('❌ Движок не готов.'); setIsCodeRunning(false); return; }
      setOutput('⏳ Выполнение...');
      try {
        await compiler.run(getFiles(), (out: string) => {
          setOutput(out);
        }, stdin);
        const ms = Math.round(performance.now() - t0);
        setLastDurationMs(ms);
        setOutput(prev => prev + `\n\n⏱ ${ms} мс`);
      } catch (err: any) {
        setOutput(`❌ Ошибка:\n${err.message}`);
      }
    }

    setIsCodeRunning(false);
  };

  const openTab = (path: string) => {
    setActiveFile(path);
    setOpenFiles(prev => prev.includes(path) ? prev : [...prev, path]);
  };

  const closeTab = (path: string) => {
    setOpenFiles(prev => {
      const next = prev.filter(p => p !== path);
      if (path === activeFile && next.length > 0) setActiveFile(next[next.length - 1]);
      return next;
    });
  };

  const handleAddFile = (path: string) => {
    addFile(path, '');
    setOpenFiles(prev => prev.includes(path) ? prev : [...prev, path]);
  };

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setSnackbar('Ссылка скопирована!');
  };

  const roomCode = roomId.slice(0, 8).toUpperCase();
  const labRoles = resolvedLab?.roles
  const showRolePicker = !!labRoles && !myRole

  // Files owned by other roles are also read-only for this user
  const labFiles = resolvedLab?.files?.map(f => f.path) ?? []

  const readOnlyFiles = useMemo(() => {
    const base = resolvedLab?.files?.filter(f => f.readOnly).map(f => f.path) ?? []
    if (!labRoles || !myRole) return base
    const myRole$ = labRoles.find(r => r.id === myRole)
    const otherFiles = labRoles
      .filter(r => r.id !== myRole)
      .flatMap(r => r.ownedFiles)
      .filter(f => !myRole$?.ownedFiles.includes(f))
    return [...new Set([...base, ...otherFiles])]
  }, [resolvedLab?.files, labRoles, myRole])
  const effectiveOpenFiles = openFiles.length > 0 ? openFiles : fileList.slice(0, 1);

  // Next lab button visible in toolbar when description panel is not showing it
  const showToolbarNextBtn = !!nextLab && (!hasDescription || descCollapsed) && (!hasTests || allTestsPassed);

  return (
    <>
    <Box sx={{
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 60px)', bgcolor: 'background.default', overflow: 'hidden',
    }}>

      {/* Панель управления */}
      <Paper elevation={0} sx={{
        px: 2, py: 0.75, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        bgcolor: 'background.paper', borderRadius: 0,
        borderBottom: '1px solid', borderColor: 'divider',
        boxShadow: '0 1px 0 rgba(0,0,0,0.05)',
      }}>
        {/* Левая часть */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {resolvedLab && (
            <>
              <Typography variant="body2" fontWeight={600} color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                {resolvedLab.title}
              </Typography>
              <Divider orientation="vertical" flexItem sx={{ borderColor: 'divider' }} />
            </>
          )}

          <Tooltip title="Скопировать ссылку на сессию">
            <Chip
              label={roomCode}
              size="small"
              icon={<ShareIcon sx={{ fontSize: '13px !important' }} />}
              onClick={handleShare}
              sx={{
                bgcolor: 'rgba(79,70,229,0.07)', color: 'primary.main',
                border: '1px solid rgba(79,70,229,0.2)',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 11, fontWeight: 600, cursor: 'pointer',
                '&:hover': { bgcolor: 'rgba(79,70,229,0.12)' },
              }}
            />
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ borderColor: 'divider' }} />

          <FormControl size="small" sx={{ minWidth: 170 }}>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 13 }}>Среда</InputLabel>
            <Select
              value={currentLang} label="Среда" onChange={handleLangChange}
              disabled={!!resolvedLab}
              sx={{ fontSize: 13, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' } }}
            >
              <MenuItem value=""><em>Выбрать</em></MenuItem>
              {Object.values(COMPILERS).map((c: any) => (
                <MenuItem key={c.id} value={c.id} sx={{ fontSize: 13 }}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {hasDescription && (
            <Tooltip title={descCollapsed ? 'Показать задание' : 'Скрыть задание'}>
              <IconButton
                size="small"
                onClick={() => toggleDescCollapsed(!descCollapsed)}
                sx={{
                  color: !descCollapsed ? 'primary.main' : 'text.secondary',
                  bgcolor: !descCollapsed ? 'rgba(79,70,229,0.08)' : 'transparent',
                }}
              >
                <DescriptionIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {resolvedLab && (
            <Tooltip title="Сбросить файлы к шаблону">
              <IconButton size="small" onClick={handleReset}
                sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}>
                <RestartAltIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {onClearSession && (
            <Tooltip title="Начать сначала — удалить сессию и создать новую">
              <IconButton
                size="small"
                onClick={() => {
                  if (confirm('Начать сначала? Весь прогресс этой сессии будет удалён.')) {
                    onClearSession()
                  }
                }}
                sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
              >
                <DeleteSweepIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title="Профилировщик WASM (бенчмарк)">
            <IconButton
              size="small"
              onClick={() => setShowProfiler(true)}
              disabled={!isEngineReady}
              sx={{
                color: isEngineReady ? '#d97706' : 'text.disabled',
                '&:hover': { color: '#b45309', bgcolor: 'rgba(217,119,6,0.08)' },
              }}
            >
              <SpeedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Правая часть */}
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <ParticipantList participants={participants} currentUserId={user?.id} />
          {participants.length > 0 && <Divider orientation="vertical" flexItem sx={{ borderColor: 'divider' }} />}

          {status.isDownloading && (
            <Chip
              icon={<CircularProgress size={12} color="inherit" />}
              label={`${status.progress}%`}
              color="primary" variant="outlined" size="small"
            />
          )}
          {currentLang && !status.isDownloaded && !status.isDownloading && (
            <Button size="small" variant="contained" color="success"
              startIcon={<CloudDownloadIcon />} onClick={handleDownload} sx={{ py: 0.5 }}>
              Скачать движок
            </Button>
          )}
          {status.isDownloaded && (
            <Chip icon={<CloudDoneIcon sx={{ fontSize: '14px !important' }} />}
              label="Offline" variant="outlined" size="small" color="success" />
          )}

          {/* Next lab button in toolbar (fallback when description panel not visible) */}
          {showToolbarNextBtn && (
            <>
              <Divider orientation="vertical" flexItem sx={{ borderColor: 'divider' }} />
              <Button
                size="small" variant="contained" color="success"
                endIcon={<ArrowForwardIcon />}
                onClick={onNavigateNext}
                sx={{ py: 0.5, fontSize: 12, borderRadius: '8px', fontWeight: 600 }}
              >
                Следующее
              </Button>
            </>
          )}
        </Box>
      </Paper>

      {/* Основная область */}
      <Box sx={{ display: 'flex', flexGrow: 1, minHeight: 0 }}>

        {/* Description panel */}
        {hasDescription && (
          descCollapsed ? (
            /* Collapsed strip */
            <Box sx={{
              width: 28, flexShrink: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              borderRight: '1px solid', borderColor: 'divider',
              bgcolor: 'background.paper', py: 1,
            }}>
              <Tooltip title="Показать задание" placement="right">
                <IconButton size="small" onClick={() => toggleDescCollapsed(false)} sx={{ p: 0.5 }}>
                  <ChevronRightIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Box sx={{
                mt: 2, writingMode: 'vertical-lr', transform: 'rotate(180deg)',
                color: 'text.disabled', fontSize: 10, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.1em', userSelect: 'none',
              }}>
                Задание
              </Box>
            </Box>
          ) : (
            <>
              {/* Expanded description panel */}
              <Box sx={{
                width: descWidth, flexShrink: 0,
                display: 'flex', flexDirection: 'column',
                bgcolor: 'background.paper',
                overflow: 'hidden',
              }}>
                {/* Header */}
                <Box sx={{
                  px: 1.5, py: 0.875,
                  display: 'flex', alignItems: 'center',
                  borderBottom: '1px solid', borderColor: 'divider',
                  flexShrink: 0,
                }}>
                  <DescriptionIcon sx={{ fontSize: 13, color: 'primary.main', mr: 0.75 }} />
                  <Typography variant="caption" fontWeight={700} color="primary.main"
                    sx={{ textTransform: 'uppercase', letterSpacing: '0.07em', flex: 1 }}>
                    Задание{labIndex && totalLabs ? ` ${labIndex}/${totalLabs}` : ''}
                    {myRole && labRoles && ` · ${labRoles.find(r => r.id === myRole)?.label ?? ''}`}
                  </Typography>
                  <Tooltip title="Свернуть">
                    <IconButton size="small" onClick={() => toggleDescCollapsed(true)} sx={{ p: 0.25 }}>
                      <ChevronLeftIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Box>

                {/* Course progress bar */}
                {!!totalLabs && totalLabs > 0 && completedCount !== undefined && (
                  <Tooltip title={`Пройдено: ${completedCount} из ${totalLabs}`} placement="bottom">
                    <LinearProgress
                      variant="determinate"
                      value={(completedCount / totalLabs) * 100}
                      sx={{
                        height: 3, flexShrink: 0,
                        bgcolor: 'action.hover',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: completedCount === totalLabs ? 'success.main' : 'primary.main',
                        },
                      }}
                    />
                  </Tooltip>
                )}

                {/* Description text */}
                <Box sx={{ flexGrow: 1, overflow: 'auto', px: 2, py: 1.5 }}>
                  <Typography variant="body2" color="text.primary" sx={{
                    whiteSpace: 'pre-wrap', lineHeight: 1.85, fontSize: '13px',
                  }}>
                    {(myRole && labRoles?.find(r => r.id === myRole)?.description) || resolvedLab!.description}
                  </Typography>
                </Box>

                {/* Footer: test status + navigation */}
                <Box sx={{
                  flexShrink: 0, px: 2, py: 1.25,
                  borderTop: '1px solid', borderColor: 'divider',
                  bgcolor: allTestsPassed
                    ? 'rgba(5,150,105,0.05)'
                    : 'background.paper',
                }}>
                  {hasTests ? (
                    allTestsPassed ? (
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: nextLab ? 1 : 0 }}>
                          <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
                          <Typography variant="caption" fontWeight={700} color="success.main">
                            Все тесты пройдены!
                          </Typography>
                        </Box>
                        {nextLab ? (
                          <Button
                            variant="contained" size="small" fullWidth color="success"
                            endIcon={<ArrowForwardIcon />}
                            onClick={onNavigateNext}
                            sx={{ borderRadius: '8px', fontWeight: 600, fontSize: 12 }}
                          >
                            Следующее задание
                          </Button>
                        ) : (
                          <Typography variant="caption" color="success.main"
                            sx={{ display: 'block', textAlign: 'center', fontWeight: 600 }}>
                            🎉 Курс завершён!
                          </Typography>
                        )}
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.secondary"
                        sx={{ display: 'block', textAlign: 'center' }}>
                        {summary.total > 0
                          ? `${summary.passed} / ${summary.total} тестов пройдено`
                          : 'Запустите тесты для проверки'}
                      </Typography>
                    )
                  ) : nextLab ? (
                    <Button
                      variant="outlined" size="small" fullWidth
                      endIcon={<ArrowForwardIcon />}
                      onClick={onNavigateNext}
                      sx={{ borderRadius: '8px', fontWeight: 600, fontSize: 12 }}
                    >
                      Следующее задание
                    </Button>
                  ) : (
                    <Typography variant="caption" color="text.secondary"
                      sx={{ display: 'block', textAlign: 'center' }}>
                      Последнее задание курса
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* Drag handle */}
              <Box
                onMouseDown={handleResizeStart}
                sx={{
                  width: 4, flexShrink: 0, cursor: 'col-resize',
                  bgcolor: 'divider',
                  transition: 'background-color 0.15s',
                  '&:hover': { bgcolor: 'primary.main' },
                }}
              />
            </>
          )
        )}

        {/* FileTree */}
        <Box sx={{ width: 200, flexShrink: 0 }}>
          <FileTree
            fileList={fileList} activeFile={activeFile}
            readOnlyFiles={readOnlyFiles}
            labFiles={labFiles}
            onSelect={openTab} onAdd={handleAddFile} onDelete={deleteFile}
          />
        </Box>

        {/* Editor */}
        <Box sx={{ flexGrow: 1, minWidth: 0, borderRight: '1px solid', borderColor: 'divider' }}>
          {!currentLang ? (
            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
              <Typography color="text.disabled" sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                Выберите язык программирования
              </Typography>
            </Box>
          ) : (
            <MultiFileEditor
              yfiles={yfiles} activeFile={activeFile}
              openFiles={effectiveOpenFiles}
              onSwitchTab={openTab} onCloseTab={closeTab}
              awareness={awareness}
              readOnlyFiles={readOnlyFiles}
            />
          )}
        </Box>

        {/* Правая колонка: Terminal + TestPanel */}
        <Box sx={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Box sx={{
            flexGrow: 1, minHeight: 0,
            borderBottom: hasTests ? '1px solid rgba(0,0,0,0.15)' : 'none',
          }}>
            <Terminal
              output={output} stdin={stdin}
              isWasmReady={isEngineReady}
              isRunning={isCodeRunning}
              durationMs={lastDurationMs}
              runMode={runMode}
              onRunModeChange={setRunMode}
              onRunCode={runCode}
              onStdinChange={setStdin}
            />
          </Box>

          {hasTests && (
            <Box sx={{ flexShrink: 0, maxHeight: '45%', display: 'flex', flexDirection: 'column' }}>
              <TestPanel
                testCases={resolvedLab!.testCases} results={results}
                running={running} summary={summary}
                isEngineReady={isEngineReady}
                onRunTests={() => runTests(resolvedLab!.testCases)}
              />
            </Box>
          )}
        </Box>
      </Box>
    </Box>

    <ProfilerPanel
      open={showProfiler} onClose={() => setShowProfiler(false)}
      result={profilerResult} running={profilerRunning}
      progress={profilerProgress} isEngineReady={isEngineReady}
      onRunBenchmark={runBenchmark}
      mode={profilerMode} onModeChange={setProfilerMode}
    />

    <RolePickerDialog
      open={showRolePicker}
      roles={labRoles ?? []}
      participants={participants}
      onSelect={setMyRole}
    />

    <Snackbar
      open={!!snackbar}
      autoHideDuration={3000}
      onClose={() => setSnackbar('')}
      message={snackbar}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    />
    </>
  );
}
