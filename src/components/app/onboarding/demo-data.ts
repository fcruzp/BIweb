// Demo data for new users onboarding
import type { DataPoint } from '@/lib/types'

export interface DemoDataset {
    id: string
    name: string
    description: string
    category: string
    data: DataPoint[]
    columns: string[]
}

export const demoDatasets: DemoDataset[] = [
    {
        id: 'demo-ventas-mensuales',
        name: 'Ventas Mensuales 2024',
        description: 'Datos de ventas mensuales del último año',
        category: 'ventas',
        columns: ['mes', 'ventas', 'objetivo', 'crecimiento'],
        data: [
            { mes: 'Ene', ventas: 45000, objetivo: 50000, crecimiento: 5.2 },
            { mes: 'Feb', ventas: 52000, objetivo: 50000, crecimiento: 15.6 },
            { mes: 'Mar', ventas: 48000, objetivo: 55000, crecimiento: -7.7 },
            { mes: 'Abr', ventas: 61000, objetivo: 55000, crecimiento: 27.1 },
            { mes: 'May', ventas: 58000, objetivo: 60000, crecimiento: -4.9 },
            { mes: 'Jun', ventas: 67000, objetivo: 60000, crecimiento: 15.5 },
            { mes: 'Jul', ventas: 72000, objetivo: 65000, crecimiento: 7.5 },
            { mes: 'Ago', ventas: 69000, objetivo: 65000, crecimiento: -4.2 },
            { mes: 'Sep', ventas: 75000, objetivo: 70000, crecimiento: 8.7 },
            { mes: 'Oct', ventas: 82000, objetivo: 70000, crecimiento: 9.3 },
            { mes: 'Nov', ventas: 91000, objetivo: 75000, crecimiento: 11.0 },
            { mes: 'Dic', ventas: 95000, objetivo: 75000, crecimiento: 4.4 },
        ],
    },
    {
        id: 'demo-distribucion-categoria',
        name: 'Distribución por Categoría',
        description: 'Ventas segmentadas por categoría de producto',
        category: 'ventas',
        columns: ['categoria', 'ventas', 'porcentaje', 'margen'],
        data: [
            { categoria: 'Electrónica', ventas: 280000, porcentaje: 35, margen: 22 },
            { categoria: 'Ropa', ventas: 180000, porcentaje: 22.5, margen: 45 },
            { categoria: 'Hogar', ventas: 120000, porcentaje: 15, margen: 30 },
            { categoria: 'Alimentos', ventas: 96000, porcentaje: 12, margen: 18 },
            { categoria: 'Deportes', ventas: 64000, porcentaje: 8, margen: 35 },
            { categoria: 'Otros', ventas: 60000, porcentaje: 7.5, margen: 25 },
        ],
    },
    {
        id: 'demo-tendencias',
        name: 'Tendencias de Mercado',
        description: 'Indicadores clave de rendimiento trimestral',
        category: 'marketing',
        columns: ['trimestre', 'ingresos', 'gastos', 'beneficio', 'roi'],
        data: [
            { trimestre: 'Q1 2023', ingresos: 150000, gastos: 120000, beneficio: 30000, roi: 25 },
            { trimestre: 'Q2 2023', ingresos: 175000, gastos: 130000, beneficio: 45000, roi: 34.6 },
            { trimestre: 'Q3 2023', ingresos: 190000, gastos: 135000, beneficio: 55000, roi: 40.7 },
            { trimestre: 'Q4 2023', ingresos: 210000, gastos: 140000, beneficio: 70000, roi: 50 },
            { trimestre: 'Q1 2024', ingresos: 195000, gastos: 138000, beneficio: 57000, roi: 41.3 },
            { trimestre: 'Q2 2024', ingresos: 230000, gastos: 145000, beneficio: 85000, roi: 58.6 },
        ],
    },
    {
        id: 'demo-kpis',
        name: 'KPIs Operativos',
        description: 'Métricas clave del negocio',
        category: 'operaciones',
        columns: ['metrica', 'valor', 'objetivo', 'estado'],
        data: [
            { metrica: 'Clientes Activos', valor: 1245, objetivo: 1500, estado: 'progreso' },
            { metrica: 'Tasa de Conversión', valor: 3.8, objetivo: 4.5, estado: 'progreso' },
            { metrica: 'Ticket Promedio', valor: 85, objetivo: 90, estado: 'progreso' },
            { metrica: 'Satisfacción', valor: 92, objetivo: 90, estado: 'ok' },
            { metrica: 'Retención', valor: 78, objetivo: 85, estado: 'progreso' },
            { metrica: 'NPS', valor: 45, objetivo: 50, estado: 'progreso' },
        ],
    },
]

export const demoInsights = [
    {
        id: 'insight-1',
        title: 'Crecimiento acelerado en Q4',
        description: 'Las ventas del Q4 muestran un crecimiento del 33% respecto al trimestre anterior, superando las proyecciones.',
        type: 'positive' as const,
        metric: '+33%',
        category: 'ventas',
    },
    {
        id: 'insight-2',
        title: 'Oportunidad en categoría Ropa',
        description: 'La categoría Ropa tiene el mayor margen de ganancia (45%) pero representa solo el 22.5% de las ventas totales.',
        type: 'opportunity' as const,
        metric: '45%',
        category: 'ventas',
    },
    {
        id: 'insight-3',
        title: 'ROI en tendencia ascendente',
        description: 'El ROI ha crecido consistentemente desde Q1 2023, alcanzando 58.6% en Q2 2024.',
        type: 'positive' as const,
        metric: '58.6%',
        category: 'marketing',
    },
    {
        id: 'insight-4',
        title: 'Retención por debajo del objetivo',
        description: 'La tasa de retención está 7 puntos por debajo del objetivo. Considerá programas de fidelización.',
        type: 'warning' as const,
        metric: '78%',
        category: 'operaciones',
    },
]

export function getDemoDataByCategory(category: string): DemoDataset[] {
    return demoDatasets.filter(d => d.category === category)
}