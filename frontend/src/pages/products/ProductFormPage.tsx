import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  useProduct,
  useCategories,
  useBrands,
  useCreateProduct,
  useUpdateProduct,
} from '../../hooks/useProducts';
import { localizedName } from '../../lib/localize';
import { errorMessage } from '../../lib/api';
import { useToast } from '../../components/ui/Toast';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { ImageManager } from './ImageManager';
import { VariantManager } from './VariantManager';
import { IconChevronLeft } from '../../components/ui/Icons';
import type { LocaleKey, PublishStatus, Translation } from '../../types/api';

const LOCALES: LocaleKey[] = ['en', 'ar', 'ku'];
const LOCALE_LABEL: Record<LocaleKey, string> = { en: 'English', ar: 'العربية', ku: 'کوردی' };

interface FormState {
  slug: string;
  sku: string;
  categoryId: string;
  brandId: string;
  status: PublishStatus;
  isFeatured: boolean;
  sortOrder: number;
  translations: Record<LocaleKey, Translation>;
}

const emptyTranslation = (): Translation => ({
  name: '',
  shortDescription: '',
  description: '',
  metaTitle: '',
  metaDescription: '',
});

function emptyForm(): FormState {
  return {
    slug: '',
    sku: '',
    categoryId: '',
    brandId: '',
    status: 'DRAFT',
    isFeatured: false,
    sortOrder: 0,
    translations: { en: emptyTranslation(), ar: emptyTranslation(), ku: emptyTranslation() },
  };
}

