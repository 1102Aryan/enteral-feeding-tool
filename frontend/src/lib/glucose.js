export function classifyBand(cbg) {
    if (cbg == null || Number.isNaN(cbg)) return null;
    if (cbg < 4) return { key: "hypo", label: "Hypoglycaemia", range: "< 4" };
    if (cbg < 6) return { key: "looming", label: "Looming hypo", range: "4–6" };
    if (cbg <= 12) return { key: "target", label: "In target", range: "6–12" };
    return { key: "above", label: "Above target", range: "> 12" };
  }
  
  // Tailwind classes per band key. Colour is always shown with the label.
  export const bandStyles = {
    hypo: "bg-band-hypo/10 text-band-hypo border-band-hypo",
    looming: "bg-band-looming/10 text-band-looming border-band-looming",
    target: "bg-band-target/10 text-band-target border-band-target",
    above: "bg-band-above/10 text-band-above border-band-above",
  };