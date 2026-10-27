// CreatorHub posts campaigns of its own. Wherever a brand name is shown it
// should read "creatorhub" and use the CreatorHub logo mark.
export function isCreatorHub(name?: string | null): boolean {
  return (name || "").replace(/[\s_-]/g, "").toLowerCase() === "creatorhub";
}

export function brandDisplayName(name?: string | null, fallback = "Brand"): string {
  if (isCreatorHub(name)) return "creatorhub";
  return name || fallback;
}