import { Link } from 'react-router-dom';
import { IconArrowRight } from './Icons';

interface Props {
  eyebrow?: string;
  title: string;
  desc?: string;
  center?: boolean;
  viewAll?: { to: string; label: string };
}

export function SectionHeading({ eyebrow, title, desc, center, viewAll }: Props) {
  if (viewAll) {
    return (
      <div className="section-head">
        <div className="heading">
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h2>{title}</h2>
          {desc && <p>{desc}</p>}
        </div>
        <Link to={viewAll.to} className="btn btn-outline btn-sm">
          {viewAll.label}
          <IconArrowRight size={16} />
        </Link>
      </div>
    );
  }
  return (
    <div className={`heading ${center ? 'heading-center' : ''}`} style={{ marginBottom: 36 }}>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2>{title}</h2>
      {desc && <p>{desc}</p>}
    </div>
  );
}
