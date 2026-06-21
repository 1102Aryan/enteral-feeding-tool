IOB model parameters (from the guideline, for `iob.py` and `insulin-profiles.yaml`)
 
The guideline gives you the active windows directly, so you don't have to invent pharmacokinetics:
 
- **Rapid-acting analogue** (e.g. Novorapid): dosed 4-hourly; "no feed-related dose within **4 h** of feed ending" → active window ≈ 4 h.
- **Soluble/quick-acting** (e.g. Actrapid/Humulin S): dosed 6-hourly; "**6 h** of feed ending" → active window ≈ 6 h.
- **Isophane (NPH)/premixed biphasic**: intermediate; second dose at midpoint for feeds ≥16 h → longer tail.
- **Long-acting basal**: long duration **but not feed-related** — it continues regardless and must never be omitted in T1, so it's excluded from the feed-stop hypo guard (handled as its own safety rule).
Guard logic: on feed-stop, take the last *feed-related* rapid/soluble dose; if `now − dose_time < window` → flag active hypo-risk, withhold the next feed dose, prompt IV dextrose, switch to hourly CBG. Keep it simple and clearly advisory; your sponsor just needs to confirm the windows are reasonable.
