import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface Crumb {
  label: string;
  to?: string;
}
export function PageBanner({ title, subtitle, crumbs }: { title: string; subtitle?: string; crumbs?: Crumb[] }) {
  const { t } = useTranslation();
  const all: Crumb[] = [{ label: t('nav.home'), to: '/' }, ...(crumbs ?? [])];
  return (
    <section className="page-banner">
      <div className="container">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          {all.map((c, i) => (
            <Fragment key={i}>
              {i > 0 && <span className="sep">/</span>}
              {c.to && i < all.length - 1 ? <Link to={c.to}>{c.label}</Link> : <span>{c.label}</span>}
            </Fragment>
          ))}
        </nav>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
    </section>
  );
}
