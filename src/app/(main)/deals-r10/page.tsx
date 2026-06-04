import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasCampaignAccess } from "@/lib/campaign";
import { getInteresadosR10 } from "@/app/actions/leads-r10";
import { UserCache } from "@/lib/user-cache";
import DealsR10Client from "./DealsR10Client";

export default async function DealsR10Page() {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/login');

    const user = session.user as any;

    if (!hasCampaignAccess(user.campania, user.role, 'R10')) {
        redirect('/');
    }

    const userName = user.name || user.email || '';
    const userRole = user.role || 'STANDAR';

    const userCache = UserCache.getInstance();
    await userCache.ensureInitialized();
    const inactiveUsers = new Set(
        userCache.getAll()
            .filter((u: any) => (u.get('ESTADO') || '').trim().toUpperCase() === 'INACTIVO')
            .map((u: any) => (u.get('NOMBRES COMPLETOS') || '').trim().toUpperCase())
            .filter(Boolean)
    );

    const initialData = await getInteresadosR10(userName, userRole);

    return (
        <DealsR10Client
            ejecutivo={userName}
            userRole={userRole}
            initialData={initialData}
            inactiveUsers={Array.from(inactiveUsers)}
        />
    );
}