import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useProduct } from '../hooks/usePublic';
import { pickName, pickField } from '../lib/api';
import { PageBanner } from '../components/PageBanner';
import { ProductCard } from '../components/ProductCard';
import { SectionHeading } from '../components/SectionHeading';
import { Loader } from '../components/Spinner';
import { IconImage, IconArrowRight, IconCheck } from '../components/Icons';
import type { ProductVariant } from '../types';

export function ProductDetailPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading } = useProduct(slug);
  const [activeImg, setActiveImg] = useState(0);
  const [activeVariant, setActiveVariant] = useState<ProductVariant | null>(null);

  useEffect(() => { setActiveImg(0); setActiveVariant(null); }, [slug]);

  if (isLoading || !data) return <Loader />;

  const { product, related } = data;
  const name = pickName(product.translations, lang, product.slug);
  const desc = pickField(product.translations, lang, 'description');
  const shortDesc = pickField(product.translations, lang, 'shortDescription');
  const brandName = product.brand ? pickName(product.brand.translations, lang) : '';
  const categoryName = product.category ? pickName(product.category.translations, lang) : '';
  const images = product.images.length ? product.images : product.coverImage ? [product.coverImage] : [];
  const main = images[activeImg] ?? null;
  const activeVariants = product.variants.filter((v) => v.isActive);

  return (
    <>
      <PageBanner
        title={name}
        crumbs={[{ label: t('nav.products'), to: '/products' }, { label: name }]}
      />

      <section className="section">
        <div className="container">
          <div className="pdp">
            {/* Gallery */}
            <div>
              <div className="gallery-main">
                {main ? (
                  <img src={main.url} alt={name} />
                ) : (
                  <span className="thumb-empty">
                    <IconImage size={56} />
                  </span>
                )}
              </div>
              {images.length > 1 && (
                <div className="gallery-thumbs">
                  {images.map((img, i) => (
                    <button
                      key={img.id}
                      type="button"
                      className={`gallery-thumb ${i === activeImg ? 'active' : ''}`}
                      onClick={() => setActiveImg(i)}
                    >
                      <img src={img.thumbnailUrl ?? img.url} alt="" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="pdp-info">
              {brandName && <span className="product-brand">{brandName}</span>}
              <h1>{name}</h1>
              {shortDesc && <p className="muted">{shortDesc}</p>}

              <div className="spec-list" style={{ marginTop: 20 }}>
                {product.sku && (
                  <div className="spec-row">
                    <span className="k">{t('product.sku')}</span>
                    <span className="v">{product.sku}</span>
                  </div>
                )}
                {categoryName && (
                  <div className="spec-row">
                    <span className="k">{t('product.category')}</span>
                    <span className="v">{categoryName}</span>
                  </div>
                )}
                {brandName && (
                  <div className="spec-row">
                    <span className="k">{t('product.brand')}</span>
                    <span className="v">{brandName}</span>
                  </div>
                )}
                {activeVariant?.sku && (
                  <div className="spec-row">
                    <span className="k">{t('product.selectedVariant')}</span>
                    <span className="v">{activeVariant.sku}</span>
                  </div>
                )}
              </div>

              <Link to="/contact" className="btn btn-primary" style={{ marginTop: 24 }}>
                {t('product.requestQuote')}
                <IconArrowRight size={18} />
              </Link>

              {/* Variants */}
              {activeVariants.length > 0 && (
                <div className="pdp-section">
                  <h3>{t('product.variants')}</h3>
                  <div className="variant-selector">
                    {activeVariants.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        className={`variant-option ${activeVariant?.id === v.id ? 'active' : ''}`}
                        onClick={() => setActiveVariant(activeVariant?.id === v.id ? null : v)}
                      >
                        <div className="attr-chips">
                          {v.attributes.map((a) => (
                            <span key={a.id} className="attr-chip">
                              <b>{a.key}</b>
                              <span>{a.value}</span>
                            </span>
                          ))}
                        </div>
                        {v.sku && <span className="variant-sku">{v.sku}</span>}
                        <span className="variant-check">
                          <IconCheck size={18} />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {desc && (
                <div className="pdp-section">
                  <h3>{t('product.specifications')}</h3>
                  <p className="pdp-desc">{desc}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="section section-alt">
          <div className="container">
            <SectionHeading title={t('product.relatedTitle')} />
            <div className="grid grid-4">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
