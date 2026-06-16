import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { pickName, pickField } from '../lib/api';
import { IconImage, IconArrowRight } from './Icons';
import type { Product } from '../types';

export function ProductCard({ product }: { product: Product }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const name = pickName(product.translations, lang, product.slug);
  const desc = pickField(product.translations, lang, 'shortDescription');
  const brand = product.brand ? pickName(product.brand.translations, lang) : '';
  const cover = product.coverImage;
  const cardRef = useRef<HTMLAnchorElement>(null);

  function onMouseMove(e: React.MouseEvent<HTMLAnchorElement>) {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(800px) rotateY(${x * 12}deg) rotateX(${-y * 10}deg) translateZ(6px)`;
  }

  function onMouseLeave() {
    const el = cardRef.current;
    if (!el) return;
    el.style.transform = '';
  }

  return (
    <Link
      ref={cardRef}
      to={`/products/${product.slug}`}
      className="product-card"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <div className="product-thumb">
        {product.isFeatured && (
          <span className="card-badge badge badge-red">{t('home.featuredEyebrow')}</span>
        )}
        {cover ? (
          <img src={cover.thumbnailUrl ?? cover.url} alt={name} loading="lazy" />
        ) : (
          <span className="thumb-empty">
            <IconImage size={40} />
          </span>
        )}
      </div>
      <div className="product-body">
        {brand && <span className="product-brand">{brand}</span>}
        <span className="product-name">{name}</span>
        {desc && <span className="product-desc">{desc}</span>}
        <div className="product-foot">
          <span className="catalog-btn">
            {t('common.viewDetails')} <IconArrowRight size={14} />
          </span>
        </div>
      </div>
    </Link>
  );
}
