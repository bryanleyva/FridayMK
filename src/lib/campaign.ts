// src/lib/campaign.ts

export type Campaign = 'R20' | 'R10';

/**
 * Parsea el string de campaña de un usuario y devuelve un array limpio.
 * Ejemplos:
 *   "R20"        → ['R20']
 *   "R10"        → ['R10']
 *   "R20,R10"    → ['R20', 'R10']
 *   ""           → []
 */
export function parseCampaigns(raw: string | undefined | null): Campaign[] {
    if (!raw) return [];
    return raw
        .split(',')
        .map(c => c.trim().toUpperCase())
        .filter((c): c is Campaign => c === 'R20' || c === 'R10');
}

/**
 * Verifica si un usuario tiene acceso a una campaña específica.
 * ADMIN siempre tiene acceso a todas.
 */
export function hasCampaignAccess(
    userCampaigns: string | undefined,
    userRole: string | undefined,
    target: Campaign
): boolean {
    if (userRole === 'ADMIN') return true;
    const campaigns = parseCampaigns(userCampaigns);
    return campaigns.includes(target);
}

/**
 * Devuelve la lista efectiva de campañas que el usuario puede ver.
 * ADMIN ve todas, el resto solo las suyas.
 */
export function getEffectiveCampaigns(
    userCampaigns: string | undefined,
    userRole: string | undefined
): Campaign[] {
    if (userRole === 'ADMIN') return ['R20', 'R10'];
    return parseCampaigns(userCampaigns);
}

/**
 * Verifica si el usuario tiene acceso a ambas campañas.
 * Útil para mostrar selectores / tabs.
 */
export function hasMultipleCampaigns(
    userCampaigns: string | undefined,
    userRole: string | undefined
): boolean {
    return getEffectiveCampaigns(userCampaigns, userRole).length > 1;
}

/**
 * Devuelve la campaña "por defecto" de un usuario.
 * Si tiene una sola, esa. Si tiene varias, R20 (la principal).
 */
export function getDefaultCampaign(
    userCampaigns: string | undefined,
    userRole: string | undefined
): Campaign | null {
    const list = getEffectiveCampaigns(userCampaigns, userRole);
    if (list.length === 0) return null;
    if (list.includes('R20')) return 'R20';
    return list[0];
}