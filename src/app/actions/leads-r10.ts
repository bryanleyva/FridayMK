'use server';

import { doc, loadDoc } from '@/lib/google-sheets';
import { UserCache } from '@/lib/user-cache';



// ============================================
// HELPERS
// ============================================

function getPeruTimestamp(): string {
    const now = new Date();
    const peruTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Lima' }));
    const day = String(peruTime.getDate()).padStart(2, '0');
    const month = String(peruTime.getMonth() + 1).padStart(2, '0');
    const year = peruTime.getFullYear();
    const hours = String(peruTime.getHours()).padStart(2, '0');
    const minutes = String(peruTime.getMinutes()).padStart(2, '0');
    const seconds = String(peruTime.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
}

async function getNextId(sheetTitle: string): Promise<number> {
    const sheet = doc.sheetsByTitle[sheetTitle];
    if (!sheet) return 1;
    const rows = await sheet.getRows();
    const ids = rows.map(r => parseInt(r.get('ID'))).filter(n => !isNaN(n));
    return ids.length > 0 ? Math.max(...ids) + 1 : 1;
}

async function getNextVentaId(sheetTitle: string): Promise<number> {
    const sheet = doc.sheetsByTitle[sheetTitle];
    if (!sheet) return 1;
    const rows = await sheet.getRows();
    const ids = rows.map(r => parseInt(r.get('VENTA_ID'))).filter(n => !isNaN(n));
    return ids.length > 0 ? Math.max(...ids) + 1 : 1;
}

/**
 * Asegura que la hoja tenga todas las columnas requeridas en su cabecera.
 * Si falta alguna, la agrega al final con setHeaderRow (sin eliminar las existentes).
 * Necesario porque google-spreadsheet ignora silenciosamente row.set('X', v) si X
 * no está en los headers, lo que provoca que datos como MOTIVO_RECHAZO no se persistan.
 */
async function ensureHeaders(sheet: any, requiredHeaders: string[]): Promise<void> {
    try {
        await sheet.loadHeaderRow();
    } catch {
        // Si no hay header todavía
    }
    const current: string[] = sheet.headerValues || [];
    const missing = requiredHeaders.filter(h => !current.includes(h));
    if (missing.length === 0) return;

    const newHeaders = [...current, ...missing];
    const totalCols = newHeaders.length;

    // El grid de Google Sheets tiene un número fijo de columnas; si no alcanza,
    // setHeaderRow tira: "Sheet is not large enough to fit N columns. Resize the sheet first."
    // Por eso resizeamos primero conservando rowCount.
    const currentColCount = (sheet as any).columnCount ?? 0;
    if (currentColCount < totalCols) {
        const currentRowCount = (sheet as any).rowCount ?? 1000;
        console.log(`[ensureHeaders] Resize "${sheet.title}" cols ${currentColCount} -> ${totalCols}`);
        await sheet.resize({ rowCount: currentRowCount, columnCount: totalCols });
    }

    console.log(`[ensureHeaders] Agregando columnas faltantes a "${sheet.title}":`, missing);
    await sheet.setHeaderRow(newHeaders);
}

/**
 * Headers esperados por cada hoja R10. Centralizados para que ensureSheet/ensureHeaders
 * puedan crear o reparar la estructura sin que nadie tenga que tocar el Google Sheets.
 */
const SHEET_HEADERS_R10: Record<string, string[]> = {
    INTERESADOS_R10: [
        'ID', 'VENTA_ID', 'LINEA_NUM', 'FECHA_INGRESO',
        'EJECUTIVO', 'SUPERVISOR', 'CAMPAÑA', 'ESTADO',
        'CANAL_VENTA', 'RUC_DNI', 'TIPO_INGRESO', 'NOMBRES_APELLIDOS',
        'FECHA_NACIMIENTO', 'ESTADO_CIVIL', 'DISTRITO_NACIMIENTO',
        'NOMBRE_PAPA', 'NOMBRE_MAMA', 'CORREO',
        'TIPO_VENTA', 'NUMERO_PORTAR', 'OPERADOR_ACTUAL', 'MODALIDAD_OPERADOR',
        'PLAN', 'PROMOCION_BRINDADA', 'OBSERVACION',
    ],
    INGRESADOS_R10: [
        'ID', 'VENTA_ID', 'LINEA_NUM', 'FECHA_INGRESO', 'FECHA_CIERRE',
        'EJECUTIVO', 'SUPERVISOR', 'CAMPAÑA', 'ESTADO', 'CANAL_VENTA',
        'RUC_DNI', 'TIPO_INGRESO', 'NOMBRES_APELLIDOS', 'FECHA_NACIMIENTO',
        'ESTADO_CIVIL', 'DISTRITO_NACIMIENTO', 'NOMBRE_PAPA', 'NOMBRE_MAMA',
        'CORREO', 'TIPO_VENTA', 'NUMERO_PORTAR', 'OPERADOR_ACTUAL',
        'MODALIDAD_OPERADOR', 'PLAN', 'PROMOCION_BRINDADA', 'TIPO_ENTREGA',
        'NUMERO_CONTACTO', 'DIRECCION_ENTREGA', 'REFERENCIA_ENTREGA',
        'COORDENADAS', 'TIPO_ENVIO', 'FECHA_ENVIO', 'RANGO_ENVIO',
        'PDV_TIENDA', 'OBSERVACION', 'FECHA_ACTIVACION',
        'MESA_CONTROL_ASIGNADO', 'OBSERVACION_BO', 'MOTIVO_RECHAZO',
    ],
    PROSPECTOS_CAIDOS_R10: [
        'ID', 'VENTA_ID', 'FECHA_CAIDA', 'EJECUTIVO', 'SUPERVISOR',
        'CAMPAÑA', 'RUC_DNI', 'NOMBRES_APELLIDOS', 'TIPO_VENTA',
        'PLAN', 'MOTIVO', 'OBSERVACION',
    ],
    BASE_R10: [
        'ID', 'DNI', 'NOMBRES_COMPLETOS', 'TELEFONO', 'CORREO',
        'DEPARTAMENTO', 'PROVINCIA', 'DISTRITO', 'LINEAS_ACTUALES', 'OPERADOR_ACTUAL',
        'ESTADO', 'EJECUTIVO', 'SUPERVISOR', 'FECHA_CARGA', 'FECHA_ASIGNACION', 'CAMPAÑA',
    ],
};

/**
 * Asegura que la hoja exista. Si no existe la crea con sus headers.
 * Si existe, se asegura de que tenga todas las columnas requeridas.
 * Devuelve siempre la hoja lista para usar.
 */
async function ensureSheet(title: keyof typeof SHEET_HEADERS_R10): Promise<any> {
    const headers = SHEET_HEADERS_R10[title];
    let sheet = doc.sheetsByTitle[title];
    if (!sheet) {
        console.log(`[ensureSheet] Creando hoja "${title}"`);
        sheet = await doc.addSheet({ title, headerValues: headers });
        return sheet;
    }
    await ensureHeaders(sheet, headers);
    return sheet;
}

// ============================================
// TIPOS
// ============================================

export interface LineaVentaR10 {
    tipoVenta: 'PORTABILIDAD' | 'ALTA';
    numeroPortar?: string;
    operadorActual?: string;
    modalidadOperador?: 'POSTPAGO' | 'PREPAGO';
    plan: string;
    promocionBrindada: string;
}

export interface VentaR10Input {
    canalVenta: string;
    canalVentaOtro?: string;
    rucDni: string;
    tipoIngreso: string;
    nombresApellidos: string;
    fechaNacimiento: string;
    estadoCivil: string;
    estadoCivilOtro?: string;
    distritoNacimiento: string;
    nombrePapa: string;
    nombreMama: string;
    correo: string;
    lineas: LineaVentaR10[];
    observacion?: string;
}

export interface CulminarVentaInput {
    tipoEntrega: 'DELIVERY' | 'RETIRO_EN_TIENDA';
    numeroContacto?: string;
    direccionEntrega?: string;
    referenciaEntrega?: string;
    coordenadas?: string;
    tipoEnvio?: 'EXPRESS' | 'REGULAR';
    fechaEnvio?: string;
    rangoEnvio?: '9 AM - 1 PM' | '2 PM - 8 PM';
    pdvTienda?: string;
}

// ============================================
// ETAPA 1: CREAR INTERESADO
// ============================================

export async function saveInteresadoR10(data: VentaR10Input, ejecutivo: string) {
    try {
        await loadDoc();
        const sheet = await ensureSheet('INTERESADOS_R10');
        if (!data.lineas || data.lineas.length === 0) {
            return { success: false, error: 'Debe agregar al menos una línea' };
        }

        const userCache = UserCache.getInstance();
        await userCache.ensureInitialized();
        const supervisor = userCache.getSupervisorForUser(ejecutivo);

        const ventaId = await getNextVentaId('INTERESADOS_R10');
        let nextRowId = await getNextId('INTERESADOS_R10');
        const fechaIngreso = getPeruTimestamp();
        const canalFinal = data.canalVenta === 'Otros' && data.canalVentaOtro ? data.canalVentaOtro : data.canalVenta;
        const estadoCivilFinal = data.estadoCivil === 'Otros' && data.estadoCivilOtro ? data.estadoCivilOtro : data.estadoCivil;

        for (let i = 0; i < data.lineas.length; i++) {
            const linea = data.lineas[i];
            await sheet.addRow({
                'ID': String(nextRowId),
                'VENTA_ID': String(ventaId),
                'LINEA_NUM': String(i + 1),
                'FECHA_INGRESO': fechaIngreso,
                'EJECUTIVO': ejecutivo,
                'SUPERVISOR': supervisor,
                'CAMPAÑA': 'R10',
                'ESTADO': 'INTERESADO',
                'CANAL_VENTA': canalFinal,
                'RUC_DNI': data.rucDni,
                'TIPO_INGRESO': data.tipoIngreso,
                'NOMBRES_APELLIDOS': data.nombresApellidos,
                'FECHA_NACIMIENTO': data.fechaNacimiento,
                'ESTADO_CIVIL': estadoCivilFinal,
                'DISTRITO_NACIMIENTO': data.distritoNacimiento,
                'NOMBRE_PAPA': data.nombrePapa,
                'NOMBRE_MAMA': data.nombreMama,
                'CORREO': data.correo,
                'TIPO_VENTA': linea.tipoVenta,
                'NUMERO_PORTAR': linea.numeroPortar || '',
                'OPERADOR_ACTUAL': linea.operadorActual || '',
                'MODALIDAD_OPERADOR': linea.modalidadOperador || '',
                'PLAN': linea.plan,
                'PROMOCION_BRINDADA': linea.promocionBrindada,
                'OBSERVACION': data.observacion || '',
            } as any);
            nextRowId++;
        }

        return { success: true, ventaId };
    } catch (error: any) {
        console.error('Error en saveInteresadoR10:', error);
        return { success: false, error: error.message || 'Error al guardar' };
    }
}

// ============================================
// LISTAR INTERESADOS (pipeline deals)
// ============================================

export async function getInteresadosR10(
    userName: string,
    userRole: string,
    filters?: { startDate?: string; endDate?: string }
) {
    try {
        await loadDoc();
        const sheet = doc.sheetsByTitle['INTERESADOS_R10'];
        if (!sheet) return [];

        const rows = await sheet.getRows();
        let filtered = rows;

        if (userRole !== 'ADMIN') {
            const normUser = userName.toLowerCase().trim();
            if (userRole === 'SPECIAL') {
                const userCache = UserCache.getInstance();
                await userCache.ensureInitialized();
                const team = userCache.getTeamForSupervisor(userName);
                const teamNames = new Set(team.map(u => (u.get('NOMBRES COMPLETOS') || '').toLowerCase().trim()));
                teamNames.add(normUser);
                filtered = rows.filter(r => teamNames.has((r.get('EJECUTIVO') || '').toLowerCase().trim()));
            } else {
                filtered = rows.filter(r => (r.get('EJECUTIVO') || '').toLowerCase().trim() === normUser);
            }
        }

        if (filters?.startDate || filters?.endDate) {
            filtered = filtered.filter(r => {
                const dateStr = r.get('FECHA_INGRESO');
                if (!dateStr) return false;
                const [d, m, y] = dateStr.split(',')[0].split('/').map(Number);
                const rowDate = new Date(y, m - 1, d);
                if (filters.startDate) {
                    const [sy, sm, sd] = filters.startDate.split('-').map(Number);
                    if (rowDate < new Date(sy, sm - 1, sd)) return false;
                }
                if (filters.endDate) {
                    const [ey, em, ed] = filters.endDate.split('-').map(Number);
                    if (rowDate > new Date(ey, em - 1, ed)) return false;
                }
                return true;
            });
        }

        const byVentaId: Record<string, any[]> = {};
        for (const row of filtered) {
            const vid = row.get('VENTA_ID') || '';
            if (!byVentaId[vid]) byVentaId[vid] = [];
            byVentaId[vid].push(row);
        }

        const cards = Object.entries(byVentaId).map(([vid, lines]) => {
            const first = lines[0];
            return {
                ventaId: vid,
                ejecutivo: first.get('EJECUTIVO'),
                supervisor: first.get('SUPERVISOR'),
                fechaIngreso: first.get('FECHA_INGRESO'),
                estado: first.get('ESTADO'),
                canalVenta: first.get('CANAL_VENTA'),
                rucDni: first.get('RUC_DNI'),
                tipoIngreso: first.get('TIPO_INGRESO'),
                nombresApellidos: first.get('NOMBRES_APELLIDOS'),
                fechaNacimiento: first.get('FECHA_NACIMIENTO'),
                estadoCivil: first.get('ESTADO_CIVIL'),
                distritoNacimiento: first.get('DISTRITO_NACIMIENTO'),
                nombrePapa: first.get('NOMBRE_PAPA'),
                nombreMama: first.get('NOMBRE_MAMA'),
                correo: first.get('CORREO'),
                observacion: first.get('OBSERVACION'),
                cantidadLineas: lines.length,
                lineas: lines.map(l => ({
                    lineaNum: l.get('LINEA_NUM'),
                    tipoVenta: l.get('TIPO_VENTA'),
                    numeroPortar: l.get('NUMERO_PORTAR'),
                    operadorActual: l.get('OPERADOR_ACTUAL'),
                    modalidadOperador: l.get('MODALIDAD_OPERADOR'),
                    plan: l.get('PLAN'),
                    promocionBrindada: l.get('PROMOCION_BRINDADA'),
                })),
            };
        });

        cards.sort((a, b) => Number(b.ventaId) - Number(a.ventaId));
        return cards;
    } catch (error) {
        console.error('Error en getInteresadosR10:', error);
        return [];
    }
}

// ============================================
// LISTAR INGRESADOS (con filtro por estado)
// ============================================

export async function getIngresadosR10(
    userName: string,
    userRole: string,
    filters?: { startDate?: string; endDate?: string; search?: string; estado?: string; scope?: 'mine' | 'team' | 'all' }
) {
    try {
        await loadDoc();
        const sheet = doc.sheetsByTitle['INGRESADOS_R10'];
        if (!sheet) return [];

        const rows = await sheet.getRows();
        let filtered = rows;

        // Scope (mine/team/all) tiene prioridad sobre el rol
        const scope = filters?.scope;
        if (scope === 'all' || userRole === 'ADMIN' || (userRole === 'BACKOFFICE' && !scope)) {
            // Ve todo
        } else if (scope === 'team' || userRole === 'SPECIAL') {
            const userCache = UserCache.getInstance();
            await userCache.ensureInitialized();
            const team = userCache.getTeamForSupervisor(userName);
            const teamNames = new Set(team.map(u => (u.get('NOMBRES COMPLETOS') || '').toLowerCase().trim()));
            teamNames.add(userName.toLowerCase().trim());
            filtered = rows.filter(r => teamNames.has((r.get('EJECUTIVO') || '').toLowerCase().trim()));
        } else {
            // STANDAR o scope='mine': solo lo suyo
            const normUser = userName.toLowerCase().trim();
            filtered = rows.filter(r => (r.get('EJECUTIVO') || '').toLowerCase().trim() === normUser);
        }

        // Filtro por estado (si aplica)
        if (filters?.estado && filters.estado !== 'TODOS') {
            filtered = filtered.filter(r => (r.get('ESTADO') || '').toUpperCase().trim() === filters.estado);
        }

        // Filtro por fecha de cierre
        if (filters?.startDate || filters?.endDate) {
            filtered = filtered.filter(r => {
                const dateStr = r.get('FECHA_CIERRE');
                if (!dateStr) return false;
                const [d, m, y] = dateStr.split(',')[0].split('/').map(Number);
                const rowDate = new Date(y, m - 1, d);
                if (filters.startDate) {
                    const [sy, sm, sd] = filters.startDate.split('-').map(Number);
                    if (rowDate < new Date(sy, sm - 1, sd)) return false;
                }
                if (filters.endDate) {
                    const [ey, em, ed] = filters.endDate.split('-').map(Number);
                    if (rowDate > new Date(ey, em - 1, ed)) return false;
                }
                return true;
            });
        }

        if (filters?.search) {
            const s = filters.search.toLowerCase().trim();
            filtered = filtered.filter(r => {
                const ruc = (r.get('RUC_DNI') || '').toLowerCase();
                const nombre = (r.get('NOMBRES_APELLIDOS') || '').toLowerCase();
                return ruc.includes(s) || nombre.includes(s);
            });
        }

        // Agrupar por VENTA_ID
        const byVentaId: Record<string, any[]> = {};
        for (const row of filtered) {
            const vid = row.get('VENTA_ID') || '';
            if (!byVentaId[vid]) byVentaId[vid] = [];
            byVentaId[vid].push(row);
        }

        const ingresos = Object.entries(byVentaId).map(([vid, lines]) => {
            const first = lines[0];
            return {
                ventaId: vid,
                ejecutivo: first.get('EJECUTIVO'),
                supervisor: first.get('SUPERVISOR'),
                fechaIngreso: first.get('FECHA_INGRESO'),
                fechaCierre: first.get('FECHA_CIERRE'),
                fechaActivacion: first.get('FECHA_ACTIVACION'),
                estado: first.get('ESTADO'),
                canalVenta: first.get('CANAL_VENTA'),
                rucDni: first.get('RUC_DNI'),
                tipoIngreso: first.get('TIPO_INGRESO'),
                nombresApellidos: first.get('NOMBRES_APELLIDOS'),
                fechaNacimiento: first.get('FECHA_NACIMIENTO'),
                estadoCivil: first.get('ESTADO_CIVIL'),
                distritoNacimiento: first.get('DISTRITO_NACIMIENTO'),
                nombrePapa: first.get('NOMBRE_PAPA'),
                nombreMama: first.get('NOMBRE_MAMA'),
                correo: first.get('CORREO'),
                tipoEntrega: first.get('TIPO_ENTREGA'),
                numeroContacto: first.get('NUMERO_CONTACTO'),
                direccionEntrega: first.get('DIRECCION_ENTREGA'),
                referenciaEntrega: first.get('REFERENCIA_ENTREGA'),
                coordenadas: first.get('COORDENADAS'),
                tipoEnvio: first.get('TIPO_ENVIO'),
                fechaEnvio: first.get('FECHA_ENVIO'),
                rangoEnvio: first.get('RANGO_ENVIO'),
                pdvTienda: first.get('PDV_TIENDA'),
                mesaControlAsignado: first.get('MESA_CONTROL_ASIGNADO'),
                observacionBo: first.get('OBSERVACION_BO'),
                motivoRechazo: first.get('MOTIVO_RECHAZO'),
                observacion: first.get('OBSERVACION'),
                cantidadLineas: lines.length,
                lineas: lines.map(l => ({
                    lineaNum: l.get('LINEA_NUM'),
                    tipoVenta: l.get('TIPO_VENTA'),
                    numeroPortar: l.get('NUMERO_PORTAR'),
                    operadorActual: l.get('OPERADOR_ACTUAL'),
                    modalidadOperador: l.get('MODALIDAD_OPERADOR'),
                    plan: l.get('PLAN'),
                    promocionBrindada: l.get('PROMOCION_BRINDADA'),
                })),
            };
        });

        ingresos.sort((a, b) => Number(b.ventaId) - Number(a.ventaId));
        return ingresos;
    } catch (error) {
        console.error('Error en getIngresadosR10:', error);
        return [];
    }
}

// ============================================
// ETAPA 2a: CULMINAR VENTA (ahora en PENDIENTE)
// ============================================

export async function culminarVentaR10(ventaId: string, data: CulminarVentaInput) {
    try {
        await loadDoc();
        const interesadosSheet = await ensureSheet('INTERESADOS_R10');
        const ingresadosSheet = await ensureSheet('INGRESADOS_R10');

        const interesadosRows = await interesadosSheet.getRows();
        const lineas = interesadosRows.filter((r: any) => r.get('VENTA_ID') === ventaId && r.get('ESTADO') === 'INTERESADO');

        if (lineas.length === 0) {
            return { success: false, error: 'Venta no encontrada o ya procesada' };
        }

        const fechaCierre = getPeruTimestamp();
        let nextIngresadosId = await getNextId('INGRESADOS_R10');

        for (const linea of lineas) {
            await ingresadosSheet.addRow({
                'ID': String(nextIngresadosId),
                'VENTA_ID': ventaId,
                'LINEA_NUM': linea.get('LINEA_NUM'),
                'FECHA_INGRESO': linea.get('FECHA_INGRESO'),
                'FECHA_CIERRE': fechaCierre,
                'EJECUTIVO': linea.get('EJECUTIVO'),
                'SUPERVISOR': linea.get('SUPERVISOR'),
                'CAMPAÑA': 'R10',
                'ESTADO': 'PENDIENTE',
                'CANAL_VENTA': linea.get('CANAL_VENTA'),
                'RUC_DNI': linea.get('RUC_DNI'),
                'TIPO_INGRESO': linea.get('TIPO_INGRESO'),
                'NOMBRES_APELLIDOS': linea.get('NOMBRES_APELLIDOS'),
                'FECHA_NACIMIENTO': linea.get('FECHA_NACIMIENTO'),
                'ESTADO_CIVIL': linea.get('ESTADO_CIVIL'),
                'DISTRITO_NACIMIENTO': linea.get('DISTRITO_NACIMIENTO'),
                'NOMBRE_PAPA': linea.get('NOMBRE_PAPA'),
                'NOMBRE_MAMA': linea.get('NOMBRE_MAMA'),
                'CORREO': linea.get('CORREO'),
                'TIPO_VENTA': linea.get('TIPO_VENTA'),
                'NUMERO_PORTAR': linea.get('NUMERO_PORTAR'),
                'OPERADOR_ACTUAL': linea.get('OPERADOR_ACTUAL'),
                'MODALIDAD_OPERADOR': linea.get('MODALIDAD_OPERADOR'),
                'PLAN': linea.get('PLAN'),
                'PROMOCION_BRINDADA': linea.get('PROMOCION_BRINDADA'),
                'TIPO_ENTREGA': data.tipoEntrega,
                'NUMERO_CONTACTO': data.numeroContacto || '',
                'DIRECCION_ENTREGA': data.direccionEntrega || '',
                'REFERENCIA_ENTREGA': data.referenciaEntrega || '',
                'COORDENADAS': data.coordenadas || '',
                'TIPO_ENVIO': data.tipoEnvio || '',
                'FECHA_ENVIO': data.fechaEnvio || '',
                'RANGO_ENVIO': data.rangoEnvio || '',
                'PDV_TIENDA': data.pdvTienda || '',
                'OBSERVACION': linea.get('OBSERVACION'),
                'FECHA_ACTIVACION': '',
                'MESA_CONTROL_ASIGNADO': '',
                'OBSERVACION_BO': '',
                'MOTIVO_RECHAZO': '',
            } as any);
            nextIngresadosId++;
        }

        for (const linea of lineas) {
            linea.set('ESTADO', 'CERRADO');
            await linea.save();
        }

        return { success: true };
    } catch (error: any) {
        console.error('Error en culminarVentaR10:', error);
        return { success: false, error: error.message || 'Error al culminar venta' };
    }
}

// ============================================
// ETAPA 2b: DAR DE BAJA
// ============================================

export async function saveDroppedR10(ventaId: string, motivo: string, observacion: string) {
    try {
        await loadDoc();
        const interesadosSheet = await ensureSheet('INTERESADOS_R10');
        const caidosSheet = await ensureSheet('PROSPECTOS_CAIDOS_R10');

        const interesadosRows = await interesadosSheet.getRows();
        const lineas = interesadosRows.filter((r: any) => r.get('VENTA_ID') === ventaId && r.get('ESTADO') === 'INTERESADO');

        if (lineas.length === 0) {
            return { success: false, error: 'Venta no encontrada o ya procesada' };
        }

        const fechaCaida = getPeruTimestamp();
        let nextCaidosId = await getNextId('PROSPECTOS_CAIDOS_R10');
        const first = lineas[0];

        await caidosSheet.addRow({
            'ID': String(nextCaidosId),
            'VENTA_ID': ventaId,
            'FECHA_CAIDA': fechaCaida,
            'EJECUTIVO': first.get('EJECUTIVO'),
            'SUPERVISOR': first.get('SUPERVISOR'),
            'CAMPAÑA': 'R10',
            'RUC_DNI': first.get('RUC_DNI'),
            'NOMBRES_APELLIDOS': first.get('NOMBRES_APELLIDOS'),
            'TIPO_VENTA': lineas.map(l => l.get('TIPO_VENTA')).join(' / '),
            'PLAN': lineas.map(l => l.get('PLAN')).join(' / '),
            'MOTIVO': motivo,
            'OBSERVACION': observacion,
        } as any);

        for (const linea of lineas) {
            linea.set('ESTADO', 'CAIDO');
            await linea.save();
        }

        return { success: true };
    } catch (error: any) {
        console.error('Error en saveDroppedR10:', error);
        return { success: false, error: error.message || 'Error al dar de baja' };
    }
}

// ============================================
// MESA DE CONTROL: Cambiar estado de venta
// ============================================

export async function updateEstadoIngresadoR10(
    ventaId: string,
    nuevoEstado: 'ACTIVO' | 'RECHAZADO' | 'PENDIENTE',
    backofficeUser: string,
    observacion?: string,
    motivoRechazo?: string
) {
    try {
        await loadDoc();
        const sheet = await ensureSheet('INGRESADOS_R10');

        const rows = await sheet.getRows();
        const lineas = rows.filter(r => r.get('VENTA_ID') === ventaId);

        if (lineas.length === 0) {
            return { success: false, error: 'Venta no encontrada' };
        }

        const fechaActivacion = nuevoEstado === 'ACTIVO' ? getPeruTimestamp() : '';
        let lineasActualizadas = 0;

        for (const linea of lineas) {
            linea.set('ESTADO', nuevoEstado);
            linea.set('MESA_CONTROL_ASIGNADO', backofficeUser);
            if (observacion !== undefined) linea.set('OBSERVACION_BO', observacion);
            if (nuevoEstado === 'RECHAZADO') {
                // Siempre setear (aunque sea string vacío) para limpiar valor previo si se cambió de estado
                linea.set('MOTIVO_RECHAZO', motivoRechazo || '');
            }
            if (nuevoEstado === 'ACTIVO') linea.set('FECHA_ACTIVACION', fechaActivacion);
            await linea.save();
            lineasActualizadas++;
        }

        console.log(`[updateEstadoIngresadoR10] venta=${ventaId} estado=${nuevoEstado} motivo="${motivoRechazo || ''}" lineas=${lineasActualizadas}`);

        return { success: true };
    } catch (error: any) {
        console.error('Error en updateEstadoIngresadoR10:', error);
        return { success: false, error: error.message || 'Error al actualizar estado' };
    }
}

// ============================================
// BASE R10: Upload Excel → BASE_R10 sheet
// ============================================

export async function uploadBaseR10Excel(base64: string): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
        await loadDoc();
        const sheet = await ensureSheet('BASE_R10');

        const ExcelJS = (await import('exceljs')).default;
        const workbook = new ExcelJS.Workbook();
        const buffer = Buffer.from(base64, 'base64');
        await workbook.xlsx.load(buffer as any);

        const worksheet = workbook.worksheets[0];
        if (!worksheet) return { success: false, error: 'El archivo no tiene hojas' };

        // Build header → column index map (from row 1)
        const colMap: Record<string, number> = {};
        worksheet.getRow(1).eachCell((cell, colNum) => {
            const key = String(cell.value || '').trim().toUpperCase().replace(/\s+/g, '_').replace(/[ÁÀÂÄ]/g, 'A').replace(/[ÉÈÊË]/g, 'E').replace(/[ÍÌÎÏ]/g, 'I').replace(/[ÓÒÔÖ]/g, 'O').replace(/[ÚÙÛÜ]/g, 'U');
            colMap[key] = colNum;
        });

        // Convierte cualquier valor que devuelva ExcelJS (string, número, hyperlink, richText, fórmula) a texto plano.
        // Sin esto, los correos que vienen como hipervínculo (mailto:) se guardan como "[object Object]".
        const cellToText = (cell: any): string => {
            if (!cell) return '';
            if (typeof cell.text === 'string' && cell.text.trim()) return cell.text.trim();
            const v = cell.value;
            if (v === null || v === undefined) return '';
            if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v).trim();
            if (typeof v === 'object') {
                if (typeof (v as any).text === 'string') return String((v as any).text).trim();
                if (Array.isArray((v as any).richText)) return (v as any).richText.map((t: any) => t.text || '').join('').trim();
                if ((v as any).result !== undefined) return String((v as any).result).trim();
                if (typeof (v as any).hyperlink === 'string') return String((v as any).hyperlink).replace(/^mailto:/i, '').trim();
            }
            return String(v).trim();
        };

        const getCol = (row: any, aliases: string[]): string => {
            for (const alias of aliases) {
                const ci = colMap[alias];
                if (ci) {
                    const text = cellToText(row.getCell(ci));
                    if (text) return text;
                }
            }
            return '';
        };

        const existingRows = await sheet.getRows();
        const existingIds = existingRows.map(r => parseInt(r.get('ID') || '0')).filter(n => !isNaN(n) && n > 0);
        let nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;

        const fechaCarga = getPeruTimestamp();
        let count = 0;

        const toAdd: any[] = [];
        worksheet.eachRow((row, rowNum) => {
            if (rowNum === 1) return;
            const dni = getCol(row, ['DNI']);
            const nombre = getCol(row, ['NOMBRES_COMPLETOS', 'NOMBRES COMPLETOS', 'NOMBRE_COMPLETO', 'NOMBRE', 'NOMBRES']);
            if (!dni && !nombre) return;
            toAdd.push({
                'ID': String(nextId++),
                'DNI': dni,
                'NOMBRES_COMPLETOS': nombre,
                'TELEFONO': getCol(row, ['TELEFONO', 'TELÉFONO', 'CELULAR', 'MOVIL']),
                'CORREO': getCol(row, ['CORREO', 'EMAIL', 'CORREO_ELECTRONICO', 'CORREO ELECTRONICO']),
                'DEPARTAMENTO': getCol(row, ['DEPARTAMENTO']),
                'PROVINCIA': getCol(row, ['PROVINCIA']),
                'DISTRITO': getCol(row, ['DISTRITO']),
                'LINEAS_ACTUALES': getCol(row, ['LINEAS_ACTUALES', 'LINEAS ACTUALES', 'LINEAS', 'CANTIDAD_LINEAS']),
                'OPERADOR_ACTUAL': getCol(row, ['OPERADOR_ACTUAL', 'OPERADOR ACTUAL', 'OPERADOR']),
                'ESTADO': 'LIBRE',
                'EJECUTIVO': '',
                'SUPERVISOR': '',
                'FECHA_CARGA': fechaCarga,
                'FECHA_ASIGNACION': '',
                'CAMPAÑA': 'R10',
            });
            count++;
        });

        for (const row of toAdd) {
            await sheet.addRow(row as any);
        }

        return { success: true, count };
    } catch (error: any) {
        console.error('Error en uploadBaseR10Excel:', error);
        return { success: false, error: error.message || 'Error al procesar el archivo' };
    }
}

