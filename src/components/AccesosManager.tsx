'use client';

import React, { useState } from 'react';
import { createUser } from '@/app/actions/leads';
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
    // First letter of first name + first surname
    const initial = parts[0][0] || '';
    const apellido = parts[parts.length > 2 ? parts.length - 2 : 1] || '';
    return (initial + apellido).substring(0, 10).replace(/[^A-Z0-9]/g, '');
}

function generatePassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pass = '';
    for (let i = 0; i < 8; i++) {
        pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
}

export default function AccesosManager({ users: initialUsers, supervisors }: Props) {
    const [users, setUsers] = useState(initialUsers);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const [form, setForm] = useState({
        dni: '',
        nombre: '',
        user: '',
        clave: generatePassword(),
        supervisor: '',
        campana: 'R10',
        telefono: ''
    });

    const copyToClipboard = (text: string, fieldId: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(fieldId);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleNombreChange = (nombre: string) => {
        setForm(prev => ({
            ...prev,
            nombre,
            user: generateUsername(nombre)
        }));
    };

    const handleSubmit = async () => {
        if (!form.dni || !form.nombre || !form.user || !form.clave) {
            AppSwal.fire({ title: 'Campos requeridos', text: 'Completa DNI, nombre, usuario y contraseña.', icon: 'warning', confirmButtonColor: '#8b5cf6' });
            return;
        }
        setIsLoading(true);
        try {
            const res = await createUser(form);
            if (res.success) {
                AppSwal.fire({ title: 'Usuario creado', text: `El usuario ${form.user} fue creado exitosamente.`, icon: 'success', confirmButtonColor: '#10b981' });
                // Refresh user list
                setUsers(prev => [...prev, {
                    dni: form.dni,
                    nombre: form.nombre,
                    user: form.user,
                    rol: 'STANDAR',
                    cargo: '',
                    supervisor: form.supervisor,
                    telefono: form.telefono,
                    campana: form.campana
                }]);
                setForm({ dni: '', nombre: '', user: '', clave: generatePassword(), supervisor: '', campana: 'R10', telefono: '' });
                setIsFormOpen(false);
            } else {
                AppSwal.fire({ title: 'Error', text: res.error || 'No se pudo crear el usuario', icon: 'error', confirmButtonColor: '#ef4444' });
            }
        } catch {
            AppSwal.fire({ title: 'Error', text: 'Error inesperado al crear usuario', icon: 'error', confirmButtonColor: '#ef4444' });
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

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px', gap: '16px', overflow: 'hidden' }}>

            {/* Top Bar */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input
                    type="text"
                    placeholder="Buscar por nombre, usuario o DNI..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                        flex: 1,
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '12px',
                        color: 'white',
                        padding: '12px 16px',
                        fontSize: '13px',
                        outline: 'none'
                    }}
                />
                <button
                    onClick={() => setIsFormOpen(true)}
                    style={{
                        background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                        border: 'none',
                        borderRadius: '12px',
                        color: 'white',
                        padding: '12px 24px',
                        fontSize: '11px',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        cursor: 'pointer',
                        boxShadow: '0 8px 20px -5px rgba(139,92,246,0.4)',
                        whiteSpace: 'nowrap'
                    }}
                >
                    + Nuevo Usuario
                </button>
            </div>

            {/* User Table */}
            <div style={{ flex: 1, overflow: 'hidden', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}>
                <div style={{ height: '100%', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(10,10,12,0.95)', backdropFilter: 'blur(20px)' }}>
                            <tr>
                                {['DNI', 'Nombre Completo', 'Usuario', 'Contraseña', 'Rol', 'Supervisor', 'Campaña'].map(h => (
                                    <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '9px', fontWeight: 900, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.2em', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.2)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '3px' }}>
                                        Sin resultados
                                    </td>
                                </tr>
                            ) : filteredUsers.map((u, idx) => {
                                const badge = getRolBadgeColor(u.rol);
                                return (
                                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                        <td style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>{u.dni}</td>
                                        <td style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 800, color: 'white', textTransform: 'uppercase' }}>{u.nombre}</td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span
                                                onClick={() => copyToClipboard(u.user, `user-${idx}`)}
                                                style={{ fontSize: '11px', fontWeight: 900, color: '#8b5cf6', fontFamily: 'monospace', cursor: 'pointer' }}
                                                title="Copiar usuario"
                                            >
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
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create User Modal */}
            {isFormOpen && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 1000000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={() => setIsFormOpen(false)}
                >
                    <div
                        style={{ width: '520px', background: '#111', borderRadius: '24px', border: '1px solid rgba(139,92,246,0.2)', padding: '36px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 25px 60px -10px rgba(139,92,246,0.2)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: 0, color: 'white', fontSize: '1.3rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.5px' }}>Nuevo Usuario</h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '2px' }}>Acceso al sistema</p>
                            </div>
                            <button onClick={() => setIsFormOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                        </div>

                        {/* DNI */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '9px', fontWeight: 900, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.2em' }}>DNI *</label>
                                <input
                                    type="text"
                                    maxLength={8}
                                    value={form.dni}
                                    onChange={e => setForm(p => ({ ...p, dni: e.target.value.replace(/\D/g, '') }))}
                                    placeholder="12345678"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', padding: '10px 14px', fontSize: '13px', outline: 'none', fontFamily: 'monospace' }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '9px', fontWeight: 900, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Teléfono</label>
                                <input
                                    type="text"
                                    value={form.telefono}
                                    onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))}
                                    placeholder="9XXXXXXXX"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', padding: '10px 14px', fontSize: '13px', outline: 'none' }}
                                />
                            </div>
                        </div>

                        {/* Nombre Completo */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '9px', fontWeight: 900, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Nombre Completo *</label>
                            <input
                                type="text"
                                value={form.nombre}
                                onChange={e => handleNombreChange(e.target.value)}
                                placeholder="Apellido Paterno Apellido Materno Nombres"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', padding: '10px 14px', fontSize: '13px', outline: 'none' }}
                            />
                        </div>

                        {/* Usuario y Clave generados */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '9px', fontWeight: 900, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Usuario (auto) *</label>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <input
                                        type="text"
                                        value={form.user}
                                        onChange={e => setForm(p => ({ ...p, user: e.target.value.toUpperCase().replace(/\s/g, '') }))}
                                        style={{ flex: 1, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '10px', color: '#8b5cf6', padding: '10px 14px', fontSize: '13px', outline: 'none', fontFamily: 'monospace', fontWeight: 900 }}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '9px', fontWeight: 900, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Contraseña (auto) *</label>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <input
                                        type="text"
                                        value={form.clave}
                                        onChange={e => setForm(p => ({ ...p, clave: e.target.value }))}
                                        style={{ flex: 1, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '10px', color: '#8b5cf6', padding: '10px 14px', fontSize: '13px', outline: 'none', fontFamily: 'monospace', fontWeight: 900 }}
                                    />
                                    <button
                                        onClick={() => setForm(p => ({ ...p, clave: generatePassword() }))}
                                        title="Regenerar contraseña"
                                        style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '8px', color: '#8b5cf6', padding: '0 10px', cursor: 'pointer', fontSize: '14px' }}
                                    >↻</button>
                                </div>
                            </div>
                        </div>

                        {/* Supervisor y Campaña */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '9px', fontWeight: 900, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                                    Supervisor <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>(opcional)</span>
                                </label>
                                {supervisors.length > 0 ? (
                                    <select
                                        value={form.supervisor}
                                        onChange={e => setForm(p => ({ ...p, supervisor: e.target.value }))}
                                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: form.supervisor ? 'white' : 'rgba(255,255,255,0.4)', padding: '10px 14px', fontSize: '13px', outline: 'none', colorScheme: 'dark' }}
                                    >
                                        <option value="">Sin supervisor</option>
                                        {supervisors.map((s, i) => (
                                            <option key={i} value={s.user}>{s.nombre || s.user}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        value={form.supervisor}
                                        onChange={e => setForm(p => ({ ...p, supervisor: e.target.value }))}
                                        placeholder="Escribir nombre del supervisor..."
                                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', padding: '10px 14px', fontSize: '13px', outline: 'none' }}
                                    />
                                )}
                                {supervisors.length === 0 && (
                                    <span style={{ fontSize: '9px', color: 'rgba(245,158,11,0.7)', marginTop: '2px' }}>
                                        No hay supervisores en el sistema
                                    </span>
                                )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '9px', fontWeight: 900, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Campaña *</label>
                                <select
                                    value={form.campana}
                                    onChange={e => setForm(p => ({ ...p, campana: e.target.value }))}
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', padding: '10px 14px', fontSize: '13px', outline: 'none', colorScheme: 'dark' }}
                                >
                                    <option value="R10">RUC 10</option>
                                    <option value="R20">RUC 20</option>
                                    <option value="R10,R20">RUC 10 y RUC 20</option>
                                </select>
                            </div>
                        </div>

                        {/* Resumen de credenciales */}
                        <div style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: '12px', padding: '14px 16px' }}>
                            <p style={{ margin: '0 0 8px 0', fontSize: '9px', fontWeight: 900, color: 'rgba(139,92,246,0.7)', textTransform: 'uppercase', letterSpacing: '2px' }}>Credenciales generadas</p>
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <div>
                                    <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)' }}>USUARIO: </span>
                                    <span style={{ fontSize: '12px', fontWeight: 900, color: '#8b5cf6', fontFamily: 'monospace' }}>{form.user || '—'}</span>
                                </div>
                                <div>
                                    <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)' }}>CLAVE: </span>
                                    <span style={{ fontSize: '12px', fontWeight: 900, color: '#8b5cf6', fontFamily: 'monospace' }}>{form.clave}</span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={handleSubmit}
                                disabled={isLoading}
                                style={{ flex: 2, background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', border: 'none', borderRadius: '12px', color: 'white', padding: '14px', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.6 : 1 }}
                            >
                                {isLoading ? 'Creando...' : 'Crear Usuario'}
                            </button>
                            <button
                                onClick={() => setIsFormOpen(false)}
                                style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'rgba(255,255,255,0.6)', padding: '14px', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', cursor: 'pointer' }}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
