'use client';

import React, { useState } from 'react';
import { createUser, updateUser, darDeBajaUsuario, reactivarUsuario } from '@/app/actions/leads';
import { AppSwal } from '@/lib/sweetalert';

interface UserEntry {
    dni: string;
    nombre: string;
    user: string;
    rol: string;
    cargo: string;
    supervisor: string;
    telefono: string;
    campana: string;
    estado?: string;
}

interface Supervisor {
    user: string;
    nombre: string;
}

interface Props {
    users: UserEntry[];
    supervisors: Supervisor[];
}

function generateUsername(nombre: string): string {
    const parts = nombre.trim().toUpperCase().split(/\s+/);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0].substring(0, 8);
    const initial = parts[0][0] || '';
    const apellido = parts[parts.length > 2 ? parts.length - 2 : 1] || '';
    return (initial + apellido).substring(0, 10).replace(/[^A-Z0-9]/g, '');
}

function generatePassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pass = '';
    for (let i = 0; i < 8; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
    return pass;
}

const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color: 'white',
    padding: '10px 14px',
    fontSize: '13px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box'
};

const labelStyle: React.CSSProperties = {
    fontSize: '9px',
    fontWeight: 900,
    color: '#8b5cf6',
    textTransform: 'uppercase',
    letterSpacing: '0.2em'
};

