'use client';

import React, { useState } from 'react';
import { AppSwal } from '@/lib/sweetalert';

interface DroppedProspect {
    id: string;
    ruc: string;
    razonSocial: string;
    contacto: string;
    telefono: string;
    lineas: string;
    cargoFijo: string;
    ejecutivo: string;
    motivo: string;
    estadoFinal: string;
    fechaCaida: string;
}

interface Props {
    data: DroppedProspect[];
    userRole?: string;
    onDelete?: (id: string) => Promise<void>;
}

export default function DroppedProspectsTable({ data, userRole, onDelete }: Props) {
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const isAdmin = userRole === 'ADMIN';

    const handleDelete = async (item: DroppedProspect) => {
        if (!onDelete) return;
        const result = await AppSwal.fire({
            title: '¿Eliminar registro?',
            html: `<span style="font-size:12px;color:rgba(255,255,255,0.6)">Se eliminará permanentemente: <b style="color:white">${item.razonSocial}</b></span>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: 'rgba(255,255,255,0.1)',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });
        if (!result.isConfirmed) return;

        setDeletingId(item.id);
        try {
            await onDelete(item.id);
        } finally {
            setDeletingId(null);
        }
    };

    if (!data || data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-10 text-center">
                <div className="text-5xl mb-4 opacity-20">🕳️</div>
                <h3 className="text-xl font-bold text-white/40 uppercase tracking-widest">No hay ventas caídas registradas</h3>
            </div>
        );
    }

    return (
        <div className="w-full h-full overflow-hidden flex flex-col px-6 pb-6">
            <div className="flex-1 overflow-auto custom-scrollbar rounded-2xl border border-white/5 bg-zinc-900/40 backdrop-blur-xl">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10">
                        <tr className="bg-zinc-950/80 backdrop-blur-md border-bottom border-white/5">
                            <th className="px-6 py-4 text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em]">RUC</th>
                            <th className="px-6 py-4 text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em]">Razón Social</th>
                            <th className="px-6 py-4 text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em]">Ejecutivo</th>
                            <th className="px-6 py-4 text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em]">Fecha Caída</th>
                            <th className="px-6 py-4 text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em]">Motivo</th>
                            <th className="px-6 py-4 text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em]">Estado Final</th>
                            <th className="px-6 py-4 text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em]">Contacto</th>
                            {isAdmin && (
                                <th className="px-6 py-4 text-[9px] font-black text-red-500 uppercase tracking-[0.2em]">Eliminar</th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.02]">
                        {data.map((item) => (
                            <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-xs font-mono font-bold text-white/50 group-hover:text-white transition-colors">{item.ruc}</span>
                                        {item.ruc?.startsWith('10') && (
                                            <span className="text-[8px] font-black text-amber-500/70 uppercase tracking-wider">RUC 10</span>
                                        )}
                                        {item.ruc?.startsWith('20') && (
                                            <span className="text-[8px] font-black text-blue-500/70 uppercase tracking-wider">RUC 20</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-white uppercase tracking-tight">{item.razonSocial}</span>
                                        <span className="text-[9px] text-white/30 font-bold uppercase">{item.lineas} Líneas • S/ {item.cargoFijo}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-[10px] font-bold text-emerald-500/80 uppercase">{item.ejecutivo}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-[10px] font-medium text-white/40">{item.fechaCaida}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="max-w-[200px] truncate">
                                        <span className="text-[10px] text-white/60 italic">"{item.motivo}"</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 rounded-md bg-red-500/10 text-red-500 text-[9px] font-black uppercase tracking-wider border border-red-500/20">
                                        {item.estadoFinal}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-white/70">{item.contacto}</span>
                                        <span className="text-[10px] font-mono text-white/30">{item.telefono}</span>
                                    </div>
                                </td>
                                {isAdmin && (
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleDelete(item)}
                                            disabled={deletingId === item.id}
                                            style={{
                                                background: 'rgba(239,68,68,0.1)',
                                                border: '1px solid rgba(239,68,68,0.25)',
                                                borderRadius: '8px',
                                                color: '#ef4444',
                                                padding: '6px 12px',
                                                fontSize: '9px',
                                                fontWeight: 900,
                                                textTransform: 'uppercase',
                                                cursor: deletingId === item.id ? 'not-allowed' : 'pointer',
                                                opacity: deletingId === item.id ? 0.5 : 1,
                                                letterSpacing: '1px',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={e => { if (deletingId !== item.id) { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; e.currentTarget.style.borderColor = '#ef4444'; } }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)'; }}
                                        >
                                            {deletingId === item.id ? '...' : '🗑 Eliminar'}
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
            `}</style>
        </div>
    );
}