// ============================================
// BASE R10: Leer leads libres (para asignar)
// ============================================

export async function getBaseLibreR10(userName: string, userRole: string) {
    try {
        await loadDoc();
        const sheet = doc.sheetsByTitle['BASE_R10'];
        if (!sheet) return [];

        const rows = await sheet.getRows();
        return rows
            .filter(r => (r.get('ESTADO') || '').trim() === 'LIBRE')
            .map(r => ({
                id: r.get('ID') || '',
                dni: r.get('DNI') || '',
                nombre: r.get('NOMBRES_COMPLETOS') || '',
                telefono: r.get('TELEFONO') || '',
                correo: r.get('CORREO') || '',
                departamento: r.get('DEPARTAMENTO') || '',
                provincia: r.get('PROVINCIA') || '',
                distrito: r.get('DISTRITO') || '',
                lineasActuales: r.get('LINEAS_ACTUALES') || '',
                operadorActual: r.get('OPERADOR_ACTUAL') || '',
                estado: 'LIBRE',
                fechaCarga: r.get('FECHA_CARGA') || '',
            }));
    } catch (error) {
        console.error('Error en getBaseLibreR10:', error);
        return [];
    }
}

// ============================================
// BASE R10: Asignar leads a ejecutivo
// ============================================

export async function asignarLeadsR10(ids: string[], ejecutivo: string, supervisor: string): Promise<{ success: boolean; error?: string }> {
    try {
        await loadDoc();
        const sheet = await ensureSheet('BASE_R10');

        // Resolver el "ejecutivo" recibido a su NOMBRE COMPLETO (lo que NextAuth pone en session.user.name).
        // Si llega el USER de login (legacy), buscamos el nombre real en UserCache para mantener consistencia
        // con el resto del código (getMiBaseR10, INTERESADOS_R10, etc. siempre usan nombre completo).
        const userCache = UserCache.getInstance();
        await userCache.ensureInitialized();
        const allUsersRows = userCache.getAll();
        const normEjecutivo = (ejecutivo || '').trim().toLowerCase();
        const matched = allUsersRows.find(r =>
            (r.get('NOMBRES COMPLETOS') || '').trim().toLowerCase() === normEjecutivo ||
            (r.get('USER') || '').trim().toLowerCase() === normEjecutivo
        );
        const ejecutivoNombreCompleto = matched
            ? (matched.get('NOMBRES COMPLETOS') || ejecutivo)
            : ejecutivo;

        const rows = await sheet.getRows();
        const fechaAsignacion = getPeruTimestamp();

        for (const id of ids) {
            const row = rows.find(r => r.get('ID') === id && r.get('ESTADO') === 'LIBRE');
            if (row) {
                row.set('ESTADO', 'ASIGNADO');
                row.set('EJECUTIVO', ejecutivoNombreCompleto);
                row.set('SUPERVISOR', supervisor);
                row.set('FECHA_ASIGNACION', fechaAsignacion);
                await row.save();
            }
        }

        console.log(`[asignarLeadsR10] ${ids.length} leads -> "${ejecutivoNombreCompleto}" (entrada: "${ejecutivo}")`);
        return { success: true };
    } catch (error: any) {
        console.error('Error en asignarLeadsR10:', error);
        return { success: false, error: error.message || 'Error al asignar' };
    }
}

