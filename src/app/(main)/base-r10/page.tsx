import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasCampaignAccess } from "@/lib/campaign";
import { getBaseLibreR10, getMiBaseR10 } from "@/app/actions/leads-r10";
import { getAllUsers } from "@/app/actions/leads";
import BaseR10Client from "./BaseR10Client";

export default async function BaseR10Page() {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/login');

    const user = session.user as any;
    const role = user.role;
    const userName = user.name || user.email || '';

    if (!hasCampaignAccess(user.campania, role, 'R10')) {
        redirect('/');
    }

    let libreLeads: any[] = [];
    let teamMembers: { user: string; nombre: string }[] = [];

    if (role === 'ADMIN' || role === 'SPECIAL') {
        const [libre, allUsers] = await Promise.all([
            getBaseLibreR10(userName, role),
            getAllUsers(),
        ]);
        libreLeads = libre;

        if (role === 'ADMIN') {
            teamMembers = allUsers
                .filter((u: any) => (u.rol || '').trim().toUpperCase() === 'STANDAR')
                .map((u: any) => ({ user: u.user, nombre: u.nombre }));
        } else {
            teamMembers = allUsers
                .filter((u: any) =>
                    (u.supervisor || '').trim().toUpperCase() === userName.trim().toUpperCase() &&
                    (u.rol || '').trim().toUpperCase() === 'STANDAR'
                )
                .map((u: any) => ({ user: u.user, nombre: u.nombre }));
        }
    }

    const miBase = (await getMiBaseR10(userName)) as any[];

    return (
        <BaseR10Client
            userRole={role}
            userName={userName}
            libreLeads={libreLeads}
            teamMembers={teamMembers}
            initialMiBase={miBase}
        />
    );
}
