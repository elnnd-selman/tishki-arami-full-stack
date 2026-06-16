import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageBanner } from '../components/PageBanner';
import { IconMapPin, IconPhone, IconMail, IconClock, IconCheck } from '../components/Icons';
import { Spinner } from '../components/Spinner';

export function ContactPage() {
  const { t } = useTranslation();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    // No public contact endpoint yet - simulate a successful submission.
    window.setTimeout(() => {
      setSending(false);
      setSent(true);
      setForm({ name: '', email: '', subject: '', message: '' });
    }, 700);
  }

  const info = [
    { icon: <IconMapPin size={20} />, label: t('contact.addressLabel'), value: t('contact.addressValue') },
    { icon: <IconPhone size={20} />, label: t('contact.phoneLabel'), value: t('contact.phoneValue'), ltr: true },
    { icon: <IconMail size={20} />, label: t('contact.emailLabel'), value: t('contact.emailValue'), ltr: true },
    { icon: <IconClock size={20} />, label: t('contact.hoursLabel'), value: t('contact.hoursValue') },
  ];

  return (
    <>
      <PageBanner title={t('contact.title')} subtitle={t('contact.subtitle')} crumbs={[{ label: t('nav.contact') }]} />
      <section className="section">
        <div className="container">
          <div className="contact-grid">
            <div>
              <h2 style={{ fontSize: 24, marginBottom: 18 }}>{t('contact.infoTitle')}</h2>
              {info.map((it, i) => (
                <div key={i} className="contact-info-card">
                  <span className={`tile-icon ${i % 2 ? 'accent' : ''}`}>{it.icon}</span>
                  <div>
                    <h4>{it.label}</h4>
                    <p {...(it.ltr ? { dir: 'ltr' } : {})}>{it.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <form className="form-card" onSubmit={onSubmit}>
              {sent && (
                <div
                  className="badge badge-blue"
                  style={{ width: '100%', justifyContent: 'center', padding: 12, marginBottom: 18, fontSize: 14 }}
                >
                  <IconCheck size={16} />
                  {t('contact.success')}
                </div>
              )}
              <div className="field">
                <label>{t('contact.formName')}</label>
                <input value={form.name} onChange={(e) => set('name', e.target.value)} required />
              </div>
              <div className="field">
                <label>{t('contact.formEmail')}</label>
                <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
              </div>
              <div className="field">
                <label>{t('contact.formSubject')}</label>
                <input value={form.subject} onChange={(e) => set('subject', e.target.value)} required />
              </div>
              <div className="field">
                <label>{t('contact.formMessage')}</label>
                <textarea value={form.message} onChange={(e) => set('message', e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={sending}>
                {sending && <Spinner />}
                {sending ? t('contact.sending') : t('contact.send')}
              </button>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
