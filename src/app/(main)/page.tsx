'use client';

import { useSession } from 'next-auth/react';
import UserFotocheck from '@/components/UserFotocheck';

export default function InicioPage() {
    const { data: session, status } = useSession();

    if (status === 'loading') {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    const userData = session?.user ? {
        name: session.user.name || 'Usuario',
        role: (session.user as any).role || 'Personal',
        cargo: (session.user as any).cargo || '',
        dni: (session.user as any).dni || (session.user as any).id || '',
        supervisor: (session.user as any).supervisor || 'N/A',
        phone: (session.user as any).phone || '',
        photo: session.user.image || undefined
    } : null;

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '1rem 1rem 4rem',
            position: 'relative',
            minHeight: '85vh',
            animation: 'fadeIn 0.5s ease-out forwards'
        }}>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .layout-wrapper-inicio {
                    display: flex;
                    flex-direction: row;
                    gap: 3.5rem;
                    align-items: flex-start;
                    justify-content: center;
                    width: 100%;
                    max-width: 1400px;
                    z-index: 10;
                    margin-top: 2rem;
                }
                .side-column {
                    flex-shrink: 0;
                }
                .main-column {
                    flex: 1;
                    display: flex;
                    flexDirection: column;
                    gap: 3rem;
                    max-width: 850px;
                }
                @media (max-width: 1100px) {
                    .layout-wrapper-inicio {
                        flex-direction: column;
                        align-items: center;
                        gap: 3rem;
                    }
                    .main-column {
                        max-width: 100%;
                    }
                }
            `}</style>

            {/* Ambient Background Glow */}
            <div style={{
                position: 'absolute',
                top: '-10%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '1200px',
                height: '800px',
                background: 'radial-gradient(circle, rgba(79, 70, 229, 0.05) 0%, transparent 70%)',
                zIndex: -1,
                pointerEvents: 'none'
            }}></div>

            <div className="layout-wrapper-inicio">
                {/* Side: Fotocheck */}
                {userData && (
                    <div className="side-column">
                        <UserFotocheck user={userData} />
                    </div>
                )}

                {/* Side: Welcome & Cards */}
                <div className="main-column" style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                    <div className="glass-panel" style={{
                        padding: '3.5rem',
                        textAlign: 'left',
                        width: '100%',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                        <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '1.5rem', color: 'white', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                            ¡Hola, {(userData?.name.split(' ')[0] || 'Bienvenido')}!
                        </h2>
                        <p style={{ color: '#9ca3af', fontSize: '1.25rem', lineHeight: 1.7, fontWeight: 300 }}>
                            Bienvenido a tu panel de control MK. Aquí puedes gestionar tus ventas,
                            revisar leads y monitorear tu desempeño en tiempo real. Selecciona una opción del menú para continuar.
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                        {/* Escala de Comisión Card */}
                        <div className="glass-panel" style={{
                            overflow: 'hidden',
                            width: '100%',
                            maxWidth: '380px',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            display: 'flex',
                            flexDirection: 'column'
                        }}>
                            <div style={{ width: '100%', height: '220px', backgroundColor: 'white', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <img
                                    src="/commission_scale.png"
                                    alt="Escala de Comisión"
                                    style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '1rem' }}
                                />
                            </div>

                            <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'white', marginBottom: '0.75rem' }}>
                                        Escala de Comisión
                                    </h3>
                                    <p style={{ color: '#9ca3af', fontSize: '0.95rem', lineHeight: 1.6 }}>
                                        Consulta las políticas comerciales actualizadas y las escalas de comisión vigentes para este periodo.
                                    </p>
                                </div>

                                <a
                                    href="https://res.cloudinary.com/dpwse9wkc/image/upload/Politicas_Comerciales_rayders_v1_gcslti.pd"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-primary"
                                    style={{
                                        display: 'block',
                                        textAlign: 'center',
                                        textDecoration: 'none',
                                        padding: '1rem'
                                    }}
                                >
                                    VER POLÍTICAS
                                </a>
                            </div>
                        </div>

                        {/* MOF COMERCIAL RAYDERS Card */}
                        <div className="glass-panel" style={{
                            overflow: 'hidden',
                            width: '100%',
                            maxWidth: '380px',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            display: 'flex',
                            flexDirection: 'column'
                        }}>
                            <div style={{ width: '100%', height: '220px', backgroundColor: 'white', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <img
                                    src="https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=800&auto=format&fit=crop"
                                    alt="MOF COMERCIAL MK"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            </div>

                            <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'white', marginBottom: '0.75rem' }}>
                                        MOF COMERCIAL MK
                                    </h3>
                                    <p style={{ color: '#9ca3af', fontSize: '0.95rem', lineHeight: 1.6 }}>
                                        El MOF permite delimitar funciones, evitar duplicidades, fortalecer la rendición de cuentas y alinear los esfuerzos individuales y colectivos al logro de los objetivos comerciales.
                                    </p>
                                </div>

                                <a
                                    href="https://res.cloudinary.com/dpwse9wkc/image/upload/v1767632763/MOF_Comercial_RAYDERS_bjknp6.pdf"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-primary"
                                    style={{
                                        display: 'block',
                                        textAlign: 'center',
                                        textDecoration: 'none',
                                        padding: '1rem'
                                    }}
                                >
                                    VER MOF
                                </a>
                            </div>
                        </div>

                        {/* ORGANIGRAMA COMERCIAL Card */}
                        <div className="glass-panel" style={{
                            overflow: 'hidden',
                            width: '100%',
                            maxWidth: '380px',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            display: 'flex',
                            flexDirection: 'column'
                        }}>
                            <div style={{ width: '100%', height: '220px', backgroundColor: 'white', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <img
                                    src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=800&auto=format&fit=crop"
                                    alt="ORGANIGRAMA COMERCIAL"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            </div>

                            <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'white', marginBottom: '0.75rem' }}>
                                        ORGANIGRAMA COMERCIAL
                                    </h3>
                                    <p style={{ color: '#9ca3af', fontSize: '0.95rem', lineHeight: 1.6 }}>
                                        Organigrama de la Empresa MK.
                                    </p>
                                </div>

                                <a
                                    href="https://res.cloudinary.com/dpwse9wkc/image/upload/v1771449128/ORGANIGRAMA_COMERCIAL_h5ryga.pdf"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-primary"
                                    style={{
                                        display: 'block',
                                        textAlign: 'center',
                                        textDecoration: 'none',
                                        padding: '1rem'
                                    }}
                                >
                                    VER ORGANIGRAMA
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
