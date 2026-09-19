import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  ChevronDown,
  Plus,
  Trash2,
  UploadCloud,
  ExternalLink,
} from "lucide-react";
import { LogoMark } from "../../components/Logo";
import {
  completeCreatorOnboarding,
  getCreatorProgress,
  saveCreatorProgress,
  uploadImage,
} from "../../api/client";
import { useAuth } from "../../context/AuthContext";

const TYPES = [
  "Influencer",
  "UGC Creator",
  "Content Creator",
  "Lifestyle Vlogger",
  "Model",
  "Photographer",
  "Videographer",
  "Blogger",
  "Makeup Artist",
  "Fashion Creator",
  "Fitness Creator",
  "Gaming Creator",
  "Educator",
  "Podcaster",
  "Other",
];

const CATEGORIES = [
  "Beauty",
  "Fashion",
  "Food",
  "Fitness",
  "Tech",
  "Travel",
  "Gaming",
  "Music",
  "Lifestyle",
  "Wellness",
  "Sports",
  "Education",
  "Art & Design",
  "Comedy",
  "Automotive",
  "Pets",
];

const CONTENT = ["Reels", "Photos", "Stories", "YouTube Videos", "Shorts", "Reviews", "UGC"];
const LANGUAGES = ["English", "Nepali", "Hindi", "Newari", "Maithili"];

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

const STEPS = ["Basic profile", "Professional", "Portfolio & social", "Availability"];

type Social = {
  platform: string;
  username: string;
  profile_url: string;
  follower_count: number;
};

type Portfolio = {
  title: string;
  media_url: string;
  type?: string;
};

