import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IconMapPin, IconPhone, IconMail } from './Icons';

export function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <span className="brand-name">
              {t('brand.name')}
              <span style={{ color: 'var(--red-500)' }}>{t('brand.accent')}</span>
            </span>
            <p>{t('footer.about')}</p>
          </div>

          <div className="footer-col">
            <h4>{t('footer.company')}</h4>
            <Link to="/about">{t('nav.about')}</Link>
            <Link to="/services">{t('nav.services')}</Link>
            <Link to="/projects">{t('nav.projects')}</Link>
            <Link to="/blog">{t('nav.blog')}</Link>
          </div>

          <div className="footer-col">
            <h4>{t('footer.catalog')}</h4>
            <Link to="/products">{t('nav.products')}</Link>
            <Link to="/categories">{t('nav.categories')}</Link>
            <Link to="/brands">{t('nav.brands')}</Link>
            <Link to="/contact">{t('nav.contact')}</Link>
          </div>

          <div className="footer-col">
            <h4>{t('footer.contactTitle')}</h4>
            <div className="footer-contact-item">
              <IconMapPin size={18} />
              <span>{t('contact.addressValue')}</span>
            </div>
            <div className="footer-contact-item">
              <IconPhone size={18} />
              <span dir="ltr">{t('contact.phoneValue')}</span>
            </div>
            <div className="footer-contact-item">
              <IconMail size={18} />
              <span>{t('contact.emailValue')}</span>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>
            &copy; {year} {t('brand.name')}
            {t('brand.accent')}. {t('footer.rights')}
          </span>
          <span>{t('footer.builtWith')}</span>
        </div>
      </div>
    </footer>
  );
}
