import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import LinkerTabs from '@/components/LinkerTabs';
import { hasCampaignAccess } from "@/lib/campaign";
import { getIngresadosR10 } from "@/app/actions/leads-r10";

export default async function LinkerPage() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) redirect('/login');

    const user = session.user as any;
    const role = user.role || 'STANDAR';
    const userName = user.name || user.email || '';

    const hasR20 = hasCampaignAccess(user.campania, role, 'R20');
    const hasR10 = hasCampaignAccess(user.campania, role, 'R10');
    const isPrivileged = role === 'SPECIAL' || role === 'ADMIN';
    const canSeeRechazosR10 = isPrivileged && hasR10;

    // Permite acceso si tiene R20 (caso original) o si es supervisor/admin de R10
    if (!hasR20 && !canSeeRechazosR10) {
        redirect('/');
    }

    const rechazosR10 = canSeeRechazosR10
        ? await getIngresadosR10(userName, role, {
            estado: 'RECHAZADO',
            scope: role === 'ADMIN' ? 'all' : 'team',
        })
        : [];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-5 duration-300">
            <LinkerTabs
                currentUserRole={role}
                currentUserName={userName}
                currentUserCargo={user.cargo || ''}
                showLinkerTab={hasR20}
                showRechazosR10Tab={canSeeRechazosR10}
                rechazosR10={rechazosR10}
            />
        </div>
    );
}
