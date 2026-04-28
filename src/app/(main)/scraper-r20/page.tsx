import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/campaign";
import ScraperR20Client from "./ScraperR20Client";

export default async function ScraperR20Page() {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/login');

    const user = session.user as any;

    if (!isAdmin(user.role)) {
        redirect('/');
    }

    return <ScraperR20Client user={user.name || user.email || ''} />;
}