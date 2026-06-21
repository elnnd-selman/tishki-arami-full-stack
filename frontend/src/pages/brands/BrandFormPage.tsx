import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useBrandItem, useSaveBrand, useBrandLogo } from '../../hooks/useCatalog';
import { errorMessage } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { SingleImageUploader } from '../../components/ui/SingleImageUploader';
import { IconChevronLeft } from '../../components/ui/Icons';
import type { LocaleKey } from '../../types/api';

const LOCALES: LocaleKey[] = ['en', 'ar', 'ku'];
const LABEL: Record<LocaleKey, string> = { en: 'English', ar: 'العربية', ku: 'کوردی' };

interface Tr {
  name: string;
  description: string;
}
interface FormState {
  slug: string;
  website: string;
  isActive: boolean;
  sortOrder: number;
  translations: Record<LocaleKey, Tr>;
}

const emptyTr = (): Tr => ({ name: '', description: '' });
const emptyForm = (): FormState => ({
  slug: '',
  website: '',
  isActive: true,
  sortOrder: 0,
  translations: { en: emptyTr(), ar: emptyTr(), ku: emptyTr() },
});

export function BrandFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const { can } = useAuth();
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';

  const { data: brand, isLoading, isError } = useBrandItem(isNew ? undefined : id);
  const save = useSaveBrand(isNew ? undefined : id);
  const logo = useBrandLogo(id ?? '');

  const [form, setForm] = useState<FormState>(emptyForm());
  const [locale, setLocale] = useState<LocaleKey>('en');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (brand) {
      setForm({
        slug: brand.slug,
        website: brand.website ?? '',
        isActive: brand.isActive,
        sortOrder: brand.sortOrder,
        translations: {
          en: { name: brand.translations.en?.name ?? '', description: brand.translations.en?.description ?? '' },
          ar: { name: brand.translations.ar?.name ?? '', description: brand.translations.ar?.description ?? '' },
          ku: { name: brand.translations.ku?.name ?? '', description: brand.translations.ku?.description ?? '' },
        },
      });
    }
  }, [brand]);

  function setTr(loc: LocaleKey, key: keyof Tr, value: string) {
    setForm((f) => ({ ...f, translations: { ...f.translations, [loc]: { ...f.translations[loc], [key]: value } } }));
  }

  function buildPayload() {
    const translations: Partial<Record<LocaleKey, Tr>> = {};
    for (const loc of LOCALES) {
      const tr = form.translations[loc];
      if (tr.name.trim()) translations[loc] = { name: tr.name.trim(), description: tr.description || '' };
    }
    return {
      slug: form.slug.trim() || undefined,
      website: form.website.trim(),
      isActive: form.isActive,
      sortOrder: Number(form.sortOrder) || 0,
      translations,
    };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.translations.en.name.trim()) {
      setErrors({ name: 'required' });
      setLocale('en');
      return;
    }
    setErrors({});
    try {
      const saved = await save.mutateAsync(buildPayload());
      toast.success(isNew ? t('brand.created') : t('brand.updated'));
      if (isNew) navigate(`/brands/${saved.id}`, { replace: true });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  if (!isNew && isLoading) {
    return (
      <div className="center-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isNew && isError) {
    return (
      <div className="stack">
        <div className="empty">
          <div className="empty-title">{t('errors.loadFailed')}</div>
          <Link to="/brands" className="btn btn-outline">{t('common.back')}</Link>
        </div>
      </div>
    );
  }

  const rtl = locale !== 'en';

  return (
    <form className="stack" onSubmit={onSubmit}>
      <PageHeader
        title={isNew ? t('brand.newTitle') : t('brand.editTitle')}
        subtitle={!isNew ? brand?.slug : undefined}
        actions={
          <div className="row">
            <Link to="/brands" className="btn btn-outline">
              <IconChevronLeft size={18} />
              {t('common.back')}
            </Link>
            <button type="submit" className="btn btn-primary" disabled={save.isPending}>
              {save.isPending && <Spinner size="sm" />}
              {isNew ? t('common.create') : t('common.saveChanges')}
            </button>
          </div>
        }
      />

      <div className="form-layout">
        <div className="stack">
          <div className="card">
            <div className="card-header">
              <span className="card-title">{t('product.translations')}</span>
            </div>
            <div className="locale-tabs">
              {LOCALES.map((loc) => (
                <button
                  type="button"
                  key={loc}
                  className={`locale-tab ${locale === loc ? 'active' : ''}`}
                  onClick={() => setLocale(loc)}
                >
                  {LABEL[loc]}
                  {loc === 'en' && <span className="req">*</span>}
                </button>
              ))}
            </div>
            <div className="card-body stack" dir={rtl ? 'rtl' : 'ltr'}>
              <div className="field">
                <label className="label">
                  {t('brand.name')}
                  {locale === 'en' && <span className="req">*</span>}
                </label>
                <input
                  className={`input ${errors.name && locale === 'en' ? 'error' : ''}`}
                  value={form.translations[locale].name}
                  onChange={(e) => setTr(locale, 'name', e.target.value)}
                />
              </div>
              <div className="field">
                <label className="label">{t('brand.description')}</label>
                <textarea
                  className="textarea"
                  value={form.translations[locale].description}
                  onChange={(e) => setTr(locale, 'description', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">{t('brand.logo')}</span>
            </div>
            <div className="card-body">
              {isNew ? (
                <div className="muted text-sm">{t('image.saveFirst')}</div>
              ) : (
                <SingleImageUploader
                  imageUrl={brand?.logo?.url ?? null}
                  canEdit={can('brand.update')}
                  uploading={logo.upload.isPending}
                  removing={logo.remove.isPending}
                  onUpload={(file) =>
                    logo.upload.mutateAsync(file).then(() => toast.success(t('image.uploaded'))).catch((e) => toast.error(errorMessage(e)))
                  }
                  onRemove={() =>
                    logo.remove.mutateAsync().then(() => toast.success(t('image.removed'))).catch((e) => toast.error(errorMessage(e)))
                  }
                />
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">{t('product.details')}</span>
          </div>
          <div className="card-body stack">
            <div className="field">
              <label className="label">{t('brand.website')}</label>
              <input
                className="input"
                type="url"
                placeholder="https://example.com"
                value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
              />
            </div>
            <div className="field">
              <label className="label">{t('product.slug')}</label>
              <input className="input" value={form.slug} placeholder={t('product.slugHint')} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
            </div>
            <div className="grid-2">
              <div className="field">
                <label className="label">{t('product.sortOrder')}</label>
                <input className="input" type="number" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))} />
              </div>
              <label className="switch-field">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
                <span>{t('common.active')}</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
