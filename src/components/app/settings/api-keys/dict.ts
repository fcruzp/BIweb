/**
 * API Keys UI — shared types, scope metadata, and a tiny local i18n dict.
 *
 * We keep translations local to this feature (instead of extending the global
 * i18n file) so the feature is self-contained and easy to review/merge.
 */

import type { ApiScope } from '@/lib/api-auth'

export type Locale = 'en' | 'es'

export interface ApiKeyView {
  id: string
  label: string
  maskedKey: string
  scopes: ApiScope[]
  revokedAt: string | null
  lastUsedAt: string | null
  lastUsedIp: string | null
  expiresAt: string | null
  createdAt: string
  requestCount: number
}

export interface CreatedApiKey {
  key: string
  meta: {
    id: string
    label: string
    scopes: ApiScope[]
    expiresAt: string | null
    createdAt: string
    maskedKey: string
  }
}

export interface ScopeMeta {
  id: ApiScope
  /** Short label shown next to the checkbox. */
  name: string
  /** Longer description shown under the checkbox. */
  description: string
  /** Tailwind classes for the badge variant. */
  badgeClass: string
}

const DICT = {
  en: {
    title: 'API Keys',
    subtitle: 'Generate keys so external tools (OpenFN, N8N, Zapier) can access your DataMind data securely.',
    developer: 'Developer',
    createKey: 'Create new key',
    revoke: 'Revoke',
    revokeConfirmTitle: 'Revoke this API key?',
    revokeConfirmDesc: 'Any tool using this key will immediately stop working. This cannot be undone.',
    cancel: 'Cancel',
    revokeAction: 'Revoke key',
    noKeysTitle: 'No API keys yet',
    noKeysDesc: 'Create your first API key to connect external tools to DataMind BI.',
    labelField: 'Label',
    labelPlaceholder: 'e.g. OpenFN — Nightly sync',
    scopes: 'Scopes',
    expiration: 'Expiration',
    never: 'Never',
    days30: '30 days',
    days90: '90 days',
    year1: '1 year',
    create: 'Create key',
    creating: 'Creating…',
    revealTitle: 'Your new API key',
    revealWarn: 'Copy this key now. For security reasons, it will not be shown again.',
    copy: 'Copy',
    copied: 'Copied!',
    saved: "I've saved my key",
    tryIt: 'Test it with curl',
    maskedLabel: 'Key',
    active: 'Active',
    revoked: 'Revoked',
    expired: 'Expired',
    expiresOn: 'Expires {date}',
    expiredOn: 'Expired {date}',
    lastUsed: 'Last used {when}',
    neverUsed: 'Never used',
    requests: '{count} requests',
    createdAt: 'Created {when}',
    securityNote: 'Keys are stored as a SHA-256 hash — we cannot recover a lost key. Treat them like passwords.',
    loadError: 'Failed to load API keys.',
    createError: 'Failed to create API key.',
    revokeError: 'Failed to revoke API key.',
    keyCreated: 'API key created.',
    keyRevoked: 'API key revoked.',
    scopeReadName: 'Read',
    scopeReadDesc: 'List datasources, dashboards, and schemas (GET endpoints).',
    scopeExecuteName: 'Execute',
    scopeExecuteDesc: 'Run SQL SELECT queries against your data sources (POST endpoints).',
    scopeAdminName: 'Admin',
    scopeAdminDesc: 'Full access — read, execute, and manage. Use sparingly.',
    selectScope: 'Select at least one scope.',
    manageKeys: 'Manage API Keys',
    openManager: 'Manage',
    back: 'Back',
    copyKey: 'Copy key',
    keyId: 'ID',
  },
  es: {
    title: 'Claves de API',
    subtitle: 'Genera claves para que herramientas externas (OpenFN, N8N, Zapier) accedan a tus datos de DataMind de forma segura.',
    developer: 'Desarrollador',
    createKey: 'Crear nueva clave',
    revoke: 'Revocar',
    revokeConfirmTitle: '¿Revocar esta clave de API?',
    revokeConfirmDesc: 'Cualquier herramienta que use esta clave dejará de funcionar inmediatamente. Esta acción no se puede deshacer.',
    cancel: 'Cancelar',
    revokeAction: 'Revocar clave',
    noKeysTitle: 'Aún no hay claves de API',
    noKeysDesc: 'Crea tu primera clave de API para conectar herramientas externas a DataMind BI.',
    labelField: 'Etiqueta',
    labelPlaceholder: 'p.ej. OpenFN — Sincronización nocturna',
    scopes: 'Permisos',
    expiration: 'Expiración',
    never: 'Nunca',
    days30: '30 días',
    days90: '90 días',
    year1: '1 año',
    create: 'Crear clave',
    creating: 'Creando…',
    revealTitle: 'Tu nueva clave de API',
    revealWarn: 'Copia esta clave ahora. Por seguridad, no se volverá a mostrar.',
    copy: 'Copiar',
    copied: '¡Copiado!',
    saved: 'Ya guardé mi clave',
    tryIt: 'Pruébala con curl',
    maskedLabel: 'Clave',
    active: 'Activa',
    revoked: 'Revocada',
    expired: 'Expirada',
    expiresOn: 'Expira {date}',
    expiredOn: 'Expiró {date}',
    lastUsed: 'Usada {when}',
    neverUsed: 'Sin uso',
    requests: '{count} solicitudes',
    createdAt: 'Creada {when}',
    securityNote: 'Las claves se guardan como hash SHA-256 — no podemos recuperar una clave perdida. Trátalas como contraseñas.',
    loadError: 'Error al cargar las claves de API.',
    createError: 'Error al crear la clave de API.',
    revokeError: 'Error al revocar la clave de API.',
    keyCreated: 'Clave de API creada.',
    keyRevoked: 'Clave de API revocada.',
    scopeReadName: 'Lectura',
    scopeReadDesc: 'Listar datasources, dashboards y esquemas (endpoints GET).',
    scopeExecuteName: 'Ejecución',
    scopeExecuteDesc: 'Ejecutar consultas SQL SELECT sobre tus datasources (endpoints POST).',
    scopeAdminName: 'Admin',
    scopeAdminDesc: 'Acceso total — leer, ejecutar y gestionar. Usar con moderación.',
    selectScope: 'Selecciona al menos un permiso.',
    manageKeys: 'Gestionar claves de API',
    openManager: 'Gestionar',
    back: 'Atrás',
    copyKey: 'Copiar clave',
    keyId: 'ID',
  },
} as const

export type DictKey = keyof typeof DICT.en

export function getDict(locale: Locale) {
  return (key: DictKey, params?: Record<string, string>) => {
    const table = DICT[locale] ?? DICT.en
    let value = (table[key] ?? DICT.en[key] ?? key) as string
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        value = value.replace(`{${k}}`, v)
      }
    }
    return value
  }
}

export function scopeMeta(locale: Locale, t: ReturnType<typeof getDict>): ScopeMeta[] {
  return [
    {
      id: 'read',
      name: t('scopeReadName'),
      description: t('scopeReadDesc'),
      badgeClass: 'bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400',
    },
    {
      id: 'execute',
      name: t('scopeExecuteName'),
      description: t('scopeExecuteDesc'),
      badgeClass: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
    },
    {
      id: 'admin',
      name: t('scopeAdminName'),
      description: t('scopeAdminDesc'),
      badgeClass: 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400',
    },
  ]
}

export function scopeBadgeClass(scope: ApiScope): string {
  switch (scope) {
    case 'read':
      return 'bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400'
    case 'execute':
      return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400'
    case 'admin':
      return 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400'
  }
}
