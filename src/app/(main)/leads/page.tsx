import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasCampaignAccess } from "@/lib/campaign";
import BascontrolContainer from "../../../components/BascontrolContainer";

export default async function BascontrolPage() {
    const session = await getServerSession(authOptions);

    if (!session) redirect('/login');
    if (!session.user) redirect('/login');

    const user = session.user as any;
    const role = user.role;
    const userEmail = user.email || '';
    const userName = user.name || userEmail;

    // Bloquear acceso si no tiene campaña R20
    if (!hasCampaignAccess(user.campania, role, 'R20')) {
        redirect('/');
    }

    return (
        <BascontrolContainer
            userEmail={userEmail}
            userName={userName}
            userRole={role || 'STANDAR'}
            userCargo={user.cargo}
            userSupervisor={user.supervisor}
        />
    );
}