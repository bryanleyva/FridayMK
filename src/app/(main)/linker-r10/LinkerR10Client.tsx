'use client';

import { useState, useTransition, useMemo } from 'react';
import { getIngresadosR10 } from '@/app/actions/leads-r10';

interface Props {
    user: string;
    userRole: string;
    rechazos: any[];
}

const TABS = ['RECHAZOS'] as const;
type TabKey = typeof TABS[number];

export default function LinkerR10Client({ user, userRole, rechazos: initRechazos }: Props) {
    const [rechazos, setRechazos] = useState(initRechazos);
    const [tab, setTab] = useState<TabKey>('RECHAZOS');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [search, setSearch] = useState('');
    const [filterExec, setFilterExec] = useState('TODOS');
    const [filterMotivo, setFilterMotivo] = useState('TODOS');
    const [isPending, startTransition] = useTransition();
    const [selected, setSelected] = useState<any | null>(null);

    const reload = () => {
        startTransition(async () => {
            const scope = userRole === 'ADMIN' ? 'all' : 'team';
            const fresh = await getIngresadosR10(user, userRole, {
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                search: search || undefined,
                estado: 'RECHAZADO',
                scope,
            });
            setRechazos(fresh);
        });
    };

    const clearFilters = () => {
        setStartDate(''); setEndDate(''); setSearch(''); setFilterExec('TODOS'); setFilterMotivo('TODOS');
        startTransition(async () => {
            const scope = userRole === 'ADMIN' ? 'all' : 'team';
            const fresh = await getIngresadosR10(user, userRole, { estado: 'RECHAZADO', scope });
            setRechazos(fresh);
        });
    };

    const ejecutivos = useMemo(() => {
        const set = new Set<string>();
        rechazos.forEach(v => { if (v.ejecutivo) set.add(v.ejecutivo); });
        return Array.from(set).sort();
    }, [rechazos]);

    const motivos = useMemo(() => {
        const set = new Set<string>();
        rechazos.forEach(v => { if (v.motivoRechazo) set.add(v.motivoRechazo); });
        return Array.from(set).sort();
    }, [rechazos]);

    const filtered = rechazos.filter(v => {
        if (filterExec !== 'TODOS' && v.ejecutivo !== filterExec) return false;
        if (filterMotivo !== 'TODOS' && v.motivoRechazo !== filterMotivo) return false;
        return true;
    });

    const motivosTop = useMemo(() => {
        const map: Record<string, number> = {};
        filtered.forEach(v => {
            const m = (v.motivoRechazo || 'SIN MOTIVO').toString().trim() || 'SIN MOTIVO';
            map[m] = (map[m] || 0) + 1;
        });
        return Object.entries(map)
            .map(([motivo, count]) => ({ motivo, count }))
            .sort((a, b) => b.count - a.count);
    }, [filtered]);

    const totalLineas = filtered.reduce((s, v) => s + (v.cantidadLineas || 0), 0);

    const panelStyle: React.CSSProperties = {
        background: 'rgba(24,24,27,0.4)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: '12px',
        padding: '1rem',
    };

    return (
        <div style={{ minHeight: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Header */}
            <div style={{ ...panelStyle, display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ width: '6px', height: '40px', background: '#10b981', borderRadius: '3px', boxShadow: '0 0 20px #10b981' }} />
                    <div>
                        <h2 style={{ color: 'white', fontWeight: 900, fontSize: '1.5rem', margin: 0, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
                            Linker R10
                        </h2>
                        <p style={{ color: '#6b7280', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>
                            Auditoría de cuentas rechazadas · {userRole === 'ADMIN' ? 'Vista global' : 'Vista de equipo'}
                        </p>
                    </div>
                </div>
                <span style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '0.4rem 0.9rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.08em' }}>
                    {filtered.length} RECHAZO{filtered.length !== 1 ? 'S' : ''}
                </span>
            </div>

            {/* Tabs */}
            <div style={{ ...panelStyle, display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {TABS.map(t => {
                    const isActive = tab === t;
                    return (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            style={{
                                padding: '0.5rem 1rem',
                                background: isActive ? 'rgba(239,68,68,0.18)' : 'rgba(255,255,255,0.03)',
                                border: `1px solid ${isActive ? '#ef4444' : 'rgba(255,255,255,0.08)'}`,
                                borderRadius: '8px',
                                color: isActive ? '#ef4444' : '#9ca3af',
                                cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                                display: 'flex', gap: '0.5rem', alignItems: 'center',
                            }}
                        >
                            <span>{t}</span>
                            <span style={{ background: 'rgba(0,0,0,0.3)', padding: '0.1rem 0.5rem', borderRadius: '999px', fontSize: '0.75rem' }}>
                                {rechazos.length}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* KPIs rápidos */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
                <KpiCard label="Total rechazos" value={filtered.length} color="#ef4444" highlight />
                <KpiCard label="Líneas perdidas" value={totalLineas} color="#f97316" />
                <KpiCard label="Ejecutivos afectados" value={new Set(filtered.map(v => v.ejecutivo)).size} color="#fbbf24" />
                <KpiCard label="Motivos distintos" value={motivosTop.length} color="#8b5cf6" />
            </div>

            {/* Filtros */}
            <div style={{ ...panelStyle, display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                <select
                    value={filterExec}
                    onChange={e => setFilterExec(e.target.value)}
                    style={selectStyle}
                >
                    <option value="TODOS" style={optStyle}>Todos los ejecutivos</option>
                    {ejecutivos.map(e => <option key={e} value={e} style={optStyle}>{e}</option>)}
                </select>
                <select
                    value={filterMotivo}
                    onChange={e => setFilterMotivo(e.target.value)}
                    style={selectStyle}
                >
                    <option value="TODOS" style={optStyle}>Todos los motivos</option>
                    {motivos.map(m => <option key={m} value={m} style={optStyle}>{m}</option>)}
                </select>
                <input
                    type="text"
                    placeholder="Buscar cliente / RUC..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && reload()}
                    style={{ flex: 1, minWidth: '180px', padding: '0.5rem 0.85rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.9rem' }}
                />
                <label style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Desde:</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={dateStyle} />
                <label style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Hasta:</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={dateStyle} />
                <button onClick={reload} disabled={isPending} style={{ padding: '0.5rem 1rem', background: '#ef4444', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700 }}>
                    {isPending ? 'Cargando...' : 'Aplicar'}
                </button>
                <button onClick={clearFilters} disabled={isPending} style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#9ca3af', cursor: 'pointer', fontSize: '0.85rem' }}>Limpiar</button>
            </div>

            {/* Ranking de motivos */}
            <div style={panelStyle}>
                <h3 style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                    Ranking de motivos de rechazo
                </h3>
                {motivosTop.length === 0 ? (
                    <p style={{ color: '#6b7280', textAlign: 'center', padding: '1.5rem 0', fontSize: '0.85rem' }}>Sin rechazos con estos filtros</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {motivosTop.map((m, idx) => {
                            const pct = filtered.length ? (m.count / filtered.length) * 100 : 0;
                            return (
                                <div key={m.motivo} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <span style={{
                                        background: idx === 0 ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)',
                                        color: idx === 0 ? '#ef4444' : '#9ca3af',
                                        padding: '0.2rem 0.6rem', borderRadius: '999px', fontWeight: 800, fontSize: '0.75rem', minWidth: '30px', textAlign: 'center',
                                    }}>{idx + 1}</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                            <span style={{ color: 'white', fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.motivo}</span>
                                            <span style={{ color: '#ef4444', fontWeight: 800, fontSize: '0.85rem', marginLeft: '0.5rem' }}>{m.count} <span style={{ color: '#6b7280', fontWeight: 500, fontSize: '0.75rem' }}>({pct.toFixed(1)}%)</span></span>
                                        </div>
                                        <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,#ef4444,#f97316)', transition: 'width .3s' }} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Tabla de rechazos */}
            <div style={{ ...panelStyle, flex: 1, overflow: 'auto' }}>
                <h3 style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                    Cuentas rechazadas ({filtered.length})
                </h3>
                {filtered.length === 0 ? (
                    <p style={{ color: '#6b7280', textAlign: 'center', padding: '3rem 0', fontSize: '0.9rem' }}>
                        Sin cuentas rechazadas con estos filtros.
                    </p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                    {['ID', 'Fecha cierre', 'Cliente', 'RUC/DNI', 'Ejecutivo', 'Motivo rechazo', 'Obs. Mesa Control', 'Líneas'].map(h => (
                                        <th key={h} style={{ padding: '0.75rem 0.5rem', textAlign: 'left', color: '#9ca3af', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(v => (
                                    <tr key={v.ventaId} onClick={() => setSelected(v)} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.05)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <td style={{ padding: '0.75rem 0.5rem', color: '#ef4444', fontWeight: 700, fontFamily: 'monospace' }}>#{v.ventaId}</td>
                                        <td style={{ padding: '0.75rem 0.5rem', color: '#d1d5db', whiteSpace: 'nowrap' }}>{(v.fechaCierre || '').split(',')[0]}</td>
                                        <td style={{ padding: '0.75rem 0.5rem', color: 'white', fontWeight: 500 }}>{v.nombresApellidos}</td>
                                        <td style={{ padding: '0.75rem 0.5rem', color: '#9ca3af', fontFamily: 'monospace' }}>{v.rucDni}</td>
                                        <td style={{ padding: '0.75rem 0.5rem', color: '#d1d5db', fontSize: '0.8rem' }}>{v.ejecutivo}</td>
                                        <td style={{ padding: '0.75rem 0.5rem' }}>
                                            <span style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
                                                {v.motivoRechazo || '—'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '0.75rem 0.5rem', color: '#9ca3af', fontSize: '0.78rem', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {v.observacionBo || '—'}
                                        </td>
                                        <td style={{ padding: '0.75rem 0.5rem', color: '#fbbf24', fontWeight: 700 }}>{v.cantidadLineas}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {selected && <DetailModal venta={selected} onClose={() => setSelected(null)} />}
        </div>
    );
}

const selectStyle: React.CSSProperties = {
    padding: '0.5rem 0.85rem',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: 'white',
    fontSize: '0.85rem',
    colorScheme: 'dark',
    minWidth: '180px',
};

const optStyle: React.CSSProperties = { background: '#0a0a0b', color: 'white' };

const dateStyle: React.CSSProperties = {
    padding: '0.5rem',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: 'white',
    fontSize: '0.85rem',
    colorScheme: 'dark',
};

function KpiCard({ label, value, color, highlight }: { label: string; value: number; color: string; highlight?: boolean }) {
    return (
        <div style={{
            background: highlight ? `linear-gradient(145deg, ${color}15, ${color}05)` : 'rgba(24,24,27,0.4)',
            backdropFilter: 'blur(20px)',
            border: `1px solid ${highlight ? color + '40' : 'rgba(255,255,255,0.05)'}`,
            borderRadius: '12px', padding: '1rem 1.25rem',
            position: 'relative', overflow: 'hidden',
        }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: color }} />
            <div style={{ color: '#9ca3af', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
                {label}
            </div>
            <div style={{ color, fontSize: '2rem', fontWeight: 900, lineHeight: 1 }}>{value}</div>
        </div>
    );
}

function DetailModal({ venta, onClose }: { venta: any; onClose: () => void }) {
    const infoRow = (label: string, value: any, highlight = false) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ color: '#9ca3af', fontSize: '0.8rem', textTransform: 'uppercase' }}>{label}</span>
            <span style={{ color: highlight ? '#fca5a5' : 'white', fontSize: '0.9rem', fontWeight: highlight ? 700 : 500, textAlign: 'right', maxWidth: '60%' }}>{value || '—'}</span>
        </div>
    );

    return (
        <div onClick={onClose} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(6px)',
        }}>
            <div onClick={e => e.stopPropagation()} style={{
                background: '#0a0a0b', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '20px',
                width: '100%', maxWidth: '640px', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            }}>
                <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                        <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 700 }}>RECHAZADO · #{venta.ventaId}</span>
                        <h2 style={{ color: 'white', fontSize: '1.25rem', fontWeight: 800, margin: '0.25rem 0 0' }}>{venta.nombresApellidos}</h2>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', width: '36px', height: '36px', borderRadius: '8px', cursor: 'pointer' }}>✕</button>
                </div>
                <div style={{ padding: '1.5rem 2rem', overflowY: 'auto', flex: 1 }}>
                    {infoRow('Motivo rechazo', venta.motivoRechazo, true)}
                    {infoRow('Obs. Mesa Control', venta.observacionBo, true)}
                    {infoRow('Mesa Control', venta.mesaControlAsignado)}
                    {infoRow('RUC/DNI', venta.rucDni)}
                    {infoRow('Tipo ingreso', venta.tipoIngreso)}
                    {infoRow('Canal', venta.canalVenta)}
                    {infoRow('Correo', venta.correo)}
                    {infoRow('Ejecutivo', venta.ejecutivo)}
                    {infoRow('Supervisor', venta.supervisor)}
                    {infoRow('Fecha ingreso', venta.fechaIngreso)}
                    {infoRow('Fecha cierre', venta.fechaCierre)}
                    {infoRow('Cantidad de líneas', venta.cantidadLineas)}
                </div>
            </div>
        </div>
    );
}