// ============================================
// BASE R10: Leads del ejecutivo (mi base)
// ============================================

export async function getMiBaseR10(userName: string) {
    try {
        await loadDoc();
        const sheet = doc.sheetsByTitle['BASE_R10'];
        if (!sheet) return [];

        const rows = await sheet.getRows();
        const normUser = (userName || '').toLowerCase().trim();

        // Tolerar leads asignados con USER (login) en lugar de NOMBRES COMPLETOS:
        // construimos un set con ambos identificadores del usuario actual.
        const userCache = UserCache.getInstance();
        await userCache.ensureInitialized();
        const userRow = userCache.findUser(userName);
        const identifiers = new Set<string>([normUser]);
        if (userRow) {
            identifiers.add(((userRow as any).get('USER') || '').toLowerCase().trim());
            identifiers.add(((userRow as any).get('NOMBRES COMPLETOS') || '').toLowerCase().trim());
        }
        identifiers.delete('');

        return rows
            .filter(r => identifiers.has((r.get('EJECUTIVO') || '').toLowerCase().trim()) && r.get('ESTADO') === 'ASIGNADO')
            .map(r => ({
                id: r.get('ID') || '',
                dni: r.get('DNI') || '',
                nombre: r.get('NOMBRES_COMPLETOS') || '',
                telefono: r.get('TELEFONO') || '',
                correo: r.get('CORREO') || '',
                departamento: r.get('DEPARTAMENTO') || '',
                provincia: r.get('PROVINCIA') || '',
                distrito: r.get('DISTRITO') || '',
                lineasActuales: r.get('LINEAS_ACTUALES') || '',
                operadorActual: r.get('OPERADOR_ACTUAL') || '',
                estado: r.get('ESTADO') || '',
                fechaAsignacion: r.get('FECHA_ASIGNACION') || '',
            }));
    } catch (error) {
        console.error('Error en getMiBaseR10:', error);
        return [];
    }
}

// ============================================
// BASE R10: Marcar como gestionado
// ============================================

export async function marcarGestionadoR10(id: string, nuevoEstado: string = 'GESTIONADO'): Promise<{ success: boolean; error?: string }> {
    try {
        await loadDoc();
        const sheet = await ensureSheet('BASE_R10');

        const rows = await sheet.getRows();
        const row = rows.find((r: any) => r.get('ID') === id);
        if (!row) return { success: false, error: 'Lead no encontrado' };

        row.set('ESTADO', nuevoEstado);
        await row.save();
        return { success: true };
    } catch (error: any) {
        console.error('Error en marcarGestionadoR10:', error);
        return { success: false, error: error.message || 'Error' };
    }
}

/**
 * Marca un lead BASE_R10 como NO_INTERESADO (botón "No interesado" en modo llamada).
 * Igual que GESTIONADO en cuanto a flujo: lo saca de "Mi base" del ejecutivo.
 */
export async function marcarNoInteresadoR10(id: string): Promise<{ success: boolean; error?: string }> {
    return marcarGestionadoR10(id, 'NO_INTERESADO');
}