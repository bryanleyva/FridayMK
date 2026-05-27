'use client';

import { useState, useTransition } from 'react';
import { uploadBaseR10Excel, asignarLeadsR10, getMiBaseR10, marcarGestionadoR10, marcarNoInteresadoR10 } from '@/app/actions/leads-r10';
import SubirVentaModalR10 from '@/components/SubirVentaModalR10';
import { AppSwal } from '@/lib/sweetalert';

type Tab = 'subir' | 'asignar' | 'mi-base';

interface LeadLibre {
    id: string;
    dni: string;
    nombre: string;
    telefono: string;
    correo: string;
    departamento: string;
    provincia: string;
    distrito: string;
    lineasActuales: string;
    operadorActual: string;
    fechaCarga: string;
}

interface LeadAsignado {
    id: string;
    dni: string;
    nombre: string;
    telefono: string;
    correo: string;
    departamento: string;
    provincia: string;
    distrito: string;
    lineasActuales: string;
    operadorActual: string;
    fechaAsignacion: string;
    estado: string;
}

interface Props {
    userRole: string;
    userName: string;
    libreLeads: LeadLibre[];
    teamMembers: { user: string; nombre: string }[];
    initialMiBase: any[];
}

export default function BaseR10Client({ userRole, userName, libreLeads, teamMembers, initialMiBase }: Props) {
    const canManage = userRole === 'ADMIN' || userRole === 'SPECIAL';
    const defaultTab: Tab = canManage ? 'asignar' : 'mi-base';

    const [activeTab, setActiveTab] = useState<Tab>(defaultTab);
    const [isPending, startTransition] = useTransition();

    // --- Subir base ---
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    // --- Asignar ---
    const [libres, setLibres] = useState<LeadLibre[]>(libreLeads);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [ejecutivoSeleccionado, setEjecutivoSeleccionado] = useState('');
    const [asignando, setAsignando] = useState(false);
    const [busquedaLibre, setBusquedaLibre] = useState('');

    // --- Mi base ---
    const [miBase, setMiBase] = useState<LeadAsignado[]>(initialMiBase);
    const [busquedaMiBase, setBusquedaMiBase] = useState('');
    const [ventaModalOpen, setVentaModalOpen] = useState(false);
    const [ventaLead, setVentaLead] = useState<LeadAsignado | null>(null);
    const [miBaseView, setMiBaseView] = useState<'llamada' | 'tabla'>('llamada');
    const [indiceLlamada, setIndiceLlamada] = useState(0);
    const [marcandoNoInteresado, setMarcandoNoInteresado] = useState(false);

    const refreshMiBase = async () => {
        const data = await getMiBaseR10(userName);
        setMiBase(data as LeadAsignado[]);
    };

    // Upload Excel
    const handleUpload = async () => {
        if (!uploadFile) return;
        setUploading(true);
        try {
            const buffer = await uploadFile.arrayBuffer();
            const base64 = Buffer.from(buffer).toString('base64');
            const res = await uploadBaseR10Excel(base64);
            if (res.success) {
                await AppSwal.fire({ icon: 'success', title: 'Base cargada', text: `${res.count} registros subidos correctamente`, timer: 3000, showConfirmButton: false });
                setUploadFile(null);
                // Refresh libre list
                startTransition(async () => {
                    const data = await getMiBaseR10(userName);
                    // No: refresh libreLeads via server action
                });
            } else {
                AppSwal.fire({ icon: 'error', title: 'Error al subir', text: res.error || 'Error desconocido' });
            }
        } catch (err: any) {
            AppSwal.fire({ icon: 'error', title: 'Error', text: err.message });
        } finally {
            setUploading(false);
        }
    };

    // Toggle selección individual
    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    // Seleccionar los primeros 10 libres filtrados
    const seleccionar10 = () => {
        const filtrados = libresFiltered.slice(0, 10);
        setSelectedIds(new Set(filtrados.map(l => l.id)));
    };

    const seleccionarTodos = () => {
        if (selectedIds.size === libresFiltered.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(libresFiltered.map(l => l.id)));
        }
    };

    // Asignar seleccionados
    const handleAsignar = async () => {
        if (selectedIds.size === 0) {
            AppSwal.fire({ icon: 'warning', title: 'Selecciona al menos un lead', timer: 1800, showConfirmButton: false });
            return;
        }
        if (!ejecutivoSeleccionado) {
            AppSwal.fire({ icon: 'warning', title: 'Selecciona un ejecutivo', timer: 1800, showConfirmButton: false });
            return;
        }
        setAsignando(true);
        try {
            const res = await asignarLeadsR10(Array.from(selectedIds), ejecutivoSeleccionado, userName);
            if (res.success) {
                await AppSwal.fire({ icon: 'success', title: `${selectedIds.size} leads asignados`, timer: 2000, showConfirmButton: false });
                setLibres(prev => prev.filter(l => !selectedIds.has(l.id)));
                setSelectedIds(new Set());
            } else {
                AppSwal.fire({ icon: 'error', title: 'Error', text: res.error });
            }
        } catch (err: any) {
            AppSwal.fire({ icon: 'error', title: 'Error', text: err.message });
        } finally {
            setAsignando(false);
        }
    };

    // Registrar venta y marcar como gestionado
    const handleVentaGuardada = async (baseLeadId?: string) => {
        if (baseLeadId) {
            await marcarGestionadoR10(baseLeadId);
            setMiBase(prev => prev.filter(l => l.id !== baseLeadId));
            setIndiceLlamada(idx => Math.max(0, Math.min(idx, miBase.length - 2)));
        } else {
            await refreshMiBase();
        }
    };

    // Modo llamada: marcar como no interesado y pasar al siguiente
    const handleNoInteresado = async () => {
        const lead = miBaseFiltered[indiceLlamada];
        if (!lead) return;
        const ok = await AppSwal.fire({
            icon: 'question',
            title: '¿Marcar como No interesado?',
            text: lead.nombre,
            showCancelButton: true,
            confirmButtonText: 'Sí, no interesado',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#ef4444',
        });
        if (!ok.isConfirmed) return;
        setMarcandoNoInteresado(true);
        try {
            const res = await marcarNoInteresadoR10(lead.id);
            if (res.success) {
                setMiBase(prev => prev.filter(l => l.id !== lead.id));
                setIndiceLlamada(idx => Math.max(0, Math.min(idx, miBase.length - 2)));
            } else {
                AppSwal.fire({ icon: 'error', title: 'Error', text: res.error });
            }
        } finally {
            setMarcandoNoInteresado(false);
        }
    };

    const handleInteresado = () => {
        const lead = miBaseFiltered[indiceLlamada];
        if (!lead) return;
        setVentaLead(lead);
        setVentaModalOpen(true);
    };

    const handleSiguiente = () => {
        if (indiceLlamada < miBaseFiltered.length - 1) setIndiceLlamada(idx => idx + 1);
    };
    const handleAnterior = () => {
        if (indiceLlamada > 0) setIndiceLlamada(idx => idx - 1);
    };

    // Filtros
    const libresFiltered = libres.filter(l =>
        !busquedaLibre || l.dni.includes(busquedaLibre) || l.nombre.toLowerCase().includes(busquedaLibre.toLowerCase()) || l.telefono.includes(busquedaLibre)
    );
    const miBaseFiltered = miBase.filter(l =>
        !busquedaMiBase || l.dni.includes(busquedaMiBase) || l.nombre.toLowerCase().includes(busquedaMiBase.toLowerCase()) || l.telefono.includes(busquedaMiBase)
    );

    // Estilos compartidos
    const cardStyle: React.CSSProperties = {
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        padding: '1rem',
    };
    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '0.6rem 0.9rem',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '8px', color: 'white', fontSize: '0.9rem',
    };
    const btnGreen: React.CSSProperties = {
        padding: '0.6rem 1.2rem', background: '#10b981', border: 'none',
        borderRadius: '8px', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem',
    };
    const btnGray: React.CSSProperties = {
        padding: '0.6rem 1.2rem', background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '8px', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
    };

    const allTabs: { id: Tab; label: string; show: boolean }[] = [
        { id: 'subir', label: 'Subir Base', show: canManage },
        { id: 'asignar', label: `Asignar Leads (${libres.length})`, show: canManage },
        { id: 'mi-base', label: `Mi Base (${miBase.length})`, show: true },
    ];
    const tabs = allTabs.filter(t => t.show);

    return (
        <div style={{ padding: '100px 24px 40px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ color: 'white', fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>Base R10</h1>
                <p style={{ color: '#6b7280', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
                    Gestión de leads asignados para campaña R10
                </p>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0' }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            padding: '0.6rem 1.25rem',
                            background: activeTab === tab.id ? 'rgba(16,185,129,0.12)' : 'transparent',
                            border: 'none',
                            borderBottom: activeTab === tab.id ? '2px solid #10b981' : '2px solid transparent',
                            color: activeTab === tab.id ? '#10b981' : '#9ca3af',
                            cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem',
                            borderRadius: '8px 8px 0 0', transition: 'all 0.2s',
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ===== TAB: SUBIR BASE ===== */}
            {activeTab === 'subir' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px' }}>
                    <div style={cardStyle}>
                        <h3 style={{ color: 'white', margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700 }}>
                            Cargar Excel de leads
                        </h3>
                        <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '1rem' }}>
                            El archivo debe tener columnas: <strong style={{ color: '#d1d5db' }}>DNI, NOMBRES COMPLETOS, TELEFONO, CORREO, DEPARTAMENTO, PROVINCIA, DISTRITO, LINEAS ACTUALES, OPERADOR ACTUAL</strong>
                        </p>

                        <div style={{
                            border: '2px dashed rgba(16,185,129,0.3)', borderRadius: '10px',
                            padding: '2rem', textAlign: 'center', cursor: 'pointer',
                            background: uploadFile ? 'rgba(16,185,129,0.05)' : 'transparent',
                            transition: 'all 0.2s',
                        }}
                            onClick={() => document.getElementById('excel-input')?.click()}
                        >
                            <input
                                id="excel-input"
                                type="file"
                                accept=".xlsx,.xls"
                                style={{ display: 'none' }}
                                onChange={e => setUploadFile(e.target.files?.[0] || null)}
                            />
                            {uploadFile ? (
                                <div>
                                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</div>
                                    <p style={{ color: '#10b981', fontWeight: 700, margin: 0 }}>{uploadFile.name}</p>
                                    <p style={{ color: '#6b7280', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>
                                        {(uploadFile.size / 1024).toFixed(1)} KB — Haz clic para cambiar
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📂</div>
                                    <p style={{ color: '#9ca3af', margin: 0 }}>Haz clic para seleccionar un archivo Excel</p>
                                    <p style={{ color: '#6b7280', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>Formatos: .xlsx, .xls</p>
                                </div>
                            )}
                        </div>

                        {uploadFile && (
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                                <button
                                    onClick={handleUpload}
                                    disabled={uploading}
                                    style={{ ...btnGreen, flex: 1, opacity: uploading ? 0.6 : 1 }}
                                >
                                    {uploading ? 'Subiendo...' : 'Subir base'}
                                </button>
                                <button
                                    onClick={() => setUploadFile(null)}
                                    disabled={uploading}
                                    style={btnGray}
                                >
                                    Cancelar
                                </button>
                            </div>
                        )}
                    </div>

                    <div style={{ ...cardStyle, background: 'rgba(99,102,241,0.04)', borderColor: 'rgba(99,102,241,0.2)' }}>
                        <h4 style={{ color: '#818cf8', margin: '0 0 0.5rem', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Formato del Excel
                        </h4>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                <thead>
                                    <tr>
                                        {['DNI', 'NOMBRES COMPLETOS', 'TELEFONO', 'CORREO', 'DEPARTAMENTO', 'PROVINCIA', 'DISTRITO', 'LINEAS ACTUALES', 'OPERADOR ACTUAL'].map(col => (
                                            <th key={col} style={{ padding: '0.4rem 0.6rem', background: 'rgba(99,102,241,0.15)', color: '#818cf8', textAlign: 'left', whiteSpace: 'nowrap', fontWeight: 700 }}>{col}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        {['71234567', 'JUAN PÉREZ GARCÍA', '987654321', 'juan@email.com', 'LIMA', 'LIMA', 'MIRAFLORES', '2', 'MOVISTAR'].map((val, i) => (
                                            <td key={i} style={{ padding: '0.4rem 0.6rem', color: '#9ca3af', whiteSpace: 'nowrap', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{val}</td>
                                        ))}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== TAB: ASIGNAR LEADS ===== */}
            {activeTab === 'asignar' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Controles */}
                    <div style={{ ...cardStyle, display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <input
                            type="text"
                            placeholder="Buscar por DNI, nombre o teléfono..."
                            value={busquedaLibre}
                            onChange={e => setBusquedaLibre(e.target.value)}
                            style={{ ...inputStyle, flex: '1', minWidth: '200px' }}
                        />
                        <select
                            value={ejecutivoSeleccionado}
                            onChange={e => setEjecutivoSeleccionado(e.target.value)}
                            style={{ ...inputStyle, width: 'auto', minWidth: '220px', colorScheme: 'dark' }}
                        >
                            <option value="">{teamMembers.length === 0 ? '— Sin ejecutivos en tu equipo —' : `— Seleccionar ejecutivo (${teamMembers.length}) —`}</option>
                            {teamMembers
                                .filter(m => (m.nombre || m.user))
                                .map(m => (
                                    // value = nombre completo (no user/login) porque getMiBaseR10
                                    // filtra por session.user.name que es el NOMBRE COMPLETO
                                    <option key={m.nombre || m.user} value={m.nombre || m.user}>{m.nombre || m.user}</option>
                                ))}
                        </select>
                        <button onClick={seleccionar10} style={btnGray}>Seleccionar 10</button>
                        <button onClick={seleccionarTodos} style={btnGray}>
                            {selectedIds.size === libresFiltered.length && libresFiltered.length > 0 ? 'Deseleccionar todo' : 'Seleccionar todo'}
                        </button>
                        <button
                            onClick={handleAsignar}
                            disabled={asignando || selectedIds.size === 0 || !ejecutivoSeleccionado}
                            style={{ ...btnGreen, opacity: (asignando || selectedIds.size === 0 || !ejecutivoSeleccionado) ? 0.5 : 1 }}
                        >
                            {asignando ? 'Asignando...' : `Asignar ${selectedIds.size > 0 ? `(${selectedIds.size})` : ''}`}
                        </button>
                    </div>

                    {/* Tabla */}
                    <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#9ca3af', fontWeight: 700 }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.size === libresFiltered.length && libresFiltered.length > 0}
                                            onChange={seleccionarTodos}
                                            style={{ accentColor: '#10b981' }}
                                        />
                                    </th>
                                    {['DNI', 'Nombre', 'Teléfono', 'Correo', 'Ubicación', 'Líneas', 'Operador', 'Fecha carga'].map(h => (
                                        <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#9ca3af', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {libresFiltered.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: '#4b5563' }}>
                                            {libres.length === 0 ? 'No hay leads libres disponibles' : 'Sin resultados para la búsqueda'}
                                        </td>
                                    </tr>
                                ) : libresFiltered.map(lead => (
                                    <tr
                                        key={lead.id}
                                        onClick={() => toggleSelect(lead.id)}
                                        style={{
                                            borderTop: '1px solid rgba(255,255,255,0.04)',
                                            background: selectedIds.has(lead.id) ? 'rgba(16,185,129,0.07)' : 'transparent',
                                            cursor: 'pointer', transition: 'background 0.15s',
                                        }}
                                    >
                                        <td style={{ padding: '0.65rem 1rem' }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(lead.id)}
                                                onChange={() => toggleSelect(lead.id)}
                                                onClick={e => e.stopPropagation()}
                                                style={{ accentColor: '#10b981' }}
                                            />
                                        </td>
                                        <td style={{ padding: '0.65rem 1rem', color: '#d1d5db', fontFamily: 'monospace' }}>{lead.dni}</td>
                                        <td style={{ padding: '0.65rem 1rem', color: 'white', fontWeight: 600 }}>{lead.nombre}</td>
                                        <td style={{ padding: '0.65rem 1rem', color: '#10b981', fontFamily: 'monospace' }}>{lead.telefono}</td>
                                        <td style={{ padding: '0.65rem 1rem', color: '#9ca3af', fontSize: '0.8rem' }}>{lead.correo}</td>
                                        <td style={{ padding: '0.65rem 1rem', color: '#9ca3af' }}>{[lead.departamento, lead.provincia, lead.distrito].filter(Boolean).join(', ')}</td>
                                        <td style={{ padding: '0.65rem 1rem', color: '#d1d5db', textAlign: 'center' }}>{lead.lineasActuales}</td>
                                        <td style={{ padding: '0.65rem 1rem', color: '#d1d5db' }}>{lead.operadorActual}</td>
                                        <td style={{ padding: '0.65rem 1rem', color: '#6b7280', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{lead.fechaCarga}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p style={{ color: '#4b5563', fontSize: '0.8rem', margin: 0 }}>
                        {libresFiltered.length} leads libres{busquedaLibre ? ` (filtrado de ${libres.length})` : ''}
                    </p>
                </div>
            )}

            {/* ===== TAB: MI BASE ===== */}
            {activeTab === 'mi-base' && (() => {
                const currentLead = miBaseFiltered[indiceLlamada];
                return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Switch vista llamada / tabla + búsqueda */}
                    <div style={{ ...cardStyle, display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '3px' }}>
                            <button
                                onClick={() => { setMiBaseView('llamada'); setIndiceLlamada(0); }}
                                style={{
                                    padding: '0.45rem 0.95rem', border: 'none', borderRadius: '6px',
                                    background: miBaseView === 'llamada' ? '#10b981' : 'transparent',
                                    color: miBaseView === 'llamada' ? 'white' : '#9ca3af',
                                    cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem',
                                }}
                            >
                                📞 Modo Llamada
                            </button>
                            <button
                                onClick={() => setMiBaseView('tabla')}
                                style={{
                                    padding: '0.45rem 0.95rem', border: 'none', borderRadius: '6px',
                                    background: miBaseView === 'tabla' ? '#10b981' : 'transparent',
                                    color: miBaseView === 'tabla' ? 'white' : '#9ca3af',
                                    cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem',
                                }}
                            >
                                📋 Tabla
                            </button>
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar por DNI, nombre o teléfono..."
                            value={busquedaMiBase}
                            onChange={e => { setBusquedaMiBase(e.target.value); setIndiceLlamada(0); }}
                            style={{ ...inputStyle, flex: '1', minWidth: '200px' }}
                        />
                        <span style={{ color: '#6b7280', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                            {miBaseFiltered.length} leads asignados
                        </span>
                    </div>

                    {/* ===== Vista: Modo Llamada ===== */}
                    {miBaseView === 'llamada' && (
                        <>
                            {miBaseFiltered.length === 0 ? (
                                <div style={{ ...cardStyle, padding: '4rem 2rem', textAlign: 'center', color: '#4b5563' }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
                                    {miBase.length === 0
                                        ? 'No tienes leads asignados. Espera a que tu supervisor te asigne algunos.'
                                        : 'Sin resultados para la búsqueda'}
                                </div>
                            ) : currentLead ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {/* Navegación */}
                                    <div style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 1rem' }}>
                                        <button onClick={handleAnterior} disabled={indiceLlamada === 0}
                                            style={{ ...btnGray, opacity: indiceLlamada === 0 ? 0.4 : 1, padding: '0.5rem 1rem' }}>
                                            ← Anterior
                                        </button>
                                        <div style={{ color: '#9ca3af', fontSize: '0.9rem', fontWeight: 600 }}>
                                            <span style={{ color: '#10b981', fontWeight: 800 }}>{indiceLlamada + 1}</span>
                                            <span style={{ margin: '0 0.4rem', color: '#4b5563' }}>de</span>
                                            <span>{miBaseFiltered.length}</span>
                                        </div>
                                        <button onClick={handleSiguiente} disabled={indiceLlamada >= miBaseFiltered.length - 1}
                                            style={{ ...btnGray, opacity: indiceLlamada >= miBaseFiltered.length - 1 ? 0.4 : 1, padding: '0.5rem 1rem' }}>
                                            Siguiente →
                                        </button>
                                    </div>

                                    {/* Tarjeta del lead */}
                                    <div style={{
                                        background: 'linear-gradient(145deg, rgba(16,185,129,0.07), rgba(255,255,255,0.02))',
                                        border: '1px solid rgba(16,185,129,0.25)',
                                        borderRadius: '16px', padding: '1.75rem',
                                    }}>
                                        {/* Nombre y DNI */}
                                        <div style={{ marginBottom: '1.5rem' }}>
                                            <p style={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
                                                Lead #{currentLead.id} · DNI {currentLead.dni}
                                            </p>
                                            <h2 style={{ color: 'white', fontSize: '1.75rem', fontWeight: 800, margin: '0.35rem 0 0' }}>
                                                {currentLead.nombre}
                                            </h2>
                                        </div>

                                        {/* Información destacada (teléfono CTA) */}
                                        <a
                                            href={`tel:${currentLead.telefono}`}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                                background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)',
                                                borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.25rem',
                                                textDecoration: 'none', cursor: 'pointer',
                                            }}
                                        >
                                            <span style={{ fontSize: '1.75rem' }}>📞</span>
                                            <div>
                                                <p style={{ color: '#6ee7b7', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>Teléfono — Haz click para llamar</p>
                                                <p style={{ color: 'white', fontSize: '1.5rem', fontWeight: 800, fontFamily: 'monospace', margin: '0.15rem 0 0' }}>
                                                    {currentLead.telefono || 'Sin teléfono'}
                                                </p>
                                            </div>
                                        </a>

                                        {/* Grid de datos */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem', marginBottom: '1.5rem' }}>
                                            <DataField label="Correo" value={currentLead.correo} />
                                            <DataField label="Ubicación" value={[currentLead.departamento, currentLead.provincia, currentLead.distrito].filter(Boolean).join(' / ')} />
                                            <DataField label="Líneas actuales" value={currentLead.lineasActuales} />
                                            <DataField label="Operador actual" value={currentLead.operadorActual} highlight />
                                            <DataField label="Fecha asignación" value={currentLead.fechaAsignacion} />
                                            <DataField label="Estado" value={currentLead.estado} />
                                        </div>

                                        {/* Botones de acción */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                            <button
                                                onClick={handleNoInteresado}
                                                disabled={marcandoNoInteresado}
                                                style={{
                                                    padding: '1rem', background: 'rgba(239,68,68,0.15)',
                                                    border: '1px solid rgba(239,68,68,0.4)', borderRadius: '10px',
                                                    color: '#fca5a5', cursor: 'pointer', fontWeight: 700, fontSize: '1rem',
                                                    opacity: marcandoNoInteresado ? 0.6 : 1,
                                                }}
                                            >
                                                ✕ No Interesado
                                            </button>
                                            <button
                                                onClick={handleInteresado}
                                                style={{
                                                    padding: '1rem', background: '#10b981', border: 'none', borderRadius: '10px',
                                                    color: 'white', cursor: 'pointer', fontWeight: 800, fontSize: '1rem',
                                                    boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
                                                }}
                                            >
                                                ✓ Interesado — Registrar Venta
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </>
                    )}

                    {/* ===== Vista: Tabla ===== */}
                    {miBaseView === 'tabla' && (
                        <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                                        {['DNI', 'Nombre', 'Teléfono', 'Correo', 'Ubicación', 'Líneas', 'Operador', 'Asignado', 'Acción'].map(h => (
                                            <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#9ca3af', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {miBaseFiltered.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: '#4b5563' }}>
                                                {miBase.length === 0
                                                    ? 'No tienes leads asignados. Espera a que tu supervisor te asigne algunos.'
                                                    : 'Sin resultados para la búsqueda'}
                                            </td>
                                        </tr>
                                    ) : miBaseFiltered.map(lead => (
                                        <tr key={lead.id} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                                            <td style={{ padding: '0.65rem 1rem', color: '#d1d5db', fontFamily: 'monospace' }}>{lead.dni}</td>
                                            <td style={{ padding: '0.65rem 1rem', color: 'white', fontWeight: 600 }}>{lead.nombre}</td>
                                            <td style={{ padding: '0.65rem 1rem', color: '#10b981', fontFamily: 'monospace' }}>{lead.telefono}</td>
                                            <td style={{ padding: '0.65rem 1rem', color: '#9ca3af', fontSize: '0.8rem' }}>{lead.correo}</td>
                                            <td style={{ padding: '0.65rem 1rem', color: '#9ca3af' }}>{[lead.departamento, lead.provincia, lead.distrito].filter(Boolean).join(', ')}</td>
                                            <td style={{ padding: '0.65rem 1rem', color: '#d1d5db', textAlign: 'center' }}>{lead.lineasActuales}</td>
                                            <td style={{ padding: '0.65rem 1rem', color: '#d1d5db' }}>{lead.operadorActual}</td>
                                            <td style={{ padding: '0.65rem 1rem', color: '#6b7280', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{lead.fechaAsignacion}</td>
                                            <td style={{ padding: '0.65rem 1rem' }}>
                                                <button
                                                    onClick={() => { setVentaLead(lead); setVentaModalOpen(true); }}
                                                    style={{ ...btnGreen, padding: '0.4rem 0.9rem', fontSize: '0.8rem' }}
                                                >
                                                    Registrar Venta
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                );
            })()}

            {/* Modal de venta */}
            <SubirVentaModalR10
                isOpen={ventaModalOpen}
                onClose={() => { setVentaModalOpen(false); setVentaLead(null); }}
                onSaved={handleVentaGuardada}
                ejecutivo={userName}
                prefillData={ventaLead ? {
                    rucDni: ventaLead.dni,
                    nombre: ventaLead.nombre,
                    correo: ventaLead.correo,
                    baseLeadId: ventaLead.id,
                } : undefined}
            />
        </div>
    );
}

function DataField({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
    const displayValue = value === null || value === undefined || value === '' ? '—' : String(value);
    return (
        <div style={{
            background: 'rgba(0,0,0,0.25)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '8px',
            padding: '0.65rem 0.85rem',
        }}>
            <p style={{ color: '#6b7280', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
                {label}
            </p>
            <p style={{
                color: highlight ? '#fbbf24' : 'white',
                fontSize: '0.95rem',
                fontWeight: highlight ? 700 : 500,
                margin: '0.2rem 0 0',
                wordBreak: 'break-word',
            }}>
                {displayValue}
            </p>
        </div>
    );
}
