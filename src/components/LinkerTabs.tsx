'use client';

import { useState } from 'react';
import SessionLinker from './SessionLinker';
import RechazosR10View from './RechazosR10View';

interface Props {
    currentUserRole: string;
    currentUserName: string;
    currentUserCargo: string;
    showLinkerTab: boolean;
    showRechazosR10Tab: boolean;
    rechazosR10: any[];
}

type TabKey = 'LINKER' | 'RECHAZOS_R10';

export default function LinkerTabs({
    currentUserRole,
    currentUserName,
    currentUserCargo,
    showLinkerTab,
    showRechazosR10Tab,
    rechazosR10,
}: Props) {
    const defaultTab: TabKey = showLinkerTab ? 'LINKER' : 'RECHAZOS_R10';
    const [tab, setTab] = useState<TabKey>(defaultTab);

    // Si solo hay una pestaña visible, no mostrar la barra de tabs
    const onlyOneTab = (showLinkerTab ? 1 : 0) + (showRechazosR10Tab ? 1 : 0) === 1;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {!onlyOneTab && (
                <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                    background: 'rgba(24,24,27,0.4)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '12px',
                    padding: '0.6rem',
                }}>
                    {showLinkerTab && (
                        <TabButton active={tab === 'LINKER'} onClick={() => setTab('LINKER')} color="#6366f1" label="Linker" badge={rechazosR10 ? undefined : undefined} />
                    )}
                    {showRechazosR10Tab && (
                        <TabButton active={tab === 'RECHAZOS_R10'} onClick={() => setTab('RECHAZOS_R10')} color="#ef4444" label="Rechazos R10" badge={rechazosR10.length} />
                    )}
                </div>
            )}

            {tab === 'LINKER' && showLinkerTab && (
                <SessionLinker
                    currentUserRole={currentUserRole}
                    currentUserName={currentUserName}
                    currentUserCargo={currentUserCargo}
                />
            )}

            {tab === 'RECHAZOS_R10' && showRechazosR10Tab && (
                <RechazosR10View
                    user={currentUserName}
                    userRole={currentUserRole}
                    rechazos={rechazosR10}
                />
            )}
        </div>
    );
}

function TabButton({ active, onClick, color, label, badge }: { active: boolean; onClick: () => void; color: string; label: string; badge?: number }) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: '0.55rem 1.1rem',
                background: active ? `${color}22` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${active ? color : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '8px',
                color: active ? color : '#9ca3af',
                cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                display: 'flex', gap: '0.5rem', alignItems: 'center',
                transition: 'all .2s',
            }}
        >
            <span>{label}</span>
            {badge !== undefined && (
                <span style={{ background: 'rgba(0,0,0,0.3)', padding: '0.1rem 0.5rem', borderRadius: '999px', fontSize: '0.75rem' }}>
                    {badge}
                </span>
            )}
        </button>
    );
}
