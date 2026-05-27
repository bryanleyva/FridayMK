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

    // Normaliza para comparar: quita tildes, espacios extra y pone en mayúsculas.
    const norm = (s: any): string =>
        (s || '').toString().trim().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

    // ¿El usuario tiene R10 en su lista de campañas? Soporta "R10", "R10,R20", "R20, R10", etc.
    const tieneR10 = (campania: any): boolean =>
        norm(campania).split(/[,;\s]+/).filter(Boolean).includes('R10');

    if (role === 'ADMIN' || role === 'SPECIAL') {
        const [libre, allUsers] = await Promise.all([
            getBaseLibreR10(userName, role),
            getAllUsers(),
        ]);
        libreLeads = libre;

        const supervisorNorm = norm(userName);
        const standarR10 = allUsers.filter((u: any) =>
            norm(u.rol) === 'STANDAR' && tieneR10(u.campana)
        );

        if (role === 'ADMIN') {
            teamMembers = standarR10.map((u: any) => ({ user: u.user, nombre: u.nombre }));
        } else {
            // SPECIAL: solo su equipo (ejecutivos cuyo SUPERVISOR coincida con su nombre)
            teamMembers = standarR10
                .filter((u: any) => norm(u.supervisor) === supervisorNorm)
                .map((u: any) => ({ user: u.user, nombre: u.nombre }));
        }

        console.log(`[BaseR10Page] role=${role} userName="${userName}" allUsers=${allUsers.length} standarR10=${standarR10.length} teamMembers=${teamMembers.length}`);
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
