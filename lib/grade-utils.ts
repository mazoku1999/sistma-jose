/**
 * Utilidades para el sistema de rangos valorativos del colegio
 *
 * Rangos definidos:
 * - ED (En Desarrollo): 1 a 50
 * - DA (Desarrollo Aceptable): 51 a 68
 * - DO (Desarrollo Óptimo): 69 a 84
 * - DP (Desarrollo Pleno): 85 a 100
 */

export type GradeRange = 'ED' | 'DA' | 'DO' | 'DP';

export interface GradeInfo {
    range: GradeRange;
    min: number;
    max: number;
    label: string;
    description: string;
}

/**
 * Definición de los rangos valorativos
 */
export const GRADE_RANGES: Record<GradeRange, GradeInfo> = {
    ED: {
        range: 'ED',
        min: 1,
        max: 50,
        label: 'En Desarrollo',
        description: 'Necesita mejorar significativamente'
    },
    DA: {
        range: 'DA',
        min: 51,
        max: 68,
        label: 'Desarrollo Aceptable',
        description: 'Cumple con los requisitos mínimos'
    },
    DO: {
        range: 'DO',
        min: 69,
        max: 84,
        label: 'Desarrollo Óptimo',
        description: 'Buen desempeño académico'
    },
    DP: {
        range: 'DP',
        min: 85,
        max: 100,
        label: 'Desarrollo Pleno',
        description: 'Excelente desempeño académico'
    }
};

/**
 * Convierte una nota numérica a su rango valorativo correspondiente
 * @param grade Nota numérica (1-100)
 * @returns El rango valorativo correspondiente
 */
export function getGradeRange(grade: number): GradeRange {
    if (grade >= 85) return 'DP';
    if (grade >= 69) return 'DO';
    if (grade >= 51) return 'DA';
    return 'ED';
}

/**
 * Obtiene la información completa del rango para una nota
 * @param grade Nota numérica (1-100)
 * @returns Información completa del rango
 */
export function getGradeInfo(grade: number): GradeInfo {
    const range = getGradeRange(grade);
    return GRADE_RANGES[range];
}

/**
 * Convierte una nota numérica a su representación con rango
 * @param grade Nota numérica (1-100)
 * @returns String con la nota y su rango (ej: "85 (DP)")
 */
export function formatGradeWithRange(grade: number): string {
    const range = getGradeRange(grade);
    return `${grade} (${range})`;
}

/**
 * Valida si una nota está dentro del rango válido (1-100)
 * @param grade Nota a validar
 * @returns true si es válida, false si no
 */
export function isValidGrade(grade: number): boolean {
    return grade >= 1 && grade <= 100 && Number.isInteger(grade);
}

/**
 * Obtiene todas las opciones de rangos para selectores/dropdowns
 * @returns Array de opciones para selectores
 */
export function getGradeRangeOptions(): Array<{ value: GradeRange; label: string; description: string }> {
    return Object.values(GRADE_RANGES).map(range => ({
        value: range.range,
        label: `${range.range} - ${range.label}`,
        description: range.description
    }));
}

/**
 * Convierte un rango a su descripción completa
 * @param range Rango valorativo
 * @returns Descripción completa del rango
 */
export function getRangeDescription(range: GradeRange): string {
    return GRADE_RANGES[range].description;
}

/**
 * Obtiene el color CSS correspondiente a cada rango (útil para UI)
 * @param range Rango valorativo
 * @returns Clase CSS de color
 */
export function getRangeColorClass(range: GradeRange): string {
    switch (range) {
        case 'ED':
            return 'text-red-600 bg-red-50';
        case 'DA':
            return 'text-yellow-600 bg-yellow-50';
        case 'DO':
            return 'text-blue-600 bg-blue-50';
        case 'DP':
            return 'text-green-600 bg-green-50';
        default:
            return 'text-gray-600 bg-gray-50';
    }
}
