import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useBlog } from '../hooks/usePublic';
import { pickName, pickField } from '../lib/api';
import { PageBanner } from '../components/PageBanner';
import { Loader } from '../components/Spinner';
import { IconArrowRight } from '../components/Icons';

export function BlogDetailPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { slug } = useParams<{ slug: string }>();
  const { data: blog, isLoading } = useBlog(slug);

  if (isLoading || !blog) return <Loader />;

  const title = pickName(blog.translations, lang, blog.slug);
  const content = pickField(blog.translations, lang, 'content');
  const excerpt = pickField(blog.translations, lang, 'excerpt');

  return (
    <>
      <PageBanner title={title} crumbs={[{ label: t('nav.blog'), to: '/blog' }, { label: title }]} />
      <section className="section">
        <div className="container">
          <article className="article">
            {blog.cover && <img className="article-cover" src={blog.cover.url} alt={title} />}
            <div className="blog-meta" style={{ marginBottom: 8 }}>
              {blog.publishedAt ? new Date(blog.publishedAt).toLocaleDateString() : ''}
              {blog.authorName ? ` · ${t('blog.by', { name: blog.authorName })}` : ''}
              {` · ${t('blog.views', { count: blog.viewsCount })}`}
            </div>
            {excerpt && <p className="muted" style={{ fontSize: 18 }}>{excerpt}</p>}
            <div className="article-body">{content}</div>
            <Link to="/blog" className="btn btn-outline btn-sm" style={{ marginTop: 32 }}>
              <IconArrowRight size={16} style={{ transform: 'scaleX(-1)' }} />
              {t('blog.backToBlog')}
            </Link>
          </article>
        </div>
      </section>
    </>
  );
}