const parseTypes = (value: unknown): string[] => {
  if (typeof value === "string") {
    return value
      .split(/\s*(?:,|\||•)\s*/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  return [];
};

const toggle = (list: string[], value: string) =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

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

function MultiSelect({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
    <div className="onb-multi-select" ref={ref}>
      <button
        type="button"
        className={`onb-select-trigger ${open ? "open" : ""}`}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span className={selected.length ? "selected-text" : "placeholder-text"}>
          {selected.length ? `${selected.length} selected` : "Select one or more creator types"}
        </span>
        <ChevronDown className="onb-chevron" size={16} strokeWidth={1.7} />
      </button>

      {open && (
        <div className="onb-select-menu">
          {TYPES.map((item) => (
            <label className="onb-select-option" key={item}>
              <input
                type="checkbox"
                checked={selected.includes(item)}
                onChange={() => onToggle(item)}
              />
              <span>{item}</span>
            </label>
          ))}
        </div>
      )}

      {selected.length > 0 && (
        <div className="onb-selected-tags">
          {selected.map((item) => (
            <button
              type="button"
              className="onb-selected-tag"
              key={item}
              onClick={() => onToggle(item)}
            >
              {item}
              <span>×</span>
            </button>
          ))}
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

export function CreatorOnboarding() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const [photo, setPhoto] = useState<string | null>(null);
  const [name, setName] = useState(user?.full_name ?? "");
  const [username, setUsername] = useState("");
  const [location, setLocation] = useState("");
  const [types, setTypes] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [content, setContent] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [socials, setSocials] = useState<Social[]>([]);
  const [socialPlatform, setSocialPlatform] = useState("Instagram");
  const [socialUsername, setSocialUsername] = useState("");
  const [socialUrl, setSocialUrl] = useState("");
  const [followers, setFollowers] = useState("");
  const [portfolio, setPortfolio] = useState<Portfolio[]>([]);
  const [portfolioTitle, setPortfolioTitle] = useState("");
  const [availability, setAvailability] = useState("Available");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const saved = await getCreatorProgress();
        const profile = saved?.profile ?? user?.profile;

        if (!cancelled && profile) {
          setPhoto(profile.profile_image ?? null);
          setName(profile.display_name ?? user?.full_name ?? "");
          setUsername(profile.username ?? "");
          setLocation(profile.location ?? "");
          setTypes(parseTypes(profile.creator_type));
          setBio(profile.bio ?? "");
          setCategories(profile.niches ?? profile.categories ?? []);
          setContent(profile.content_types ?? []);
          setLanguages(profile.content_languages ?? profile.languages ?? []);
          setSocials(saved?.socials ?? profile.socials ?? []);
          setPortfolio(Array.isArray(profile.portfolio) ? profile.portfolio : []);
          setAvailability("Available");
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

  const upload = async (file: File, kind: "photo" | "portfolio") => {
    setError("");
    setUploading(true);

    try {
      const { url } = await uploadImage(file);

      if (kind === "photo") {
        setPhoto(url);
      } else {
        setPortfolio((current) => [
          ...current,
          {
            title: portfolioTitle.trim() || "Portfolio work",
            media_url: url,
            type: file.type.startsWith("video/") ? "video" : "image",
          },
        ]);
        setPortfolioTitle("");
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const saveOptional = async () => {
    if (step === 2) {
      await saveCreatorProgress({
        bio: bio.trim(),
        niches: categories,
        content_types: content,
        content_languages: languages,
      });
    }

    if (step === 3) {
      await saveCreatorProgress({ socials, portfolio });
    }

    if (step === 4) {
      await saveCreatorProgress({ availability });
    }
  };

  const saveBasic = async () => {
    if (!name.trim() || !username.trim() || !location.trim() || !photo || !types.length) {
      setError("Complete all required basic profile fields before continuing.");
      return;
    }

    if (socials.length === 0) {
      setError("Add at least one social profile before continuing.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const basic = {
        display_name: name.trim(),
        username: username.trim(),
        location: location.trim(),
        creator_type: types.join(", "),
        profile_image: photo,
      };

      await completeCreatorOnboarding({
        ...basic,
        bio: bio.trim() || undefined,
        niches: categories,
        content_types: content,
        content_languages: languages,
        audience_age_range: [],
        audience_location: [],
        audience_interests: [],
        socials,
        portfolio,
        availability,
      } as any);

      updateProfile?.({ ...basic, is_onboarding_complete: true, is_published: true });
      setStep(2);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  };

  const next = async () => {
    if (step === 1) {
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

  const addSocial = () => {
    const cleanUsername = socialUsername.trim().replace(/^@/, "");

    if (!cleanUsername || !socialUrl.trim()) {
      setError("Add a social username and profile URL.");
      return;
    }

    setSocials((current) => [
      ...current,
      {
        platform: socialPlatform,
        username: cleanUsername,
        profile_url: socialUrl.trim(),
        follower_count: Number(followers) || 0,
      },
    ]);

    setSocialUsername("");
    setSocialUrl("");
    setFollowers("");
    setError("");
  };

  if (loading) {
    return <div className="onb-loading">Loading your profile…</div>;
  }

  return (
    <div className="onb-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=League+Spartan:wght@400;500&family=Poppins:wght@300;400;500&display=swap');

        .onb-page{min-height:100vh;background:#fff;color:#111;font-family:Poppins,Arial,sans-serif;padding:28px 22px 70px;box-sizing:border-box}
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
        .onb-muted{margin:0;color:#777;font-size:12px;line-height:1.5}
        .onb-progress-count{color:#777;font-size:11px}
        .onb-steps{display:grid;gap:8px;margin-top:25px}
        .onb-steps.four{grid-template-columns:repeat(4,1fr)}
        .onb-step{min-width:0;border-top:1px solid #ddd;padding-top:10px;color:#999;font-size:10px;line-height:1.4}
        .onb-step.active,.onb-step.done{border-color:#111;color:#111}
        .onb-step-dot{width:22px;height:22px;display:grid;place-items:center;margin-bottom:7px;border:1px solid #d5d5d5;border-radius:50%;font-size:10px}
        .onb-step.active .onb-step-dot,.onb-step.done .onb-step-dot{background:#111;color:#fff;border-color:#111}
        .onb-card{border:1px solid #e2e2e2;border-radius:15px;padding:34px 38px;background:#fff;box-shadow:0 18px 50px rgba(0,0,0,.045)}
        .onb-card h2{margin:0 0 5px;font:400 25px/1.15 'League Spartan',sans-serif}
        .onb-sub{margin:0 0 28px;color:#777;font-size:12px;line-height:1.6}
        .onb-field{margin-bottom:21px}
        .onb-label{display:block;margin-bottom:8px;font-size:11px;font-weight:500}
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
        .onb-multi-select{position:relative}
        .onb-select-trigger{width:100%;min-height:43px;display:flex;align-items:center;justify-content:space-between;box-sizing:border-box;border:1px solid #d8d8d8!important;border-radius:8px;background:#fff!important;color:#111!important;padding:10px 12px;font:400 12px Poppins,Arial,sans-serif;text-align:left;cursor:pointer;box-shadow:none!important;outline:none!important}
        .onb-select-trigger:hover{border-color:#aaa!important;background:#fff!important;color:#111!important}
        .onb-select-trigger.open{border-color:#111!important;background:#fff!important;color:#111!important;box-shadow:0 0 0 1px #111!important}
        .onb-chevron{color:#666!important;flex:none}
        .placeholder-text{color:#999}
        .selected-text{color:#111}
        .onb-select-menu{position:absolute;z-index:100;left:0;right:0;top:calc(100% + 6px);display:grid;grid-template-columns:1fr 1fr;gap:2px 4px;max-height:235px;overflow-y:auto;overscroll-behavior:contain;padding:7px;border:1px solid #e1e1e1;border-radius:9px;background:#fff!important;box-shadow:0 16px 35px rgba(0,0,0,.08);box-sizing:border-box;color:#111!important}
        .onb-select-menu::-webkit-scrollbar{width:6px}
        .onb-select-menu::-webkit-scrollbar-track{background:transparent}
        .onb-select-menu::-webkit-scrollbar-thumb{background:#d4d4d4;border-radius:99px}
        .onb-select-option{display:flex;align-items:center;gap:9px;min-height:38px;padding:7px 9px;border-radius:6px;color:#222!important;background:#fff!important;font-size:12px;cursor:pointer}
        .onb-select-option:hover{background:#f5f5f5!important;color:#111!important}
        .onb-select-option input{width:14px;height:14px;margin:0;accent-color:#111}
        .onb-selected-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
        .onb-selected-tag{border:1px solid #ddd;border-radius:999px;background:#f7f7f7;color:#222;padding:5px 9px;font:400 10px Poppins,Arial,sans-serif;cursor:pointer}
        .onb-selected-tag:hover{border-color:#111}
        .onb-help{margin:7px 0 0;color:#888;font-size:10px;line-height:1.5}
        .onb-chips{display:flex;flex-wrap:wrap;gap:7px}
        .onb-chip{border:1px solid #ddd;border-radius:999px;background:#fff;color:#444;padding:7px 11px;font:400 11px Poppins,Arial,sans-serif;cursor:pointer}
        .onb-chip:hover{border-color:#111;color:#111}
        .onb-chip.active{border-color:#111;background:#111;color:#fff}
        .onb-inline{display:flex;gap:9px}
        .onb-inline .onb-input{flex:1}
        .onb-secondary{display:inline-flex;align-items:center;gap:6px;margin-top:10px;border:1px solid #d8d8d8;border-radius:8px;background:#fff;color:#222;padding:9px 12px;font:400 11px Poppins,Arial,sans-serif;cursor:pointer}
        .onb-secondary:hover{border-color:#111}
        .onb-list{display:flex;flex-direction:column;gap:6px;margin-top:10px}
        .onb-list-row{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid #e5e5e5;border-radius:8px;padding:9px 11px;font-size:11px}
        .onb-list-row button{display:flex;align-items:center;justify-content:center;border:0;background:transparent;color:#777;padding:2px;cursor:pointer}
        .onb-list-row button:hover{color:#111}
        .onb-required-help{margin:0 0 10px!important}
        .onb-social-grid{display:grid;grid-template-columns:180px minmax(0,1fr);gap:10px}
        .onb-social-add-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;margin-top:10px}
        .onb-social-list{display:grid;gap:8px;margin-top:10px}
        .onb-social-item{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid #e5e5e5;border-radius:8px;padding:9px 11px;background:#fff}
        .onb-social-link{display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:0;flex:1;color:#111;text-decoration:none}
        .onb-social-link:hover{color:#111;text-decoration:none}
        .onb-social-link>div{display:flex;align-items:center;gap:10px;min-width:0}
        .onb-social-link strong{font-size:11px;font-weight:500;color:#111}
        .onb-social-link span{font-size:11px;color:#777;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .onb-social-link>svg{flex:none;color:#777}
        .onb-social-link:hover>svg{color:#111}
        .onb-social-item div{display:flex;align-items:center;gap:10px;min-width:0}
        .onb-social-item strong{font-size:11px;font-weight:500;color:#111}
        .onb-social-item span{font-size:11px;color:#777;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .onb-remove{display:inline-flex;align-items:center;justify-content:center;border:0!important;background:transparent!important;color:#777!important;padding:4px!important;box-shadow:none!important;cursor:pointer}
        .onb-remove:hover{color:#111!important;background:transparent!important}
        .onb-error{margin-top:8px;border:1px solid #ddd;border-radius:8px;background:#f5f5f5;color:#333;padding:10px 12px;font-size:11px}
        .onb-footer{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-top:30px;padding-top:20px;border-top:1px solid #eee}
        .onb-back,.onb-skip{display:inline-flex;align-items:center;gap:6px;border:0!important;background:transparent!important;color:#666!important;box-shadow:none!important;outline:none!important;padding:0!important;font:400 12px Poppins,Arial,sans-serif;cursor:pointer}
        .onb-back:hover,.onb-back:focus,.onb-skip:hover,.onb-skip:focus{border:0!important;background:transparent!important;color:#111!important;box-shadow:none!important;outline:none!important}
        .onb-actions{display:flex;align-items:center;gap:17px}
        .onb-primary{display:inline-flex;align-items:center;gap:7px;border:1px solid #111;border-radius:8px;background:#111;color:#fff;padding:11px 18px;font:400 12px Poppins,Arial,sans-serif;cursor:pointer;transition:transform .15s ease}
        .onb-primary:hover{background:#000;transform:translateY(-1px)}
        .onb-primary:disabled{opacity:.55;cursor:not-allowed;transform:none}
        .onb-loading{min-height:100vh;display:grid;place-items:center;color:#777;font:400 13px Poppins,Arial,sans-serif}
        @media(max-width:650px){.onb-social-grid,.onb-social-add-row{grid-template-columns:1fr}.onb-page{padding:20px 15px 50px}.onb-top{margin-bottom:35px}.onb-progress h1{font-size:29px}.onb-steps.four{grid-template-columns:1fr 1fr}.onb-card{padding:26px 20px}.onb-grid{grid-template-columns:1fr}.onb-select-menu{grid-template-columns:1fr}.onb-footer{align-items:flex-start}.onb-actions{flex-wrap:wrap;justify-content:flex-end}.onb-inline{flex-direction:column}}
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
              <p className="onb-kicker">CREATOR PROFILE</p>
              <h1>Set up your profile</h1>
              <p className="onb-muted">Step 1 is required. Everything else can be completed later.</p>
            </div>
            <span className="onb-progress-count">{step} / {STEPS.length}</span>
          </div>

          <div className="onb-steps four">
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
              <h2>Basic information</h2>
              <p className="onb-sub">
                This is the only onboarding step you must finish before entering Creator Hub.
              </p>

              <div className="onb-avatar-row">
                <div className="onb-avatar">
                  {photo ? <img src={photo} alt="Profile" /> : <Camera size={22} />}
                </div>
                <label className="onb-upload">
                  <UploadCloud size={15} />
                  {uploading ? " Uploading…" : " Add profile photo"}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void upload(file, "photo");
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>

              <div className="onb-grid">
                <Field label="Creator name *">
                  <input
                    className="onb-input"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Your creator name"
                  />
                </Field>
                <Field label="Username *">
                  <input
                    className="onb-input"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="username"
                  />
                </Field>
              </div>

              <Field label="Location *">
                <LocationField value={location} onChange={setLocation} />
                <p className="onb-help">Type a location, choose a suggestion, or enter your own.</p>
              </Field>

              <Field label="Creator type *">
                <MultiSelect selected={types} onToggle={(value) => setTypes(toggle(types, value))} />
                <p className="onb-help">Choose one or more types.</p>
              </Field>

              <Field label="Social profile *">
                <p className="onb-help onb-required-help">Add at least one public social profile. This is required so businesses can review your creator presence.</p>
                <div className="onb-social-grid">
                  <StyledSelect value={socialPlatform} onChange={setSocialPlatform}>
                    {['Instagram', 'TikTok', 'YouTube', 'Facebook', 'X', 'LinkedIn', 'Other'].map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </StyledSelect>
                  <input
                    className="onb-input"
                    value={socialUsername}
                    onChange={(event) => setSocialUsername(event.target.value)}
                    placeholder="Username or handle"
                  />
                </div>
                <div className="onb-social-add-row">
                  <input
                    className="onb-input"
                    value={socialUrl}
                    onChange={(event) => setSocialUrl(event.target.value)}
                    placeholder="https://your-social-profile.com"
                  />
                  <button type="button" className="onb-secondary" onClick={addSocial}>
                    <Plus size={14} /> Add profile
                  </button>
                </div>
                {socials.length > 0 && (
                  <div className="onb-social-list">
                    {socials.map((item, index) => (
                      <div className="onb-social-item" key={`${item.platform}-${item.profile_url}-${index}`}>
                        <a
                          className="onb-social-link"
                          href={externalHref(item.profile_url) ?? undefined}
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          <div>
                            <strong>{item.platform}</strong>
                            <span>{item.username}</span>
                          </div>
                          <ExternalLink size={13} strokeWidth={1.7} aria-hidden="true" />
                        </a>
                        <button
                          type="button"
                          className="onb-remove"
                          aria-label={`Remove ${item.platform} profile`}
                          onClick={() => setSocials((current) => current.filter((_, i) => i !== index))}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Field>
            </section>
          )}

          {step === 2 && (
            <section>
              <h2>Professional profile</h2>
              <p className="onb-sub">Add your professional details when you are ready. Everything here is optional.</p>

              <Field label="Bio">
                <textarea
                  className="onb-input onb-textarea"
                  maxLength={600}
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  placeholder="Tell businesses what you create and what makes your work useful."
                />
              </Field>

              <Field label="Categories">
                <Chips items={CATEGORIES} selected={categories} onToggle={(value) => setCategories(toggle(categories, value))} />
              </Field>

              <Field label="Content types">
                <Chips items={CONTENT} selected={content} onToggle={(value) => setContent(toggle(content, value))} />
              </Field>

              <Field label="Languages">
                <Chips items={LANGUAGES} selected={languages} onToggle={(value) => setLanguages(toggle(languages, value))} />
              </Field>
            </section>
          )}

          {step === 3 && (
            <section>
              <h2>Portfolio & social</h2>
              <p className="onb-sub">Your primary social profile is already required. Add portfolio work and any additional social profiles here when you are ready.</p>

              <Field label="Portfolio work sample">
                <div className="onb-inline">
                  <input
                    className="onb-input"
                    value={portfolioTitle}
                    onChange={(event) => setPortfolioTitle(event.target.value)}
                    placeholder="Work title (optional)"
                  />
                  <label className="onb-upload">
                    <UploadCloud size={15} />
                    {uploading ? " Uploading…" : " Add work"}
                    <input
                      type="file"
                      accept="image/*,video/*"
                      disabled={uploading}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void upload(file, "portfolio");
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>

                {portfolio.length > 0 && (
                  <div className="onb-list">
                    {portfolio.map((item, index) => (
                      <div className="onb-list-row" key={`${item.media_url}-${index}`}>
                        <span>{item.title}</span>
                        <button
                          type="button"
                          aria-label={`Remove ${item.title}`}
                          onClick={() => setPortfolio((current) => current.filter((_, i) => i !== index))}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Field>

              <Field label="Social account">
                <div className="onb-grid">
                  <StyledSelect value={socialPlatform} onChange={setSocialPlatform}>
                    <option>Instagram</option>
                    <option>TikTok</option>
                    <option>YouTube</option>
                    <option>Facebook</option>
                    <option>LinkedIn</option>
                    <option>Other</option>
                  </StyledSelect>
                  <input
                    className="onb-input"
                    value={socialUsername}
                    onChange={(event) => setSocialUsername(event.target.value)}
                    placeholder="@username"
                  />
                </div>

                <div className="onb-grid" style={{ marginTop: 10 }}>
                  <input
                    className="onb-input"
                    value={socialUrl}
                    onChange={(event) => setSocialUrl(event.target.value)}
                    placeholder="Profile URL"
                  />
                  <input
                    className="onb-input"
                    type="number"
                    min="0"
                    value={followers}
                    onChange={(event) => setFollowers(event.target.value)}
                    placeholder="Followers (optional)"
                  />
                </div>

                <button type="button" className="onb-secondary" onClick={addSocial}>
                  <Plus size={14} /> Add social account
                </button>

                {socials.length > 0 && (
                  <div className="onb-list">
                    {socials.map((item, index) => (
                      <div className="onb-list-row" key={`${item.platform}-${item.profile_url}-${index}`}>
                        <span>{item.platform} · @{item.username}</span>
                        <button
                          type="button"
                          aria-label={`Remove ${item.platform} account`}
                          onClick={() => setSocials((current) => current.filter((_, i) => i !== index))}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Field>
            </section>
          )}

          {step === 4 && (
            <section>
              <h2>Availability</h2>
              <p className="onb-sub">Let businesses know whether you are currently open to new collaborations.</p>
              <Field label="Current availability">
                <Chips items={["Available", "Not available"]} selected={[availability]} onToggle={setAvailability} />
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

function Chips({
  items,
  selected,
  onToggle,
}: {
  items: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="onb-chips">
      {items.map((item) => (
        <button
          type="button"
          key={item}
          className={`onb-chip ${selected.includes(item) ? "active" : ""}`}
          onClick={() => onToggle(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