export default function AccesosManager({ users: initialUsers, supervisors }: Props) {
    const [users, setUsers] = useState(initialUsers);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserEntry | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const [form, setForm] = useState({
        dni: '', nombre: '', user: '', clave: generatePassword(),
        supervisor: '', campana: 'R10', telefono: ''
    });

    const [editForm, setEditForm] = useState({
        nombre: '', clave: '', supervisor: '', campana: 'R10', telefono: '', rol: 'STANDAR'
    });

    const copyToClipboard = (text: string, fieldId: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(fieldId);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleNombreChange = (nombre: string) => {
        setForm(prev => ({ ...prev, nombre, user: generateUsername(nombre) }));
    };

    const openEdit = (u: UserEntry) => {
        setEditingUser(u);
        setEditForm({
            nombre: u.nombre,
            clave: '',
            supervisor: u.supervisor || '',
            campana: u.campana || 'R10',
            telefono: u.telefono || '',
            rol: u.rol || 'STANDAR'
        });
    };

    const handleCreate = async () => {
        if (!form.dni || !form.nombre || !form.user || !form.clave) {
            AppSwal.fire({ title: 'Campos requeridos', text: 'Completa DNI, nombre, usuario y contraseña.', icon: 'warning', confirmButtonColor: '#8b5cf6' });
            return;
        }
        if (!form.campana) {
            AppSwal.fire({ title: 'Campos requeridos', text: 'Selecciona la campaña.', icon: 'warning', confirmButtonColor: '#8b5cf6' });
            return;
        }
        setIsLoading(true);
        try {
            const res = await createUser(form);
            if (res.success) {
                await AppSwal.fire({ title: 'Usuario creado', text: `Usuario ${form.user} creado exitosamente.`, icon: 'success', confirmButtonColor: '#10b981' });
                setUsers(prev => [...prev, {
                    dni: form.dni, nombre: form.nombre, user: form.user,
                    rol: 'STANDAR', cargo: '', supervisor: form.supervisor,
                    telefono: form.telefono, campana: form.campana
                }]);
                setForm({ dni: '', nombre: '', user: '', clave: generatePassword(), supervisor: '', campana: 'R10', telefono: '' });
                setIsCreateOpen(false);
            } else {
                AppSwal.fire({ title: 'Error', text: res.error || 'No se pudo crear el usuario', icon: 'error', confirmButtonColor: '#ef4444' });
            }
        } catch {
            AppSwal.fire({ title: 'Error', text: 'Error inesperado al crear usuario', icon: 'error', confirmButtonColor: '#ef4444' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = async () => {
        if (!editingUser) return;
        if (!editForm.nombre.trim()) {
            AppSwal.fire({ title: 'Campos requeridos', text: 'El nombre no puede estar vacío.', icon: 'warning', confirmButtonColor: '#8b5cf6' });
            return;
        }
        setIsLoading(true);
        try {
            const res = await updateUser(editingUser.dni, {
                nombre: editForm.nombre.trim(),
                clave: editForm.clave || undefined,
                supervisor: editForm.supervisor,
                campana: editForm.campana,
                telefono: editForm.telefono,
                rol: editForm.rol
            });
            if (res.success) {
                await AppSwal.fire({ title: 'Usuario actualizado', icon: 'success', timer: 1500, showConfirmButton: false });
                setUsers(prev => prev.map(u => u.dni === editingUser.dni
                    ? { ...u, nombre: editForm.nombre, supervisor: editForm.supervisor, campana: editForm.campana, telefono: editForm.telefono, rol: editForm.rol }
                    : u
                ));
                setEditingUser(null);
            } else {
                AppSwal.fire({ title: 'Error', text: res.error || 'No se pudo actualizar', icon: 'error', confirmButtonColor: '#ef4444' });
            }
        } catch {
            AppSwal.fire({ title: 'Error', text: 'Error inesperado', icon: 'error', confirmButtonColor: '#ef4444' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDarDeBaja = async (u: UserEntry) => {
        const confirm = await AppSwal.fire({
            title: '¿Dar de baja a este usuario?',
            html: `<div style="text-align:left;font-size:13px;line-height:1.6">
                <strong style="color:#ef4444">${u.nombre}</strong><br/>
                <span style="color:#9ca3af">Usuario: ${u.user} · DNI: ${u.dni}</span>
                <hr style="margin:10px 0;border-color:rgba(255,255,255,0.1)"/>
                Esto va a:
                <ul style="margin:6px 0;padding-left:20px;color:#d1d5db">
                    <li>Marcar al usuario como <strong>INACTIVO</strong></li>
                    <li>Cambiar su contraseña a una <strong>nueva aleatoria</strong></li>
                    <li>Cerrar su sesión activa</li>
                </ul>
                La contraseña actual ya no funcionará.
            </div>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, dar de baja',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#ef4444',
        });
        if (!confirm.isConfirmed) return;

        setIsLoading(true);
        try {
            const res = await darDeBajaUsuario(u.dni);
            if (res.success) {
                await AppSwal.fire({
                    title: 'Usuario dado de baja',
                    html: `<div style="text-align:center">
                        <p style="color:#9ca3af;margin-bottom:8px">Nueva contraseña generada:</p>
                        <code style="display:inline-block;padding:8px 14px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:8px;color:#ef4444;font-size:16px;font-family:monospace;font-weight:900;letter-spacing:1px">${res.nuevaClave}</code>
                        <p style="color:#6b7280;margin-top:10px;font-size:11px">Guárdala — al reactivar al usuario se le asignará otra</p>
                    </div>`,
                    icon: 'success',
                    confirmButtonColor: '#10b981',
                });
                setUsers(prev => prev.map(usr => usr.dni === u.dni ? { ...usr, estado: 'INACTIVO' } : usr));
            } else {
                AppSwal.fire({ title: 'Error', text: res.error || 'No se pudo dar de baja', icon: 'error', confirmButtonColor: '#ef4444' });
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleReactivar = async (u: UserEntry) => {
        const confirm = await AppSwal.fire({
            title: '¿Reactivar este usuario?',
            html: `<div style="text-align:left;font-size:13px;line-height:1.6">
                <strong style="color:#10b981">${u.nombre}</strong><br/>
                <span style="color:#9ca3af">Usuario: ${u.user}</span>
                <hr style="margin:10px 0;border-color:rgba(255,255,255,0.1)"/>
                Se le generará una <strong>nueva contraseña</strong> (la actual ya no es válida).
            </div>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, reactivar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#10b981',
        });
        if (!confirm.isConfirmed) return;

        setIsLoading(true);
        try {
            const res = await reactivarUsuario(u.dni);
            if (res.success) {
                await AppSwal.fire({
                    title: 'Usuario reactivado',
                    html: `<div style="text-align:center">
                        <p style="color:#9ca3af;margin-bottom:8px">Nueva contraseña:</p>
                        <code style="display:inline-block;padding:8px 14px;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:8px;color:#10b981;font-size:16px;font-family:monospace;font-weight:900;letter-spacing:1px">${res.nuevaClave}</code>
                    </div>`,
                    icon: 'success',
                    confirmButtonColor: '#10b981',
                });
                setUsers(prev => prev.map(usr => usr.dni === u.dni ? { ...usr, estado: 'ACTIVO' } : usr));
            } else {
                AppSwal.fire({ title: 'Error', text: res.error || 'No se pudo reactivar', icon: 'error', confirmButtonColor: '#ef4444' });
            }
        } finally {
            setIsLoading(false);
        }
    };

    const filteredUsers = users.filter(u => {
        if (!search) return true;
        const s = search.toLowerCase();
        return u.nombre.toLowerCase().includes(s) || u.user.toLowerCase().includes(s) || u.dni.includes(s);
    });

    const getRolBadgeColor = (rol: string) => {
        const r = (rol || '').toUpperCase();
        if (r === 'ADMIN') return { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'rgba(239,68,68,0.3)' };
        if (r === 'SPECIAL') return { bg: 'rgba(139,92,246,0.15)', color: '#8b5cf6', border: 'rgba(139,92,246,0.3)' };
        return { bg: 'rgba(16,185,129,0.1)', color: '#10b981', border: 'rgba(16,185,129,0.2)' };
    };

    const supervisorField = (value: string, onChange: (v: string) => void, required = false) => (
        <>
            {supervisors.length > 0 ? (
                <select value={value} onChange={e => onChange(e.target.value)}
                    style={{ ...inputStyle, colorScheme: 'dark', color: value ? 'white' : 'rgba(255,255,255,0.4)' }}>
                    <option value="">Sin supervisor</option>
                    {supervisors.map((s, i) => (
                        <option key={i} value={s.user}>{s.nombre || s.user}</option>
                    ))}
                </select>
            ) : (
                <>
                    <input type="text" value={value} onChange={e => onChange(e.target.value)}
                        placeholder="Escribir nombre del supervisor..." style={inputStyle} />
                    <span style={{ fontSize: '9px', color: 'rgba(245,158,11,0.7)', marginTop: '2px', display: 'block' }}>
                        No hay supervisores en el sistema
                    </span>
                </>
            )}
        </>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px', gap: '16px', overflow: 'hidden' }}>

            {/* Top Bar */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input type="text" placeholder="Buscar por nombre, usuario o DNI..."
                    value={search} onChange={e => setSearch(e.target.value)}
                    style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: 'white', padding: '12px 16px', fontSize: '13px', outline: 'none' }}
                />
                <button onClick={() => setIsCreateOpen(true)} style={{
                    background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', border: 'none', borderRadius: '12px',
                    color: 'white', padding: '12px 24px', fontSize: '11px', fontWeight: 900,
                    textTransform: 'uppercase', letterSpacing: '1px', cursor: 'pointer',
                    boxShadow: '0 8px 20px -5px rgba(139,92,246,0.4)', whiteSpace: 'nowrap'
                }}>
                    + Nuevo Usuario
                </button>
            </div>

            {/* User Table */}
            <div style={{ flex: 1, overflow: 'hidden', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}>
                <div style={{ height: '100%', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(10,10,12,0.95)', backdropFilter: 'blur(20px)' }}>
                            <tr>
                                {['DNI', 'Nombre Completo', 'Usuario', 'Contraseña', 'Rol', 'Supervisor', 'Campaña', 'Acciones'].map(h => (
                                    <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '9px', fontWeight: 900, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.2em', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.2)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '3px' }}>
                                        Sin resultados
                                    </td>
                                </tr>
                            ) : filteredUsers.map((u, idx) => {
                                const badge = getRolBadgeColor(u.rol);
                                const isInactivo = (u.estado || '').toUpperCase() === 'INACTIVO';
                                return (
                                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s', opacity: isInactivo ? 0.55 : 1 }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                        <td style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>{u.dni}</td>
                                        <td style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 800, color: 'white', textTransform: 'uppercase' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ textDecoration: isInactivo ? 'line-through' : 'none' }}>{u.nombre}</span>
                                                {isInactivo && (
                                                    <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '8px', fontWeight: 900, background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                                        INACTIVO
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span onClick={() => copyToClipboard(u.user, `user-${idx}`)}
                                                style={{ fontSize: '11px', fontWeight: 900, color: '#8b5cf6', fontFamily: 'monospace', cursor: 'pointer' }}
                                                title="Copiar usuario">
                                                {u.user} {copiedField === `user-${idx}` ? '✓' : ''}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>••••••••</td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '9px', fontWeight: 900, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, textTransform: 'uppercase' }}>
                                                {u.rol}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>{u.supervisor || '—'}</td>
                                        <td style={{ padding: '12px 16px' }}>
                                            {u.campana ? (
                                                <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '9px', fontWeight: 900, background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)', textTransform: 'uppercase' }}>
                                                    {u.campana}
                                                </span>
                                            ) : <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px' }}>—</span>}
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <button onClick={() => openEdit(u)} disabled={isLoading} style={{
                                                    background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)',
                                                    borderRadius: '8px', color: '#8b5cf6', padding: '5px 12px',
                                                    fontSize: '10px', fontWeight: 900, cursor: isLoading ? 'not-allowed' : 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px'
                                                }}>
                                                    Editar
                                                </button>
                                                {isInactivo ? (
                                                    <button onClick={() => handleReactivar(u)} disabled={isLoading} style={{
                                                        background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                                                        borderRadius: '8px', color: '#10b981', padding: '5px 12px',
                                                        fontSize: '10px', fontWeight: 900, cursor: isLoading ? 'not-allowed' : 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px'
                                                    }}>
                                                        Reactivar
                                                    </button>
                                                ) : (
                                                    <button onClick={() => handleDarDeBaja(u)} disabled={isLoading} style={{
                                                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                                                        borderRadius: '8px', color: '#ef4444', padding: '5px 12px',
                                                        fontSize: '10px', fontWeight: 900, cursor: isLoading ? 'not-allowed' : 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px'
                                                    }}>
                                                        Dar de Baja
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── CREATE MODAL ── */}
            {isCreateOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 1000000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={() => setIsCreateOpen(false)}>
                    <div style={{ width: '520px', background: '#111', borderRadius: '24px', border: '1px solid rgba(139,92,246,0.2)', padding: '36px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 25px 60px -10px rgba(139,92,246,0.2)', maxHeight: '90vh', overflowY: 'auto' }}
                        onClick={e => e.stopPropagation()}>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: 0, color: 'white', fontSize: '1.3rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.5px' }}>Nuevo Usuario</h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '2px' }}>Acceso al sistema</p>
                            </div>
                            <button onClick={() => setIsCreateOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                        </div>

                        {/* DNI + Teléfono */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={labelStyle}>DNI *</label>
                                <input type="text" maxLength={8} value={form.dni}
                                    onChange={e => setForm(p => ({ ...p, dni: e.target.value.replace(/\D/g, '') }))}
                                    placeholder="12345678" style={{ ...inputStyle, fontFamily: 'monospace' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={labelStyle}>Teléfono</label>
                                <input type="text" value={form.telefono}
                                    onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))}
                                    placeholder="9XXXXXXXX" style={inputStyle} />
                            </div>
                        </div>

                        {/* Nombre */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={labelStyle}>Nombre Completo *</label>
                            <input type="text" value={form.nombre} onChange={e => handleNombreChange(e.target.value)}
                                placeholder="Apellido Paterno Apellido Materno Nombres" style={inputStyle} />
                        </div>

                        {/* Usuario + Clave */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={labelStyle}>Usuario (auto) *</label>
                                <input type="text" value={form.user}
                                    onChange={e => setForm(p => ({ ...p, user: e.target.value.toUpperCase().replace(/\s/g, '') }))}
                                    style={{ ...inputStyle, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.3)', color: '#8b5cf6', fontFamily: 'monospace', fontWeight: 900 }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={labelStyle}>Contraseña (auto) *</label>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <input type="text" value={form.clave}
                                        onChange={e => setForm(p => ({ ...p, clave: e.target.value }))}
                                        style={{ flex: 1, ...inputStyle, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.3)', color: '#8b5cf6', fontFamily: 'monospace', fontWeight: 900 }} />
                                    <button onClick={() => setForm(p => ({ ...p, clave: generatePassword() }))} title="Regenerar"
                                        style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '8px', color: '#8b5cf6', padding: '0 10px', cursor: 'pointer', fontSize: '14px' }}>↻</button>
                                </div>
                            </div>
                        </div>

                        {/* Supervisor + Campaña */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={labelStyle}>Supervisor <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>(opcional)</span></label>
                                {supervisorField(form.supervisor, v => setForm(p => ({ ...p, supervisor: v })))}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={labelStyle}>Campaña *</label>
                                <select value={form.campana} onChange={e => setForm(p => ({ ...p, campana: e.target.value }))}
                                    style={{ ...inputStyle, colorScheme: 'dark' }}>
                                    <option value="R10">RUC 10</option>
                                    <option value="R20">RUC 20</option>
                                    <option value="R10,R20">RUC 10 y RUC 20</option>
                                </select>
                            </div>
                        </div>

                        {/* Credenciales */}
                        <div style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: '12px', padding: '14px 16px' }}>
                            <p style={{ margin: '0 0 8px 0', fontSize: '9px', fontWeight: 900, color: 'rgba(139,92,246,0.7)', textTransform: 'uppercase', letterSpacing: '2px' }}>Credenciales generadas</p>
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <div><span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)' }}>USUARIO: </span><span style={{ fontSize: '12px', fontWeight: 900, color: '#8b5cf6', fontFamily: 'monospace' }}>{form.user || '—'}</span></div>
                                <div><span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)' }}>CLAVE: </span><span style={{ fontSize: '12px', fontWeight: 900, color: '#8b5cf6', fontFamily: 'monospace' }}>{form.clave}</span></div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={handleCreate} disabled={isLoading} style={{ flex: 2, background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', border: 'none', borderRadius: '12px', color: 'white', padding: '14px', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.6 : 1 }}>
                                {isLoading ? 'Creando...' : 'Crear Usuario'}
                            </button>
                            <button onClick={() => setIsCreateOpen(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'rgba(255,255,255,0.6)', padding: '14px', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', cursor: 'pointer' }}>
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── EDIT MODAL ── */}
            {editingUser && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 1000000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={() => setEditingUser(null)}>
                    <div style={{ width: '520px', background: '#111', borderRadius: '24px', border: '1px solid rgba(16,185,129,0.2)', padding: '36px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 25px 60px -10px rgba(16,185,129,0.15)', maxHeight: '90vh', overflowY: 'auto' }}
                        onClick={e => e.stopPropagation()}>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: 0, color: 'white', fontSize: '1.3rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.5px' }}>Editar Usuario</h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '2px' }}>
                                    {editingUser.user} · DNI {editingUser.dni}
                                </p>
                            </div>
                            <button onClick={() => setEditingUser(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                        </div>

                        {/* Nombre */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ ...labelStyle, color: '#10b981' }}>Nombre Completo *</label>
                            <input type="text" value={editForm.nombre} onChange={e => setEditForm(p => ({ ...p, nombre: e.target.value }))}
                                style={inputStyle} />
                        </div>

                        {/* Teléfono + Nueva Clave */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ ...labelStyle, color: '#10b981' }}>Teléfono</label>
                                <input type="text" value={editForm.telefono} onChange={e => setEditForm(p => ({ ...p, telefono: e.target.value }))}
                                    placeholder="9XXXXXXXX" style={inputStyle} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ ...labelStyle, color: '#10b981' }}>Nueva Contraseña <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>(opcional)</span></label>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <input type="text" value={editForm.clave} onChange={e => setEditForm(p => ({ ...p, clave: e.target.value }))}
                                        placeholder="Dejar vacío para no cambiar"
                                        style={{ flex: 1, ...inputStyle, fontSize: '11px' }} />
                                    <button onClick={() => setEditForm(p => ({ ...p, clave: generatePassword() }))} title="Generar nueva"
                                        style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', color: '#10b981', padding: '0 10px', cursor: 'pointer', fontSize: '14px' }}>↻</button>
                                </div>
                            </div>
                        </div>

                        {/* Rol */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ ...labelStyle, color: '#10b981' }}>Rol *</label>
                            <select value={editForm.rol} onChange={e => setEditForm(p => ({ ...p, rol: e.target.value }))}
                                style={{ ...inputStyle, colorScheme: 'dark' }}>
                                <option value="STANDAR">STANDAR</option>
                                <option value="SPECIAL">SPECIAL (Supervisor)</option>
                                <option value="ADMIN">ADMIN</option>
                            </select>
                        </div>

                        {/* Supervisor + Campaña */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ ...labelStyle, color: '#10b981' }}>Supervisor <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>(opcional)</span></label>
                                {supervisorField(editForm.supervisor, v => setEditForm(p => ({ ...p, supervisor: v })))}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ ...labelStyle, color: '#10b981' }}>Campaña *</label>
                                <select value={editForm.campana} onChange={e => setEditForm(p => ({ ...p, campana: e.target.value }))}
                                    style={{ ...inputStyle, colorScheme: 'dark' }}>
                                    <option value="R10">RUC 10</option>
                                    <option value="R20">RUC 20</option>
                                    <option value="R10,R20">RUC 10 y RUC 20</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={handleEdit} disabled={isLoading} style={{ flex: 2, background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: '12px', color: 'white', padding: '14px', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.6 : 1 }}>
                                {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                            <button onClick={() => setEditingUser(null)} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'rgba(255,255,255,0.6)', padding: '14px', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', cursor: 'pointer' }}>
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
