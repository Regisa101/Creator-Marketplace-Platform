import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Building2, Check, ChevronDown, ExternalLink, UploadCloud } from "lucide-react";
import { LogoMark } from "../../components/Logo";
import {
  completeBusinessOnboarding,
  getBusinessProgress,
  saveBusinessProgress,
  uploadImage,
} from "../../api/client";
import { useAuth } from "../../context/AuthContext";

const INDUSTRIES = [
  "Retail & E-commerce",
  "Agency",
  "SaaS",
  "Food & Beverage",
  "Beauty & Wellness",
  "Fashion & Apparel",
  "Tech & IT",
  "Travel & Hospitality",
  "Education",
  "Healthcare",
  "Real Estate",
  "Finance",
  "Entertainment",
  "Non-Profit",
  "Automotive",
  "Other",
];

const LOCATIONS = [
  "Kathmandu, Nepal",
  "Lalitpur, Nepal",
  "Bhaktapur, Nepal",
  "Pokhara, Nepal",
  "Chitwan, Nepal",
  "Biratnagar, Nepal",
  "Butwal, Nepal",
  "Bharatpur, Nepal",
  "Dharan, Nepal",
  "Hetauda, Nepal",
  "Janakpur, Nepal",
  "Nepalgunj, Nepal",
  "Dhangadhi, Nepal",
  "Itahari, Nepal",
  "Birgunj, Nepal",
  "Birtamod, Nepal",
  "Banepa, Nepal",
  "Tansen, Nepal",
  "Gorkha, Nepal",
  "Lumbini, Nepal",
  "Mustang, Nepal",
  "Nagarkot, Nepal",
  "Nationwide, Nepal",
  "International",
];

const STEPS = ["Business profile", "Contact", "Online presence"];

function LocationField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const suggestions = LOCATIONS.filter((item) =>
    item.toLowerCase().includes(value.trim().toLowerCase()),
  );

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    if (open) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <div className="onb-location" ref={ref}>
      <div className={`onb-location-control ${open ? "open" : ""}`}>
        <input
          className="onb-input onb-location-input"
          value={value}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
          }}
          placeholder="Start typing your city or location"
          autoComplete="off"
        />
        <button
          type="button"
          className="onb-icon-trigger"
          aria-label="Show location suggestions"
          onClick={() => setOpen((current) => !current)}
        >
          <ChevronDown size={16} strokeWidth={1.7} />
        </button>
      </div>

      {open && (
        <div className="onb-suggestion-menu">
          {suggestions.length > 0 ? (
            suggestions.map((item) => (
              <button
                type="button"
                className={`onb-suggestion ${item === value ? "selected" : ""}`}
                key={item}
                onClick={() => {
                  onChange(item);
                  setOpen(false);
                }}
              >
                {item}
              </button>
            ))
          ) : (
            <div className="onb-no-suggestions">No matching suggestion. You can enter your own location.</div>
          )}
        </div>
      )}
    </div>
  );
}

function StyledSelect({
  value,
  onChange,
  children,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  placeholder?: string;
}) {
  return (
    <div className="onb-native-select">
      <select
        className="onb-input onb-select-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {children}
      </select>
      <ChevronDown className="onb-native-chevron" size={16} strokeWidth={1.7} />
    </div>
  );
}

