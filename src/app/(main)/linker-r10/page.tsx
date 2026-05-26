import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasCampaignAccess } from "@/lib/campaign";
import { getIngresadosR10 } from "@/app/actions/leads-r10";
import LinkerR10Client from "./LinkerR10Client";

export default async function LinkerR10Page() {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/login');

    const user = session.user as any;
    const role = user.role;

    if (role !== 'SPECIAL' && role !== 'ADMIN') {
        redirect('/');
    }
    if (!hasCampaignAccess(user.campania, role, 'R10')) {
        redirect('/');
    }

    const userName = user.name || user.email || '';

    const rechazos = await getIngresadosR10(userName, role, {
        estado: 'RECHAZADO',
        scope: role === 'ADMIN' ? 'all' : 'team',
    });

    return (
        <LinkerR10Client
            user={userName}
            userRole={role}
            rechazos={rechazos}
        />
    );
}