export function ProductFormPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';

  const { data: product, isLoading, isError } = useProduct(isNew ? undefined : id);
  const categories = useCategories();
  const brands = useBrands();
  const createMut = useCreateProduct();
  const updateMut = useUpdateProduct(id ?? '');

  const [form, setForm] = useState<FormState>(emptyForm());
  const [activeLocale, setActiveLocale] = useState<LocaleKey>('en');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate the form when an existing product loads.
  useEffect(() => {
    if (product) {
      setForm({
        slug: product.slug,
        sku: product.sku ?? '',
        categoryId: product.categoryId,
        brandId: product.brandId ?? '',
        status: product.status,
        isFeatured: product.isFeatured,
        sortOrder: product.sortOrder,
        translations: {
          en: { ...emptyTranslation(), ...(product.translations.en ?? {}) },
          ar: { ...emptyTranslation(), ...(product.translations.ar ?? {}) },
          ku: { ...emptyTranslation(), ...(product.translations.ku ?? {}) },
        },
      });
    }
  }, [product]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setTr(locale: LocaleKey, key: keyof Translation, value: string) {
    setForm((f) => ({
      ...f,
      translations: { ...f.translations, [locale]: { ...f.translations[locale], [key]: value } },
    }));
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.translations.en.name?.trim()) next['en.name'] = t('product.name');
    if (!form.categoryId) next['categoryId'] = t('product.category');
    setErrors(next);
    if (next['en.name']) setActiveLocale('en');
    return Object.keys(next).length === 0;
  }

  // Only include a locale's translation when it has a name (backend requires it).
  function buildTranslations() {
    const out: Partial<Record<LocaleKey, Translation>> = {};
    for (const loc of LOCALES) {
      const tr = form.translations[loc];
      if (tr.name?.trim()) {
        out[loc] = {
          name: tr.name.trim(),
          shortDescription: tr.shortDescription || null,
          description: tr.description || null,
          metaTitle: tr.metaTitle || null,
          metaDescription: tr.metaDescription || null,
        };
      }
    }
    return out;
  }

  function buildPayload() {
    return {
      slug: form.slug.trim() || undefined,
      sku: form.sku.trim() || null,
      categoryId: form.categoryId,
      brandId: form.brandId || null,
      status: form.status,
      isFeatured: form.isFeatured,
      sortOrder: Number(form.sortOrder) || 0,
      translations: buildTranslations(),
    };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    try {
      if (isNew) {
        const created = await createMut.mutateAsync(buildPayload());
        toast.success(t('product.created'));
        navigate(`/products/${created.id}`, { replace: true });
      } else {
        await updateMut.mutateAsync(buildPayload());
        toast.success(t('product.updated'));
      }
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  const saving = createMut.isPending || updateMut.isPending;

  const localeIsRtl = activeLocale !== 'en';

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
          <p>{t('errors.notFound')}</p>
          <Link to="/products" className="btn btn-outline">
            {t('common.back')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form className="stack" onSubmit={onSubmit}>
      <PageHeader
        title={isNew ? t('product.newTitle') : t('product.editTitle')}
        subtitle={!isNew ? product?.slug : undefined}
        actions={
          <div className="row">
            <Link to="/products" className="btn btn-outline">
              <IconChevronLeft size={18} />
              {t('common.back')}
            </Link>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving && <Spinner size="sm" />}
              {isNew ? t('common.create') : t('common.saveChanges')}
            </button>
          </div>
        }
      />

      <div className="form-layout">
        <div className="stack">
          {/* Translations card */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">{t('product.translations')}</span>
            </div>
            <div className="locale-tabs">
              {LOCALES.map((loc) => (
                <button
                  type="button"
                  key={loc}
                  className={`locale-tab ${activeLocale === loc ? 'active' : ''}`}
                  onClick={() => setActiveLocale(loc)}
                >
                  {LOCALE_LABEL[loc]}
                  {loc === 'en' && <span className="req">*</span>}
                </button>
              ))}
            </div>
            <div className="card-body stack" dir={localeIsRtl ? 'rtl' : 'ltr'}>
              <div className="field">
                <label className="label">
                  {t('product.name')}
                  {activeLocale === 'en' && <span className="req">*</span>}
                </label>
                <input
                  className={`input ${errors['en.name'] && activeLocale === 'en' ? 'error' : ''}`}
                  value={form.translations[activeLocale].name ?? ''}
                  onChange={(e) => setTr(activeLocale, 'name', e.target.value)}
                />
                {errors['en.name'] && activeLocale === 'en' && (
                  <span className="field-error">{t('product.name')} *</span>
                )}
              </div>

              <div className="field">
                <label className="label">{t('product.shortDescription')}</label>
                <input
                  className="input"
                  value={form.translations[activeLocale].shortDescription ?? ''}
                  onChange={(e) => setTr(activeLocale, 'shortDescription', e.target.value)}
                />
              </div>

              <div className="field">
                <label className="label">{t('product.description')}</label>
                <textarea
                  className="textarea"
                  value={form.translations[activeLocale].description ?? ''}
                  onChange={(e) => setTr(activeLocale, 'description', e.target.value)}
                />
              </div>

              <div className="grid-2">
                <div className="field">
                  <label className="label">{t('product.metaTitle')}</label>
                  <input
                    className="input"
                    value={form.translations[activeLocale].metaTitle ?? ''}
                    onChange={(e) => setTr(activeLocale, 'metaTitle', e.target.value)}
                  />
                </div>
                <div className="field">
                  <label className="label">{t('product.metaDescription')}</label>
                  <input
                    className="input"
                    value={form.translations[activeLocale].metaDescription ?? ''}
                    onChange={(e) => setTr(activeLocale, 'metaDescription', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Images: only available after the product exists */}
          {isNew ? (
            <div className="card">
              <div className="card-header">
                <span className="card-title">{t('product.images')}</span>
              </div>
              <div className="card-body muted text-sm">{t('image.saveFirst')}</div>
            </div>
          ) : (
            product && <ImageManager product={product} />
          )}

          {/* Variants - available once the product exists */}
          {isNew ? (
            <div className="card">
              <div className="card-header">
                <span className="card-title">{t('variant.title')}</span>
              </div>
              <div className="card-body muted text-sm">{t('image.saveFirst')}</div>
            </div>
          ) : (
            product && <VariantManager product={product} />
          )}
        </div>

        {/* Details sidebar */}
        <div className="stack">
          <div className="card">
            <div className="card-header">
              <span className="card-title">{t('product.details')}</span>
            </div>
            <div className="card-body stack">
              <div className="field">
                <label className="label">
                  {t('product.category')}
                  <span className="req">*</span>
                </label>
                <select
                  className={`select ${errors['categoryId'] ? 'error' : ''}`}
                  value={form.categoryId}
                  onChange={(e) => setField('categoryId', e.target.value)}
                >
                  <option value="">{t('product.selectCategory')}</option>
                  {categories.data?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {localizedName(c.translations, i18n.language)}
                    </option>
                  ))}
                </select>
                {errors['categoryId'] && (
                  <span className="field-error">{t('product.category')} *</span>
                )}
              </div>

              <div className="field">
                <label className="label">{t('product.brand')}</label>
                <select
                  className="select"
                  value={form.brandId}
                  onChange={(e) => setField('brandId', e.target.value)}
                >
                  <option value="">{t('product.noBrand')}</option>
                  {brands.data?.map((b) => (
                    <option key={b.id} value={b.id}>
                      {localizedName(b.translations, i18n.language)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="label">{t('common.status')}</label>
                <select
                  className="select"
                  value={form.status}
                  onChange={(e) => setField('status', e.target.value as PublishStatus)}
                >
                  <option value="DRAFT">{t('status.DRAFT')}</option>
                  <option value="PUBLISHED">{t('status.PUBLISHED')}</option>
                  <option value="ARCHIVED">{t('status.ARCHIVED')}</option>
                </select>
              </div>

              <div className="field">
                <label className="label">{t('product.sku')}</label>
                <input
                  className="input"
                  value={form.sku}
                  onChange={(e) => setField('sku', e.target.value)}
                />
              </div>

              <div className="field">
                <label className="label">{t('product.slug')}</label>
                <input
                  className="input"
                  value={form.slug}
                  placeholder={t('product.slugHint')}
                  onChange={(e) => setField('slug', e.target.value)}
                />
                <span className="hint">{t('product.slugHint')}</span>
              </div>

              <div className="grid-2">
                <div className="field">
                  <label className="label">{t('product.sortOrder')}</label>
                  <input
                    className="input"
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setField('sortOrder', Number(e.target.value))}
                  />
                </div>
                <label className="switch-field">
                  <input
                    type="checkbox"
                    checked={form.isFeatured}
                    onChange={(e) => setField('isFeatured', e.target.checked)}
                  />
                  <span>{t('product.featured')}</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