function externalHref(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function ExternalProfileLink({ label, value }: { label: string; value: string }) {
  const href = externalHref(value);
  if (!href) return null;

  return (
    <a
      className="onb-external-link"
      href={href}
      target="_blank"
      rel="noreferrer noopener"
    >
      <span>{label}</span>
      <span className="onb-external-value">{value}</span>
      <ExternalLink size={13} strokeWidth={1.7} aria-hidden="true" />
    </a>
  );
}

export function BusinessOnboarding() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const [logo, setLogo] = useState<string | null>(null);
  const [name, setName] = useState(user?.profile?.company_name ?? user?.full_name ?? "");
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [contactName, setContactName] = useState(user?.full_name ?? "");
  const contactEmail = user?.email ?? "";
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [companySocial, setCompanySocial] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [otherSocial, setOtherSocial] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const saved = await getBusinessProgress();
        const profile = saved?.profile ?? user?.profile;

        if (!cancelled && profile) {
          setLogo(profile.logo_url ?? null);
          setName(profile.company_name ?? user?.full_name ?? "");
          setIndustry(profile.industry ?? "");
          setLocation(profile.location ?? "");
          setDescription(profile.description ?? "");
          setContactName(profile.contact_person_name ?? user?.full_name ?? "");
          setPhone(profile.contact_phone ?? "");
          setWebsite(profile.website ?? "");
          setCompanySocial(profile.social_links?.company ?? "");
          setInstagram(profile.social_links?.instagram ?? "");
          setFacebook(profile.social_links?.facebook ?? "");
          setOtherSocial(profile.social_links?.other ?? "");
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.full_name]);

  const uploadLogo = async (file: File) => {
    setError("");
    setUploading(true);

    try {
      const { url } = await uploadImage(file);
      setLogo(url);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Logo upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const saveOptional = async () => {
    if (step === 2) {
      await saveBusinessProgress({
        contact_person_name: contactName.trim() || undefined,
        contact_phone: phone.trim() || undefined,
      });
    }

    if (step === 3) {
      await saveBusinessProgress({
        website: website.trim() || undefined,
        social_links: {
          company: companySocial.trim() || undefined,
          instagram: instagram.trim() || undefined,
          facebook: facebook.trim() || undefined,
          other: otherSocial.trim() || undefined,
        },
      } as any);
    }
  };

  const saveBasic = async () => {
    if (!name.trim() || !industry || !location.trim() || !description.trim() || !logo) {
      setError("Complete all required business profile fields before continuing.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const basic = {
        company_name: name.trim(),
        industry,
        location: location.trim(),
        description: description.trim(),
        logo_url: logo,
      };

      await completeBusinessOnboarding({
        ...basic,
        contact_person_name: contactName.trim() || undefined,
        contact_phone: phone.trim() || undefined,
        website: website.trim() || undefined,
        social_links: {
          company: companySocial.trim() || undefined,
          instagram: instagram.trim() || undefined,
          facebook: facebook.trim() || undefined,
          other: otherSocial.trim() || undefined,
        },
      } as any);

      updateProfile?.({ ...basic, is_onboarding_complete: true, is_published: true });
      setStep(2);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Could not save your business profile.");
    } finally {
      setSaving(false);
    }
  };

  const next = async () => {
    if (step === 1) {
      if (!name.trim() || !industry.trim() || !location.trim() || !description.trim()) {
        setError("Complete all required business profile fields before continuing.");
        return;
      }

      if (!website.trim() && !companySocial.trim()) {
        setError("Add either your company website or a company social profile before continuing.");
        return;
      }

      await saveBasic();
      return;
    }

    setSaving(true);
    setError("");

    try {
      await saveOptional();
      if (step < STEPS.length) {
        setStep(step + 1);
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Could not save your progress.");
    } finally {
      setSaving(false);
    }
  };

  const skip = async () => {
    if (step === 1) return;

    setSaving(true);
    setError("");

    try {
      await saveOptional();
      if (step < STEPS.length) {
        setStep(step + 1);
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Could not save your progress.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="onb-loading">Loading your profile…</div>;
  }

  return (
    <div className="onb-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=League+Spartan:wght@400;500&family=Poppins:wght@300;400;500&display=swap');

        .onb-page{min-height:100vh;background:#fff;color:#111;font-family:Poppins,Arial,sans-serif;padding:28px 22px 70px;box-sizing:border-box;font-weight:400}.onb-page p,.onb-page label,.onb-page input,.onb-page textarea,.onb-page select,.onb-page button,.onb-page a{font-family:Poppins,Arial,sans-serif}
        .onb-shell{width:100%;max-width:920px;margin:0 auto}
        .onb-top{position:relative;display:flex;align-items:center;justify-content:center;height:34px;margin-bottom:52px}
        .onb-logo{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:0!important;margin:0!important;border:0!important;background:transparent!important;color:#111!important;box-shadow:none!important;outline:none!important;text-decoration:none!important;cursor:pointer}
        .onb-logo:hover,.onb-logo:focus,.onb-logo:focus-visible,.onb-logo:active{border:0!important;background:transparent!important;color:#111!important;box-shadow:none!important;outline:none!important;text-decoration:none!important}
        .onb-logo span{font:500 23px/1 'League Spartan',sans-serif}
        .onb-exit{position:absolute;right:0;top:50%;transform:translateY(-50%);padding:0!important;margin:0!important;border:0!important;background:transparent!important;color:#666!important;box-shadow:none!important;outline:none!important;font:400 12px Poppins,Arial,sans-serif;cursor:pointer}
        .onb-exit:hover,.onb-exit:focus,.onb-exit:focus-visible,.onb-exit:active{border:0!important;background:transparent!important;color:#111!important;box-shadow:none!important;outline:none!important;text-decoration:underline;text-underline-offset:3px}
        .onb-progress{margin-bottom:28px}
        .onb-progress-head{display:flex;justify-content:space-between;align-items:flex-end;gap:20px}
        .onb-kicker{margin:0 0 5px;font-size:10px;letter-spacing:.14em;color:#777}
        .onb-progress h1{margin:0 0 5px;font:400 34px/1.1 'League Spartan',sans-serif;letter-spacing:-.3px}
        .onb-muted{margin:0;color:#777;font-size:12px;font-weight:400;line-height:1.5}
        .onb-progress-count{color:#777;font-size:11px}
        .onb-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:25px}
        .onb-step{min-width:0;border-top:1px solid #ddd;padding-top:10px;color:#999;font-size:10px;line-height:1.4}
        .onb-step.active,.onb-step.done{border-color:#111;color:#111}
        .onb-step-dot{width:22px;height:22px;display:grid;place-items:center;margin-bottom:7px;border:1px solid #d5d5d5;border-radius:50%;font-size:10px}
        .onb-step.active .onb-step-dot,.onb-step.done .onb-step-dot{background:#111;color:#fff;border-color:#111}
        .onb-card{border:1px solid #e2e2e2;border-radius:15px;padding:34px 38px;background:#fff;box-shadow:0 18px 50px rgba(0,0,0,.045)}
        .onb-card h2{margin:0 0 5px;font:400 25px/1.15 'League Spartan',sans-serif}
        .onb-sub{margin:0 0 28px;color:#777;font-size:12px;line-height:1.6}
        .onb-field{margin-bottom:21px}
        .onb-label{display:block;margin-bottom:8px;font-size:11px;font-weight:500;color:#111}
        .onb-input{width:100%;min-height:43px;box-sizing:border-box;border:1px solid #d8d8d8;border-radius:8px;background:#fff!important;color:#111!important;padding:10px 12px;font:400 12px Poppins,Arial,sans-serif;outline:none;box-shadow:none}
        .onb-input:focus{border-color:#111}
        .onb-input::placeholder{color:#aaa}
        .onb-input:disabled{background:#f8f8f8;color:#777}
        .onb-textarea{min-height:105px;resize:vertical}
        .onb-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px}
        .onb-avatar-row{display:flex;align-items:center;gap:14px;margin-bottom:26px}
        .onb-avatar{width:68px;height:68px;flex:none;display:grid;place-items:center;overflow:hidden;border-radius:50%;background:#f3f3f3;color:#777}
        .onb-avatar img{width:100%;height:100%;object-fit:cover}
        .onb-upload{display:inline-flex;align-items:center;gap:6px;border:1px solid #d8d8d8;border-radius:8px;background:#fff;color:#222;padding:9px 12px;font:400 11px Poppins,Arial,sans-serif;cursor:pointer}
        .onb-upload:hover{border-color:#111}
        .onb-upload input{display:none}
        .onb-native-select{position:relative}
        .onb-select-input{appearance:none;-webkit-appearance:none;padding-right:38px;cursor:pointer;background:#fff!important;color:#111!important}
        .onb-native-chevron{position:absolute;right:12px;top:50%;transform:translateY(-50%);pointer-events:none;color:#666!important}
        .onb-location{position:relative}
        .onb-location-control{position:relative}
        .onb-location-input{padding-right:40px}
        .onb-location-control.open .onb-location-input{border-color:#111;box-shadow:0 0 0 1px #111}
        .onb-icon-trigger{position:absolute;right:1px;top:1px;width:40px;height:41px;display:grid;place-items:center;border:0!important;border-radius:0 7px 7px 0;background:transparent!important;color:#666!important;padding:0;cursor:pointer;box-shadow:none!important;outline:none!important}
        .onb-icon-trigger:hover{color:#111!important;background:#fafafa!important;border:0!important;box-shadow:none!important}
        .onb-suggestion-menu{position:absolute;z-index:100;left:0;right:0;top:calc(100% + 6px);max-height:220px;overflow-y:auto;overscroll-behavior:contain;padding:6px;border:1px solid #e1e1e1;border-radius:9px;background:#fff!important;box-shadow:0 16px 35px rgba(0,0,0,.08);box-sizing:border-box;color:#111!important}
        .onb-suggestion-menu::-webkit-scrollbar{width:6px}
        .onb-suggestion-menu::-webkit-scrollbar-track{background:transparent}
        .onb-suggestion-menu::-webkit-scrollbar-thumb{background:#d4d4d4;border-radius:99px}
        .onb-suggestion{display:block;width:100%;border:0!important;border-radius:6px;background:#fff!important;color:#222!important;text-align:left;padding:9px 10px;font:400 12px Poppins,Arial,sans-serif;cursor:pointer;box-shadow:none!important}
        .onb-suggestion:hover,.onb-suggestion.selected{background:#f5f5f5!important;color:#111!important;border:0!important;box-shadow:none!important}
        .onb-no-suggestions{padding:10px;color:#888;font-size:11px;line-height:1.5}
        .onb-help{margin:7px 0 0;color:#888;font-size:10px;line-height:1.5}
        .onb-external-links{display:grid;gap:7px;margin-top:9px}
        .onb-external-link{display:flex;align-items:center;gap:8px;min-width:0;padding:9px 10px;border:1px solid #e5e5e5;border-radius:8px;background:#fff;color:#222;text-decoration:none;font:400 11px Poppins,Arial,sans-serif;transition:border-color .15s ease,background .15s ease}
        .onb-external-link:hover{border-color:#bdbdbd;background:#fafafa;color:#111}
        .onb-external-link span:first-child{flex:none;font-weight:400;color:#555}
        .onb-external-value{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#777}
        .onb-external-link svg{margin-left:auto;flex:none;color:#777}
        .onb-external-link:hover svg{color:#111}
        .onb-required-help{margin:0 0 10px!important}
        .onb-error{margin-top:8px;border:1px solid #ddd;border-radius:8px;background:#f5f5f5;color:#333;padding:10px 12px;font-size:11px}
        .onb-footer{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-top:30px;padding-top:20px;border-top:1px solid #eee}
        .onb-back,.onb-skip{display:inline-flex;align-items:center;gap:6px;border:0!important;background:transparent!important;color:#666!important;box-shadow:none!important;outline:none!important;padding:0!important;font:400 12px Poppins,Arial,sans-serif;cursor:pointer}
        .onb-back:hover,.onb-back:focus,.onb-skip:hover,.onb-skip:focus{border:0!important;background:transparent!important;color:#111!important;box-shadow:none!important;outline:none!important}
        .onb-actions{display:flex;align-items:center;gap:17px}
        .onb-primary{display:inline-flex;align-items:center;gap:7px;border:1px solid #111;border-radius:8px;background:#111;color:#fff;padding:11px 18px;font:400 12px Poppins,Arial,sans-serif;cursor:pointer;transition:transform .15s ease}
        .onb-primary:hover{background:#000;transform:translateY(-1px)}
        .onb-primary:disabled{opacity:.55;cursor:not-allowed;transform:none}
        .onb-loading{min-height:100vh;display:grid;place-items:center;color:#777;font:400 13px Poppins,Arial,sans-serif}
        @media(max-width:650px){.onb-page{padding:20px 15px 50px}.onb-top{margin-bottom:35px}.onb-progress h1{font-size:29px}.onb-steps{grid-template-columns:1fr 1fr}.onb-card{padding:26px 20px}.onb-grid{grid-template-columns:1fr}.onb-footer{align-items:flex-start}.onb-actions{flex-wrap:wrap;justify-content:flex-end}}
      `}</style>

      <div className="onb-shell">
        <header className="onb-top">
          <Link to="/" className="onb-logo" aria-label="Go to creatorhub landing page">
            <LogoMark size={27} />
            <span>creatorhub</span>
          </Link>
          <button type="button" className="onb-exit" onClick={() => navigate("/dashboard")}>
            Skip for now
          </button>
        </header>

        <div className="onb-progress">
          <div className="onb-progress-head">
            <div>
              <p className="onb-kicker">BRAND PROFILE</p>
              <h1>Set up your business profile</h1>
              <p className="onb-muted">Step 1 is required. Everything else can be completed later.</p>
            </div>
            <span className="onb-progress-count">{step} / {STEPS.length}</span>
          </div>

          <div className="onb-steps">
            {STEPS.map((label, index) => (
              <div
                className={`onb-step ${index + 1 === step ? "active" : ""} ${index + 1 < step ? "done" : ""}`}
                key={label}
              >
                <div className="onb-step-dot">
                  {index + 1 < step ? <Check size={13} /> : index + 1}
                </div>
                <span>{label}{index === 0 ? " · Required" : " · Optional"}</span>
              </div>
            ))}
          </div>
        </div>

        <main className="onb-card">
          {step === 1 && (
            <section>
              <h2>Business information</h2>
              <p className="onb-sub">This is the only onboarding step you must finish before entering Creator Hub.</p>

              <div className="onb-avatar-row">
                <div className="onb-avatar">
                  {logo ? <img src={logo} alt="Business logo" /> : <Building2 size={22} />}
                </div>
                <label className="onb-upload">
                  <UploadCloud size={15} />
                  {uploading ? " Uploading…" : " Add business logo"}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadLogo(file);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>

              <div className="onb-grid">
                <Field label="Business name *">
                  <input
                    className="onb-input"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Your business name"
                  />
                </Field>

                <Field label="Industry *">
                  <StyledSelect value={industry} onChange={setIndustry} placeholder="Select an industry">
                    {INDUSTRIES.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </StyledSelect>
                </Field>
              </div>

              <Field label="Location *">
                <LocationField value={location} onChange={setLocation} />
                <p className="onb-help">Type a location, choose a suggestion, or enter your own.</p>
              </Field>

              <Field label="Company website or social profile *">
                <p className="onb-help onb-required-help">Add at least one public company website or social profile so creators can verify your business.</p>
                <div className="onb-grid">
                  <input
                    className="onb-input"
                    value={website}
                    onChange={(event) => setWebsite(event.target.value)}
                    placeholder="https://yourwebsite.com"
                  />
                  <input
                    className="onb-input"
                    value={companySocial}
                    onChange={(event) => setCompanySocial(event.target.value)}
                    placeholder="Company social profile URL"
                  />
                </div>
                <p className="onb-help">Only one is required. You can add more links later.</p>
                {(externalHref(website) || externalHref(companySocial)) && (
                  <div className="onb-external-links" aria-label="Business links">
                    <ExternalProfileLink label="Website" value={website} />
                    <ExternalProfileLink label="Company social" value={companySocial} />
                  </div>
                )}
              </Field>

              <Field label="Short business description *">
                <textarea
                  className="onb-input onb-textarea"
                  maxLength={1000}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="What does your business do?"
                />
              </Field>
            </section>
          )}

          {step === 2 && (
            <section>
              <h2>Contact information</h2>
              <p className="onb-sub">Useful for communication with creators. You can add or change this later.</p>

              <Field label="Contact person">
                <input
                  className="onb-input"
                  value={contactName}
                  onChange={(event) => setContactName(event.target.value)}
                  placeholder="Contact person"
                />
              </Field>

              <Field label="Business email">
                <input className="onb-input" value={contactEmail} disabled />
              </Field>

              <Field label="Phone">
                <input
                  className="onb-input"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="Phone number"
                />
              </Field>
            </section>
          )}

          {step === 3 && (
            <section>
              <h2>Online presence</h2>
              <p className="onb-sub">Add your website and social links when you are ready. Everything here is optional.</p>

              <Field label="Website">
                <input
                  className="onb-input"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                  placeholder="https://yourwebsite.com"
                />
                <div className="onb-external-links">
                  <ExternalProfileLink label="Website" value={website} />
                </div>
              </Field>

              <Field label="Social links">
                <div className="onb-grid">
                  <input
                    className="onb-input"
                    value={instagram}
                    onChange={(event) => setInstagram(event.target.value)}
                    placeholder="Instagram URL"
                  />
                  <input
                    className="onb-input"
                    value={facebook}
                    onChange={(event) => setFacebook(event.target.value)}
                    placeholder="Facebook URL"
                  />
                </div>

                <input
                  className="onb-input"
                  style={{ marginTop: 10 }}
                  value={otherSocial}
                  onChange={(event) => setOtherSocial(event.target.value)}
                  placeholder="Other social link"
                />

                <div className="onb-external-links">
                  <ExternalProfileLink label="Instagram" value={instagram} />
                  <ExternalProfileLink label="Facebook" value={facebook} />
                  <ExternalProfileLink label="Other" value={otherSocial} />
                </div>
              </Field>
            </section>
          )}

          {error && <div className="onb-error">{error}</div>}

          <footer className="onb-footer">
            <button
              type="button"
              className="onb-back"
              onClick={() => (step === 1 ? navigate("/dashboard") : setStep(step - 1))}
            >
              <ArrowLeft size={15} />
              {step === 1 ? " Dashboard" : " Back"}
            </button>

            <div className="onb-actions">
              {step > 1 && (
                <button type="button" className="onb-skip" onClick={skip} disabled={saving}>
                  Skip for now
                </button>
              )}
              <button type="button" className="onb-primary" onClick={next} disabled={saving || uploading}>
                {saving ? "Saving…" : step === STEPS.length ? "Finish" : step === 1 ? "Save & continue" : "Continue"}
                {!saving && <ArrowRight size={15} />}
              </button>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="onb-field">
      <label className="onb-label">{label}</label>
      {children}
    </div>
  );
}
