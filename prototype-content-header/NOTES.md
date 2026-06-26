# Prototype: Content Header

**Question:** What should the unified Episode header + content tab bar look like?

**Verdict:** Variant D — Three-line hierarchy

## Anatomy

```
┌─────────────────────────────────────────────────────────────────┐
│ [IconBadge]  Episode Title                                      │  line 1
│              Secondary label · duration                         │  line 2
│ ○ Brief   Detailed   Full   [+]              📄 Transcript ∧   │  line 3
└─────────────────────────────────────────────────────────────────┘
```

## Decisions locked

- **Position:** Replaces current ContentTabBar (above content, below workspace tab bar)
- **Height:** ~90px total (3 lines in one visual block, one bottom border)
- **Line 1:** Source-type icon in colored badge (24px rounded-md) + Episode title (15px Poppins semibold), truncates. Double-click to rename.
- **Line 2:** Indented under icon. Secondary label + duration, 11px, 60% opacity. Metadata line.
- **Line 3:** Content tabs (Brief/Detailed/Full/+) left-aligned, Transcript toggle right-aligned.
- **Icons (lucide-react):** Video (red), Rss (orange), Globe (blue), FileAudio (gray)
- **Icon badge:** Colored background at 15% opacity, icon at full saturation
- **Secondary label mapping:** YouTube→channel, RSS→feedTitle, Direct→hostname, Local→filename (full path on hover)
- **Fallback:** Always show icon; degrade label gracefully; show "Local file" if nothing else
- **Visibility:** Always shown (all episode statuses including ingesting)
- **Interaction:** Title editable on double-click, everything else passive

## Rejected variants

- A (Two-line unified block): title + secondary on line 1 felt cramped, tabs too close to title
- B (Single-line inline): title truncates too aggressively at 40% width, tabs feel detached
- C (Title-dominant split): tabs right-aligned on metadata line mixed navigation with info
