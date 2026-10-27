import { useState } from "react";
import { LogoMark } from "./Logo";
import { isCreatorHub } from "../utils/brand";
import { categoryImage } from "../utils/categoryArt";

// Nepali brands shown on the landing hero.
// Put each brand's real logo in  public/brands/<slug>.png  (square, ~128px+).
// Until the file exists, a picture matching the card's company type is shown.
export const NEPALI_BRAND_SLUGS: Record<string, string> = {
  Bhatbhateni: "bhatbhateni",
  "Himalayan Java": "himalayan-java",
  Lali: "lali",
  "Avani Nepal": "avani-nepal",
  Daraz: "daraz",
};

export function HeroBrandLogo({ brand, category }: { brand: string; category?: string }) {
  const [failed, setFailed] = useState(false);

  if (isCreatorHub(brand)) {
    return (
      <span className="hx-logo hx-logo--tile" aria-hidden="true">
        <LogoMark size={18} />
      </span>
    );
  }

  const slug = NEPALI_BRAND_SLUGS[brand];

  // Real logo
  if (slug && !failed) {
    return (
      <span className="hx-logo hx-logo--tile" aria-hidden="true">
        <img
          src={`/brands/${slug}.png`}
          alt=""
          onError={() => setFailed(true)}
          style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
        />
      </span>
    );
  }

  // No logo file yet: picture for the company type
  return (
    <span className="hx-logo hx-logo--pic" aria-hidden="true">
      <img
        src={categoryImage(category, brand)}
        alt=""
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    </span>
  );
}