import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { ExternalLink, X } from 'lucide-react';

const API_ORIGIN = 'http://localhost:8000';

export function mediaUrl(value?: string | null) {
  if (!value) return '';
  if (/^(https?:)?\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')) return value;
  if (value.startsWith('/api/')) return `${API_ORIGIN}${value}`;
  return `${API_ORIGIN}/${value.replace(/^\/+/, '')}`;
}

/** Makes "instagram.com/x" clickable by adding https:// when the scheme is missing. */
export function externalHref(value?: string | null) {
  const v = (value || '').trim();
  if (!v) return '';
  if (/^(https?:)?\/\//i.test(v) || v.startsWith('mailto:') || v.startsWith('tel:')) return v;
  return `https://${v}`;
}

export interface LightboxItem {
  src: string;
  alt?: string;
  type?: 'image' | 'video';
}

/** Full-screen viewer for profile pictures, logos and portfolio work. */
export function Lightbox({ item, onClose }: { item: LightboxItem | null; onClose: () => void }) {
  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [item, onClose]);

  if (!item) return null;

  return (
    <div className="pp-lightbox" onClick={onClose} role="dialog" aria-modal="true">
      <button type="button" className="pp-lightbox-close" onClick={onClose} aria-label="Close">
        <X size={18} />
      </button>

      <div className="pp-lightbox-body" onClick={(e) => e.stopPropagation()}>
        {item.type === 'video' ? (
          <video src={item.src} controls autoPlay />
        ) : (
          <img src={item.src} alt={item.alt || ''} />
        )}
        <a className="pp-lightbox-open" href={item.src} target="_blank" rel="noreferrer">
          Open original <ExternalLink size={12} />
        </a>
      </div>
    </div>
  );
}

export function Section({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: ReactNode;
}) {
  return (
    <section className="pp-section">
      <div className="pp-section-head">
        <h2>{title}</h2>
        {sub && <span>{sub}</span>}
      </div>
      {children}
    </section>
  );
}

export function PublicProfileStyles() {
  return (
    <style>{`
      .pp-page{min-height:100vh;background:#fcfaf9;font-family:Poppins,sans-serif;color:#111;padding:100px 20px 70px}
      .pp-wrap{max-width:960px;margin:0 auto}
      .pp-back{display:inline-flex;align-items:center;gap:6px;margin-bottom:16px;padding:0;border:0;background:none;color:#666;font:400 12px Poppins,sans-serif;cursor:pointer;text-decoration:none}
      .pp-back:hover{color:#111}
      .pp-card{background:#fff;border:1px solid #e6e6e6;border-radius:16px;overflow:hidden}
      .pp-cover{height:92px;background:linear-gradient(135deg,#f0ede9,#e7e2dc)}
      .pp-header{padding:0 28px 22px;display:flex;gap:18px;align-items:flex-end;margin-top:-38px;flex-wrap:wrap}
      .pp-avatar{width:88px;height:88px;border-radius:50%;border:4px solid #fff;background:#111;color:#fff;display:flex;align-items:center;justify-content:center;font:500 28px Poppins,sans-serif;overflow:hidden;padding:0;flex:none}
      .pp-avatar.is-square{border-radius:18px}
      .pp-avatar img{width:100%;height:100%;object-fit:cover;display:block}
      button.pp-avatar{cursor:zoom-in}
      .pp-id{padding-top:42px;min-width:0}
      .pp-name{margin:0;font:500 24px 'League Spartan',Poppins,sans-serif;letter-spacing:-.01em}
      .pp-sub{margin:2px 0 0;font:400 12.5px Poppins,sans-serif;color:#777}
      .pp-meta{display:flex;flex-wrap:wrap;gap:6px 18px;margin-top:10px;font:400 12.5px Poppins,sans-serif;color:#666}
      .pp-meta span,.pp-meta a{display:inline-flex;align-items:center;gap:6px}
      .pp-meta a{color:#111;text-decoration:underline;text-underline-offset:3px}
      .pp-tags{display:flex;flex-wrap:wrap;gap:7px;padding:0 28px 22px}
      .pp-tag{padding:5px 11px;border-radius:99px;background:#f3f1ef;font:400 11.5px Poppins,sans-serif;color:#333}
      .pp-section{padding:22px 28px;border-top:1px solid #efefef}
      .pp-section-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px}
      .pp-section-head h2{margin:0;font:500 13px Poppins,sans-serif;letter-spacing:.04em;text-transform:uppercase;color:#444}
      .pp-section-head span{font:400 11.5px Poppins,sans-serif;color:#999}
      .pp-about{margin:0;font:400 13.5px/1.7 Poppins,sans-serif;color:#444;white-space:pre-line}
      .pp-chips{display:flex;flex-wrap:wrap;gap:8px}
      .pp-chip{padding:6px 12px;border-radius:99px;background:#f3f3f3;font:400 12px Poppins,sans-serif;color:#222}
      .pp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}
      .pp-link-card{display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid #e6e6e6;border-radius:12px;text-decoration:none;color:#111;background:#fff;transition:.15s}
      .pp-link-card:hover{border-color:#bdbdbd;box-shadow:0 10px 22px -16px rgba(0,0,0,.25)}
      .pp-ico{width:36px;height:36px;border-radius:9px;background:#f4f4f5;display:flex;align-items:center;justify-content:center;flex:none;color:#333}
      .pp-link-card strong{display:block;font:500 13px Poppins,sans-serif}
      .pp-link-card small{display:block;font:400 11.5px Poppins,sans-serif;color:#888;margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .pp-link-card em{margin-left:auto;font:400 12px Poppins,sans-serif;font-style:normal;color:#555}
      .pp-info{padding:12px 14px;border:1px solid #e6e6e6;border-radius:12px}
      .pp-info small{display:block;font:400 11px Poppins,sans-serif;color:#888}
      .pp-info p{margin:3px 0 0;font:400 13px Poppins,sans-serif;color:#111}
      .pp-info a{color:#111;text-decoration:underline;text-underline-offset:3px}
      .pp-work{border:1px solid #e6e6e6;border-radius:12px;overflow:hidden;background:#fff;display:flex;flex-direction:column}
      .pp-work-media{position:relative;aspect-ratio:4/3;background:#f4f4f5;display:flex;align-items:center;justify-content:center;border:0;padding:0;width:100%}
      button.pp-work-media{cursor:zoom-in}
      .pp-work-media img,.pp-work-media video{width:100%;height:100%;object-fit:cover;display:block}
      .pp-work-body{padding:11px 13px 13px}
      .pp-work-body strong{display:block;font:500 13px Poppins,sans-serif}
      .pp-work-body p{margin:3px 0 0;font:400 11.5px/1.5 Poppins,sans-serif;color:#777}
      .pp-open{display:inline-flex;align-items:center;gap:4px;margin-top:8px;font:400 11.5px Poppins,sans-serif;color:#111;text-decoration:underline;text-underline-offset:3px}
      .pp-campaign{display:flex;flex-direction:column;border:1px solid #e6e6e6;border-radius:12px;overflow:hidden;background:#fff;text-decoration:none;color:#111;transition:.15s}
      .pp-campaign:hover{border-color:#bdbdbd;box-shadow:0 10px 22px -16px rgba(0,0,0,.25)}
      .pp-campaign-img{aspect-ratio:16/9;background:#f4f4f5}
      .pp-campaign-img img{width:100%;height:100%;object-fit:cover;display:block}
      .pp-campaign-body{padding:11px 13px 13px}
      .pp-campaign-body small{display:block;font:400 10.5px Poppins,sans-serif;color:#888;text-transform:capitalize}
      .pp-campaign-body strong{display:block;margin-top:2px;font:500 13px/1.35 Poppins,sans-serif}
      .pp-campaign-body span{display:block;margin-top:5px;font:400 11.5px Poppins,sans-serif;color:#777}
      .pp-history{display:flex;flex-direction:column;gap:8px}
      .pp-history-item{display:flex;align-items:center;gap:12px;padding:11px 14px;border:1px solid #e6e6e6;border-radius:12px;background:#fff}
      .pp-history-item a{color:#111;text-decoration:none}
      .pp-history-item a:hover{text-decoration:underline}
      .pp-history-main{flex:1;min-width:0}
      .pp-history-main strong{display:block;font:500 13px Poppins,sans-serif}
      .pp-history-main small{display:block;font:400 11.5px Poppins,sans-serif;color:#888;margin-top:1px}
      .pp-status{font:400 11px Poppins,sans-serif;padding:3px 10px;border-radius:99px;background:#f1f1f1;color:#333;white-space:nowrap}
      .pp-status.is-done{background:#e7f6ec;color:#1e8a4c}
      .pp-avatar-sm{width:40px;height:40px;border-radius:50%;background:#111;color:#fff;display:flex;align-items:center;justify-content:center;font:500 14px Poppins,sans-serif;overflow:hidden;flex:none}
      .pp-avatar-sm img{width:100%;height:100%;object-fit:cover}
      .pp-empty{padding:14px 0;font:400 12.5px Poppins,sans-serif;color:#999}
      .pp-state{text-align:center;padding:80px 20px;color:#777;font:400 13px Poppins,sans-serif;background:#fff;border:1px solid #e6e6e6;border-radius:16px}

      .pp-lightbox{position:fixed;inset:0;z-index:300;background:rgba(10,10,12,.82);display:flex;align-items:center;justify-content:center;padding:24px;cursor:zoom-out}
      .pp-lightbox-body{max-width:min(92vw,1100px);max-height:90vh;display:flex;flex-direction:column;align-items:center;gap:10px;cursor:default}
      .pp-lightbox-body img,.pp-lightbox-body video{max-width:100%;max-height:80vh;border-radius:10px;background:#000;display:block}
      .pp-lightbox-open{display:inline-flex;align-items:center;gap:5px;color:#fff;font:400 12px Poppins,sans-serif;text-decoration:underline;text-underline-offset:3px}
      .pp-lightbox-close{position:absolute;top:18px;right:18px;width:36px;height:36px;border-radius:50%;border:0;background:rgba(255,255,255,.14);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer}
      .pp-lightbox-close:hover{background:rgba(255,255,255,.26)}

      @media(max-width:640px){.pp-header{padding:0 18px 18px}.pp-section,.pp-tags{padding-left:18px;padding-right:18px}.pp-grid{grid-template-columns:1fr}}
    `}</style>
  );
}