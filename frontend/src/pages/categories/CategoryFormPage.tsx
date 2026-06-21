import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  useCategoryItem,
  useCategoryList,
  useSaveCategory,
  useCategoryImage,
} from '../../hooks/useCatalog';
import { localizedName } from '../../lib/localize';
import { errorMessage } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { SingleImageUploader } from '../../components/ui/SingleImageUploader';
import { IconChevronLeft } from '../../components/ui/Icons';
import type { CategoryType, LocaleKey } from '../../types/api';

const LOCALES: LocaleKey[] = ['en', 'ar', 'ku'];
const LABEL: Record<LocaleKey, string> = { en: 'English', ar: 'العربية', ku: 'کوردی' };

interface Tr {
  name: string;
  description: string;
}
interface FormState {
  slug: string;
  type: CategoryType;
  parentId: string;
  isActive: boolean;
  sortOrder: number;
  translations: Record<LocaleKey, Tr>;
}

const emptyTr = (): Tr => ({ name: '', description: '' });
const emptyForm = (): FormState => ({
  slug: '',
  type: 'PRODUCT',
  parentId: '',
  isActive: true,
  sortOrder: 0,
  translations: { en: emptyTr(), ar: emptyTr(), ku: emptyTr() },
});

export function CategoryFormPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const { can } = useAuth();
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';

  const { data: category, isLoading, isError } = useCategoryItem(isNew ? undefined : id);
  const allCats = useCategoryList({ pageSize: 100, sortBy: 'name', sortDir: 'asc' });
  const save = useSaveCategory(isNew ? undefined : id);
  const image = useCategoryImage(id ?? '');

  const [form, setForm] = useState<FormState>(emptyForm());
  const [locale, setLocale] = useState<LocaleKey>('en');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (category) {
      setForm({
        slug: category.slug,
        type: category.type,
        parentId: category.parentId ?? '',
        isActive: category.isActive,
        sortOrder: category.sortOrder,
        translations: {
          en: { name: category.translations.en?.name ?? '', description: category.translations.en?.description ?? '' },
          ar: { name: category.translations.ar?.name ?? '', description: category.translations.ar?.description ?? '' },
          ku: { name: category.translations.ku?.name ?? '', description: category.translations.ku?.description ?? '' },
        },
      });
    }
  }, [category]);

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
      type: form.type,
      parentId: form.parentId || null,
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
      toast.success(isNew ? t('category.created') : t('category.updated'));
      if (isNew) navigate(`/categories/${saved.id}`, { replace: true });
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
          <Link to="/categories" className="btn btn-outline">{t('common.back')}</Link>
        </div>
      </div>
    );
  }

  const rtl = locale !== 'en';
  // Exclude self from the parent options.
  const parentOptions = (allCats.data?.data ?? []).filter((c) => c.id !== id);

  return (
    <form className="stack" onSubmit={onSubmit}>
      <PageHeader
        title={isNew ? t('category.newTitle') : t('category.editTitle')}
        subtitle={!isNew ? category?.slug : undefined}
        actions={
          <div className="row">
            <Link to="/categories" className="btn btn-outline">
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
                  {t('category.name')}
                  {locale === 'en' && <span className="req">*</span>}
                </label>
                <input
                  className={`input ${errors.name && locale === 'en' ? 'error' : ''}`}
                  value={form.translations[locale].name}
                  onChange={(e) => setTr(locale, 'name', e.target.value)}
                />
              </div>
              <div className="field">
                <label className="label">{t('category.description')}</label>
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
              <span className="card-title">{t('common.image')}</span>
            </div>
            <div className="card-body">
              {isNew ? (
                <div className="muted text-sm">{t('image.saveFirst')}</div>
              ) : (
                <SingleImageUploader
                  imageUrl={category?.image?.url ?? null}
                  canEdit={can('category.update')}
                  uploading={image.upload.isPending}
                  removing={image.remove.isPending}
                  onUpload={(file) =>
                    image.upload.mutateAsync(file).then(() => toast.success(t('image.uploaded'))).catch((e) => toast.error(errorMessage(e)))
                  }
                  onRemove={() =>
                    image.remove.mutateAsync().then(() => toast.success(t('image.removed'))).catch((e) => toast.error(errorMessage(e)))
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
              <label className="label">{t('category.type')}</label>
              <select className="select" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as CategoryType }))}>
                <option value="PRODUCT">PRODUCT</option>
                <option value="SERVICE">SERVICE</option>
                <option value="BLOG">BLOG</option>
              </select>
            </div>
            <div className="field">
              <label className="label">{t('category.parent')}</label>
              <select className="select" value={form.parentId} onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}>
                <option value="">{t('category.noParent')}</option>
                {parentOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {localizedName(c.translations, i18n.language)}
                  </option>
                ))}
              </select>
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
