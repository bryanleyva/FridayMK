'use client';

import { useState, useRef, useEffect } from 'react';

interface Props {
    user: string;
}

interface JobStatus {
    job_id: string | null;
    original_filename: string | null;
    status: 'idle' | 'uploaded' | 'running' | 'post_processing' | 'done' | 'error';
    total: number;
    completed: number;
    success: number;
    failed: number;
    current_ruc: string;
    current_razon: string;
    current_step: string;
    vuelta_actual: number;
    cobertura: number;
    log: Array<{ ts: string; level: string; msg: string }>;
    error_message: string | null;
    started_at: string | null;
    finished_at: string | null;
    has_output: boolean;
    post: {
        filtrado_inicial: number;
        filtrado_final: number;
        sheets_agregados: number;
        sheets_saltados: number;
        sheets_error: string | null;
    };
}

const SCRAPER_API = process.env.NEXT_PUBLIC_SCRAPER_API || 'http://localhost:8000';

export default function ScraperR20Client({ user }: Props) {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<JobStatus | null>(null);
    const [uploading, setUploading] = useState(false);
    const [starting, setStarting] = useState(false);
    const [serviceOnline, setServiceOnline] = useState<boolean | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const logEndRef = useRef<HTMLDivElement>(null);

    // Health check inicial y periódico
    useEffect(() => {
        const checkService = async () => {
            try {
                const res = await fetch(`${SCRAPER_API}/health`, {
                    signal: AbortSignal.timeout(3000),
                });
                setServiceOnline(res.ok);
                if (res.ok) {
                    fetchStatus();
                }
            } catch {
                setServiceOnline(false);
            }
        };
        checkService();
        const interval = setInterval(checkService, 10000);
        return () => clearInterval(interval);
    }, []);

    // Polling en running
    useEffect(() => {
        if (status?.status === 'running' || status?.status === 'post_processing') {
            pollingRef.current = setInterval(fetchStatus, 1000);
            return () => {
                if (pollingRef.current) clearInterval(pollingRef.current);
            };
        }
    }, [status?.status]);

    // Auto-scroll log
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [status?.log?.length]);

    const fetchStatus = async () => {
        try {
            const res = await fetch(`${SCRAPER_API}/status`);
            if (res.ok) {
                const data = await res.json();
                setStatus(data);
            }
        } catch {}
    };

    const handleFileSelect = (selectedFile: File) => {
        if (!selectedFile.name.toLowerCase().match(/\.(xlsx|xls)$/)) {
            alert('Solo se aceptan archivos .xlsx o .xls');
            return;
        }
        setFile(selectedFile);
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch(`${SCRAPER_API}/upload`, {
                method: 'POST',
                body: formData,
            });
            if (!res.ok) {
                const err = await res.json();
                alert('Error: ' + (err.detail || 'No se pudo subir'));
                return;
            }
            await fetchStatus();
        } catch (e: any) {
            alert('Error de red: ' + e.message);
        } finally {
            setUploading(false);
        }
    };

    const handleStart = async () => {
        setStarting(true);
        try {
            const res = await fetch(`${SCRAPER_API}/start`, { method: 'POST' });
            if (!res.ok) {
                const err = await res.json();
                alert('Error: ' + (err.detail || 'No se pudo iniciar'));
                return;
            }
            await fetchStatus();
        } finally {
            setStarting(false);
        }
    };

    const handleReset = async () => {
        await fetch(`${SCRAPER_API}/reset`, { method: 'POST' });
        setFile(null);
        setStatus(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    const stepLabels: Record<string, string> = {
        checatuslineas: 'CHECA TUS LÍNEAS',
        sunat: 'SUNAT',
        post_process: 'CARGANDO A SHEETS',
        descansando: 'PAUSA',
    };

    const pct = status && status.total > 0
        ? (status.completed / status.total) * 100
        : 0;

    const isRunning = status?.status === 'running' || status?.status === 'post_processing';
    const isDone = status?.status === 'done' || status?.status === 'error';
    const showUpload = !status || status.status === 'idle' || status.status === 'uploaded';

    const panelStyle: React.CSSProperties = {
        background: 'rgba(24, 24, 30, 0.5)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '16px',
        padding: '1.5rem',
    };

    const logColors: Record<string, string> = {
        info: '#D1D5DB',
        success: '#10B981',
        warn: '#F59E0B',
        error: '#EF4444',
    };

    return (
        <div style={{ minHeight: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Header */}
            <div style={{ ...panelStyle, padding: '1.25rem 1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{
                        width: '6px', height: '44px', background: '#305BD1',
                        borderRadius: '3px', boxShadow: '0 0 20px rgba(48, 91, 209, 0.5)',
                    }} />
                    <div>
                        <h2 style={{
                            color: '#F9FAFB', fontWeight: 900, fontSize: '1.5rem',
                            margin: 0, textTransform: 'uppercase', letterSpacing: '-0.01em',
                        }}>
                            Scraper R20
                        </h2>
                        <p style={{ color: '#9CA3AF', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>
                            Procesamiento masivo · checatuslineas + SUNAT + carga automática a Google Sheets
                        </p>
                    </div>
                </div>

                <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    background: serviceOnline === true ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${serviceOnline === true ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    borderRadius: '999px',
                    fontSize: '0.78rem', fontWeight: 600,
                    color: serviceOnline === true ? '#10B981' : '#EF4444',
                }}>
                    <span style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: serviceOnline === true ? '#10B981' : '#EF4444',
                        boxShadow: `0 0 10px ${serviceOnline === true ? '#10B981' : '#EF4444'}`,
                        animation: isRunning ? 'pulse 1.5s infinite' : 'none',
                    }} />
                    {serviceOnline === null ? 'Verificando...' : serviceOnline ? 'Bot en línea' : 'Bot offline'}
                </div>
            </div>

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
            `}</style>

            {/* Servicio offline */}
            {serviceOnline === false && (
                <div style={{
                    ...panelStyle,
                    background: 'rgba(239, 68, 68, 0.06)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                }}>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                        <div>
                            <h3 style={{ color: '#EF4444', fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                                El bot no responde
                            </h3>
                            <p style={{ color: '#D1D5DB', fontSize: '0.9rem', lineHeight: 1.5 }}>
                                El servicio del scraper Python no está disponible en{' '}
                                <code style={{ background: 'rgba(0,0,0,0.3)', padding: '0.15rem 0.4rem', borderRadius: '4px', fontFamily: 'monospace', color: '#6B8BE8' }}>
                                    {SCRAPER_API}
                                </code>.
                            </p>
                            <p style={{ color: '#9CA3AF', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                                Asegúrate de haber ejecutado{' '}
                                <code style={{ background: 'rgba(0,0,0,0.3)', padding: '0.15rem 0.4rem', borderRadius: '4px', fontFamily: 'monospace' }}>
                                    python web.py
                                </code>{' '}
                                en la PC del servidor.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* PASO 1: SUBIR ARCHIVO */}
            {showUpload && serviceOnline && (
                <div style={panelStyle}>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
                        <div style={{
                            flexShrink: 0, width: '40px', height: '40px',
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, #305BD1, #1E3F99)',
                            color: 'white', display: 'grid', placeItems: 'center',
                            fontWeight: 800, fontSize: '0.95rem',
                            boxShadow: '0 4px 12px rgba(48, 91, 209, 0.3)',
                        }}>01</div>
                        <div>
                            <h3 style={{ color: '#F9FAFB', fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                                Sube tu archivo Excel
                            </h3>
                            <p style={{ color: '#9CA3AF', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                                Columna A: RUC · Columna B: Razón Social · Desde fila 2
                            </p>
                        </div>
                    </div>

                    {!file ? (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#305BD1'; e.currentTarget.style.background = 'rgba(48, 91, 209, 0.05)'; }}
                            onDragLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                            onDrop={(e) => {
                                e.preventDefault();
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                                e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                                if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]);
                            }}
                            style={{
                                border: '2px dashed rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                padding: '3rem 2rem',
                                textAlign: 'center',
                                cursor: 'pointer',
                                background: 'rgba(255,255,255,0.02)',
                                transition: 'all 0.2s',
                            }}
                        >
                            <div style={{ fontSize: '2.5rem', color: '#305BD1', marginBottom: '0.5rem' }}>📁</div>
                            <h4 style={{ color: '#F9FAFB', fontSize: '1rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                                Arrastra tu Excel aquí
                            </h4>
                            <p style={{ color: '#9CA3AF', fontSize: '0.88rem', marginBottom: '0.75rem' }}>
                                o haz clic para seleccionar
                            </p>
                            <span style={{
                                display: 'inline-block', padding: '0.25rem 0.75rem',
                                background: 'rgba(48, 91, 209, 0.1)', borderRadius: '999px',
                                color: '#6B8BE8', fontSize: '0.72rem', fontWeight: 600,
                                fontFamily: 'monospace',
                            }}>.xlsx · .xls</span>
                            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" hidden
                                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                padding: '1rem 1.25rem',
                                background: 'rgba(255,255,255,0.04)',
                                borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.06)',
                            }}>
                                <span style={{ fontSize: '1.5rem' }}>📄</span>
                                <span style={{ flex: 1, color: '#F9FAFB', fontWeight: 600 }}>{file.name}</span>
                                <span style={{ color: '#9CA3AF', fontSize: '0.82rem', fontFamily: 'monospace' }}>
                                    {formatSize(file.size)}
                                </span>
                                <button onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                    style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '0.4rem 0.8rem', borderRadius: '6px' }}>
                                    Cambiar
                                </button>
                            </div>

                            {status?.status !== 'uploaded' ? (
                                <button onClick={handleUpload} disabled={uploading}
                                    style={{ padding: '0.95rem 1.75rem', background: '#305BD1', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '0.95rem', cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.5 : 1, boxShadow: '0 4px 16px rgba(48, 91, 209, 0.3)' }}>
                                    {uploading ? 'Subiendo...' : '⬆ Subir archivo'}
                                </button>
                            ) : (
                                <button onClick={handleStart} disabled={starting}
                                    style={{ padding: '0.95rem 1.75rem', background: '#10B981', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '0.95rem', cursor: starting ? 'not-allowed' : 'pointer', opacity: starting ? 0.5 : 1, boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)' }}>
                                    {starting ? 'Iniciando...' : '▶ Iniciar procesamiento'}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* PASO 2: PROGRESO */}
            {isRunning && status && (
                <div style={panelStyle}>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div style={{
                            flexShrink: 0, width: '40px', height: '40px',
                            borderRadius: '10px',
                            background: status.status === 'post_processing'
                                ? 'linear-gradient(135deg, #8B5CF6, #6D28D9)'
                                : 'linear-gradient(135deg, #F59E0B, #D97706)',
                            color: 'white', display: 'grid', placeItems: 'center',
                            fontWeight: 800, fontSize: '0.95rem',
                        }}>02</div>
                        <div>
                            <h3 style={{ color: '#F9FAFB', fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                                {status.status === 'post_processing' ? 'Cargando a Google Sheets...' : 'Procesando RUCs...'}
                            </h3>
                            <p style={{ color: '#9CA3AF', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                                {status.status === 'post_processing'
                                    ? 'Filtrando datos y subiendo a la hoja BASE CLARO'
                                    : 'El bot está consultando OSIPTEL y SUNAT. Resuelve captchas si aparecen.'}
                            </p>
                        </div>
                    </div>

                    {/* Hero progress */}
                    <div style={{
                        background: '#111827',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '12px', padding: '1.5rem', marginBottom: '1.25rem',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                            <div>
                                <div style={{ color: '#9CA3AF', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                                    RUC actual
                                </div>
                                <div style={{ color: '#305BD1', fontSize: '1.6rem', fontWeight: 800, fontFamily: 'monospace' }}>
                                    {status.current_ruc || '—'}
                                </div>
                                <div style={{ color: '#D1D5DB', fontSize: '0.92rem', marginTop: '0.2rem', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {status.current_razon || 'esperando...'}
                                </div>
                            </div>
                            <div style={{
                                background: 'rgba(48, 91, 209, 0.1)',
                                padding: '0.6rem 1rem', borderRadius: '8px',
                                border: '1px solid rgba(48, 91, 209, 0.2)', minWidth: '140px',
                            }}>
                                <div style={{ color: '#9CA3AF', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Paso</div>
                                <div style={{ color: '#305BD1', fontWeight: 700, fontSize: '0.85rem' }}>
                                    {stepLabels[status.current_step] || '—'}
                                </div>
                            </div>
                        </div>

                        <div style={{ height: '10px', background: 'rgba(255,255,255,0.04)', borderRadius: '999px', overflow: 'hidden', marginBottom: '0.75rem' }}>
                            <div style={{
                                height: '100%',
                                width: `${pct}%`,
                                background: 'linear-gradient(90deg, #305BD1, #6B8BE8)',
                                borderRadius: '999px', transition: 'width 0.5s',
                            }} />
                        </div>

                        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', fontFamily: 'monospace', fontSize: '0.85rem', color: '#9CA3AF' }}>
                            <span><strong style={{ color: '#F9FAFB' }}>{status.completed}</strong> / {status.total}</span>
                            <span style={{ color: '#6B7280' }}>·</span>
                            <span><strong style={{ color: '#F9FAFB' }}>{pct.toFixed(0)}</strong>%</span>
                            <span style={{ color: '#6B7280' }}>·</span>
                            <span>Vuelta <strong style={{ color: '#F9FAFB' }}>{status.vuelta_actual}</strong></span>
                        </div>
                    </div>

                    {/* Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                        {[
                            { label: 'Exitosos', value: status.success, color: '#10B981' },
                            { label: 'Parciales', value: status.failed, color: '#F59E0B' },
                            { label: 'Cobertura', value: `${status.cobertura.toFixed(1)}%`, color: '#305BD1' },
                        ].map((s, i) => (
                            <div key={i} style={{
                                position: 'relative', overflow: 'hidden',
                                background: '#111827',
                                border: '1px solid rgba(255,255,255,0.06)',
                                borderRadius: '12px', padding: '1rem 1.25rem',
                            }}>
                                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: s.color }} />
                                <div style={{ color: '#9CA3AF', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.3rem', fontFamily: 'monospace' }}>
                                    {s.label}
                                </div>
                                <div style={{ fontSize: '2rem', fontWeight: 900, color: s.color, lineHeight: 1, letterSpacing: '-0.03em' }}>
                                    {s.value}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Log */}
                    <div>
                        <h4 style={{ color: '#F9FAFB', fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            Registro en vivo
                            <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', background: 'rgba(48, 91, 209, 0.15)', borderRadius: '999px', color: '#6B8BE8', fontFamily: 'monospace' }}>
                                Auto
                            </span>
                        </h4>
                        <div style={{
                            background: '#111827',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '8px', padding: '0.5rem',
                            maxHeight: '320px', overflowY: 'auto',
                            fontFamily: 'monospace', fontSize: '0.82rem',
                        }}>
                            {(status.log && status.log.length > 0) ? (
                                <>
                                    {status.log.map((entry, i) => (
                                        <div key={i} style={{
                                            display: 'flex', gap: '0.75rem',
                                            padding: '0.4rem 0.75rem',
                                            color: logColors[entry.level] || '#D1D5DB',
                                            lineHeight: 1.4,
                                        }}>
                                            <span style={{ color: '#6B7280', flexShrink: 0 }}>{entry.ts}</span>
                                            <span>{entry.msg}</span>
                                        </div>
                                    ))}
                                    <div ref={logEndRef} />
                                </>
                            ) : (
                                <div style={{ padding: '2rem', textAlign: 'center', color: '#6B7280', fontStyle: 'italic' }}>
                                    El registro aparecerá aquí cuando inicie el proceso...
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* PASO 3: RESULTADO */}
            {isDone && status && (
                <div style={panelStyle}>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div style={{
                            flexShrink: 0, width: '40px', height: '40px',
                            borderRadius: '10px',
                            background: status.status === 'done'
                                ? 'linear-gradient(135deg, #10B981, #059669)'
                                : 'linear-gradient(135deg, #EF4444, #DC2626)',
                            color: 'white', display: 'grid', placeItems: 'center',
                            fontWeight: 800, fontSize: '0.95rem',
                        }}>03</div>
                        <div>
                            <h3 style={{ color: '#F9FAFB', fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                                {status.status === 'done' ? '¡Proceso completado!' : 'Proceso con errores'}
                            </h3>
                            <p style={{ color: '#9CA3AF', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                                {status.status === 'done'
                                    ? 'Los datos ya están en BASE CLARO. También puedes descargar el Excel completo.'
                                    : status.error_message || 'Revisa el registro para detalles'}
                            </p>
                        </div>
                    </div>

                    {/* Resumen general */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                        gap: '1rem', marginBottom: '1.25rem',
                        padding: '1.25rem', background: '#111827',
                        borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)',
                    }}>
                        {[
                            { label: 'Procesados', value: status.completed },
                            { label: 'Cobertura', value: `${status.cobertura.toFixed(1)}%` },
                            { label: 'Inicio', value: status.started_at || '—' },
                            { label: 'Fin', value: status.finished_at || '—' },
                        ].map((it, i) => (
                            <div key={i}>
                                <div style={{ color: '#9CA3AF', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, fontFamily: 'monospace' }}>
                                    {it.label}
                                </div>
                                <div style={{ color: '#F9FAFB', fontSize: '1.4rem', fontWeight: 800, marginTop: '0.25rem', fontFamily: 'monospace' }}>
                                    {it.value}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Resumen del post-procesamiento */}
                    {status.post && status.post.filtrado_inicial > 0 && (
                        <div style={{
                            background: 'linear-gradient(135deg, rgba(48, 91, 209, 0.08), rgba(48, 91, 209, 0.02))',
                            border: '1px solid rgba(48, 91, 209, 0.25)',
                            borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem',
                        }}>
                            <h4 style={{ color: '#6B8BE8', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.85rem', fontFamily: 'monospace' }}>
                                📋 Carga a Google Sheets
                            </h4>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
                                <div>
                                    <div style={{ color: '#9CA3AF', fontSize: '0.72rem', fontFamily: 'monospace', textTransform: 'uppercase' }}>Filtrado</div>
                                    <div style={{ color: '#F9FAFB', fontSize: '1.1rem', fontWeight: 700, marginTop: '0.2rem' }}>
                                        {status.post.filtrado_inicial} → <span style={{ color: '#305BD1' }}>{status.post.filtrado_final}</span>
                                    </div>
                                </div>
                                <div>
                                    <div style={{ color: '#9CA3AF', fontSize: '0.72rem', fontFamily: 'monospace', textTransform: 'uppercase' }}>Agregados al sheet</div>
                                    <div style={{ color: '#10B981', fontSize: '1.4rem', fontWeight: 900, marginTop: '0.1rem' }}>
                                        +{status.post.sheets_agregados}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ color: '#9CA3AF', fontSize: '0.72rem', fontFamily: 'monospace', textTransform: 'uppercase' }}>Saltados (duplicados)</div>
                                    <div style={{ color: '#F59E0B', fontSize: '1.4rem', fontWeight: 900, marginTop: '0.1rem' }}>
                                        {status.post.sheets_saltados}
                                    </div>
                                </div>
                            </div>

                            {status.post.sheets_error && (
                                <div style={{ marginTop: '0.85rem', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#EF4444', fontSize: '0.85rem' }}>
                                    ⚠️ {status.post.sheets_error}
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {status.has_output && (
                            <a href={`${SCRAPER_API}/download`} target="_blank" rel="noopener noreferrer"
                                style={{ padding: '0.95rem 1.75rem', background: '#305BD1', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 4px 16px rgba(48, 91, 209, 0.3)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                                ⬇ Descargar Excel resultado
                            </a>
                        )}
                        <button onClick={handleReset}
                            style={{ padding: '0.95rem 1.75rem', background: 'transparent', color: '#305BD1', border: '1.5px solid #305BD1', borderRadius: '10px', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}>
                            Procesar otro archivo
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}