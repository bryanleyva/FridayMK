import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAllUsers, getAllSupervisors } from "@/app/actions/leads";
import AccesosManager from "@/components/AccesosManager";

export default async function AccesosPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/login');

    const userRole = (session.user as any).role || 'STANDAR';
    if (userRole !== 'ADMIN') redirect('/');

    const [users, supervisors] = await Promise.all([getAllUsers(), getAllSupervisors()]);

    return (
        <div className="animate-in fade-in slide-in-from-right-10 duration-300 h-[calc(100vh-64px)] flex flex-col w-full overflow-hidden select-none bg-[#050505]">
            <div className="px-8 py-5 flex items-center justify-between relative z-50" style={{ backgroundColor: 'rgba(24, 24, 27, 0.4)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div className="flex items-center gap-6">
                    <div className="w-1.5 h-10 bg-violet-500 rounded-full shadow-[0_0_25px_#8b5cf6]" />
                    <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic" style={{ letterSpacing: '-0.02em' }}>
                        Gestión de Accesos
                    </h2>
                </div>
                <div className="flex items-center gap-6">
                    <span className="text-[10px] font-black text-white/30 tracking-[0.4em] uppercase">Solo Admin</span>
                </div>
            </div>

            <div className="flex-1 w-full overflow-hidden">
                <AccesosManager users={users} supervisors={supervisors} />
            </div>
        </div>
    );
}
