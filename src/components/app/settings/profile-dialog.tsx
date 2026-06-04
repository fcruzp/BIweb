'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  User,
  Building2,
  Phone,
  Globe,
  FileText,
  Loader2,
  Check,
  Mail,
  Crown,
} from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { useAuth } from '@/components/auth/AuthProvider';
import { authFetch } from '@/lib/fetch-utils';
import { getPlan, type PlanId } from '@/lib/plans';
import { toast } from 'sonner';

const COUNTRIES = [
  { code: 'DO', name: 'República Dominicana', nameEn: 'Dominican Republic' },
  { code: 'MX', name: 'México', nameEn: 'Mexico' },
  { code: 'CO', name: 'Colombia', nameEn: 'Colombia' },
  { code: 'AR', name: 'Argentina', nameEn: 'Argentina' },
  { code: 'CL', name: 'Chile', nameEn: 'Chile' },
  { code: 'PE', name: 'Perú', nameEn: 'Peru' },
  { code: 'BR', name: 'Brasil', nameEn: 'Brazil' },
  { code: 'ES', name: 'España', nameEn: 'Spain' },
  { code: 'US', name: 'Estados Unidos', nameEn: 'United States' },
  { code: 'VE', name: 'Venezuela', nameEn: 'Venezuela' },
  { code: 'PA', name: 'Panamá', nameEn: 'Panama' },
  { code: 'EC', name: 'Ecuador', nameEn: 'Ecuador' },
  { code: 'GT', name: 'Guatemala', nameEn: 'Guatemala' },
  { code: 'HN', name: 'Honduras', nameEn: 'Honduras' },
  { code: 'SV', name: 'El Salvador', nameEn: 'El Salvador' },
  { code: 'NI', name: 'Nicaragua', nameEn: 'Nicaragua' },
  { code: 'CR', name: 'Costa Rica', nameEn: 'Costa Rica' },
  { code: 'UY', name: 'Uruguay', nameEn: 'Uruguay' },
  { code: 'PY', name: 'Paraguay', nameEn: 'Paraguay' },
  { code: 'BO', name: 'Bolivia', nameEn: 'Bolivia' },
  { code: 'CU', name: 'Cuba', nameEn: 'Cuba' },
  { code: 'PR', name: 'Puerto Rico', nameEn: 'Puerto Rico' },
  { code: 'CA', name: 'Canadá', nameEn: 'Canada' },
  { code: 'GB', name: 'Reino Unido', nameEn: 'United Kingdom' },
  { code: 'DE', name: 'Alemania', nameEn: 'Germany' },
  { code: 'FR', name: 'Francia', nameEn: 'France' },
  { code: 'IT', name: 'Italia', nameEn: 'Italy' },
  { code: 'PT', name: 'Portugal', nameEn: 'Portugal' },
  { code: 'JP', name: 'Japón', nameEn: 'Japan' },
  { code: 'CN', name: 'China', nameEn: 'China' },
  { code: 'OTHER', name: 'Otro / Other', nameEn: 'Other' },
];

const PLAN_BADGE_COLORS: Record<PlanId, string> = {
  free: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  supporter: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  starter: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  pro: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  business: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
};

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
  const { t, locale } = useI18n();
  const { user, dbUser, refreshDbUser } = useAuth();

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [taxId, setTaxId] = useState('');
  const [preferredLang, setPreferredLang] = useState('es');
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const planId = (dbUser?.subscription?.plan || 'free') as PlanId;
  const plan = getPlan(planId);
  const planName = locale === 'es' ? plan.nameEs : plan.name;

  // Populate form from dbUser
  useEffect(() => {
    if (open && dbUser) {
      setName(dbUser.name || '');
      setCompany(dbUser.company || '');
      setPhone(dbUser.phone || '');
      setCountry(dbUser.country || '');
      setTaxId(dbUser.taxId || '');
      setPreferredLang(dbUser.preferredLang || 'es');
      setHasChanges(false);
    }
  }, [open, dbUser]);

  // Track changes
  useEffect(() => {
    if (!dbUser) return;
    const changed =
      name !== (dbUser.name || '') ||
      company !== (dbUser.company || '') ||
      phone !== (dbUser.phone || '') ||
      country !== (dbUser.country || '') ||
      taxId !== (dbUser.taxId || '') ||
      preferredLang !== (dbUser.preferredLang || 'es');
    setHasChanges(changed);
  }, [name, company, phone, country, taxId, preferredLang, dbUser]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authFetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          company,
          phone,
          country: country === 'OTHER' ? '' : country,
          taxId,
          preferredLang,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save profile');
      }

      // Refresh the global dbUser state
      await refreshDbUser();
      setHasChanges(false);
      toast.success(t('profileSaved'));
    } catch (err) {
      console.error('[ProfileDialog] Save error:', err);
      toast.error(t('profileSaveError'));
    } finally {
      setSaving(false);
    }
  };

  const email = user?.email || dbUser?.email || '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0 bg-background/80 backdrop-blur-xl border-border/30 shadow-2xl">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 shrink-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-emerald-600" />
              {t('profile')}
            </DialogTitle>
            <DialogDescription>
              {t('profileDesc')}
            </DialogDescription>
          </DialogHeader>
        </div>

        <Separator className="opacity-30" />

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Mail className="h-3 w-3" />
              Email
            </Label>
            <Input
              value={email}
              disabled
              className="bg-muted/50 text-muted-foreground cursor-not-allowed"
            />
            <p className="text-[10px] text-muted-foreground/70">
              {locale === 'es' ? 'El email no se puede cambiar' : 'Email cannot be changed'}
            </p>
          </div>

          {/* Plan badge (read-only) */}
          <div className="flex items-center gap-2">
            <Crown className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{t('currentPlan')}:</span>
            <Badge variant="outline" className={`${PLAN_BADGE_COLORS[planId]} text-[10px] px-1.5 h-4`}>
              {planName}
            </Badge>
          </div>

          <Separator className="opacity-20" />

          {/* Full Name */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <User className="h-3 w-3" />
              {t('fullName')}
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('fullNamePlaceholder')}
              className="bg-background"
            />
          </div>

          {/* Company */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Building2 className="h-3 w-3" />
              {t('company2')}
            </Label>
            <Input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder={t('companyPlaceholder')}
              className="bg-background"
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Phone className="h-3 w-3" />
              {t('phone2')}
            </Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t('phonePlaceholder')}
              className="bg-background"
              type="tel"
            />
          </div>

          {/* Country */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Globe className="h-3 w-3" />
              {t('country2')}
            </Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder={t('countryPlaceholder')} />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {locale === 'es' ? c.name : c.nameEn} ({c.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tax ID */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3 w-3" />
              {t('taxId2')}
            </Label>
            <Input
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              placeholder={t('taxIdPlaceholder')}
              className="bg-background"
            />
          </div>

          <Separator className="opacity-20" />

          {/* Preferred Language */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Globe className="h-3 w-3" />
              {t('preferredLang2')}
            </Label>
            <Select value={preferredLang} onValueChange={setPreferredLang}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Footer with Save button */}
        <Separator className="opacity-30" />
        <div className="px-6 py-4 shrink-0 flex items-center justify-end gap-3">
          {hasChanges && (
            <span className="text-[10px] text-amber-500 animate-pulse mr-auto">
              {locale === 'es' ? 'Cambios sin guardar' : 'Unsaved changes'}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {t('close')}
          </Button>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 min-w-[100px]"
            onClick={handleSave}
            disabled={saving || !hasChanges}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            {saving ? t('saving') : t('save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
