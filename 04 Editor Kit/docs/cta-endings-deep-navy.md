# Deep Navy CTA ending: one base, a small daily twist

Every video ends with the same CTA structure. Only the way the keyword arrives changes with the weekday, so the creativity goes into each video's edit, not the ending. The template build implements the base plus the Monday twist (`reference/scene.template.js`, `BACK.fin` / `FRONT.fin`).

## The base (every day)
1. **Flip:** on the first CTA word, the world deepens (bloom up, vignette in) and the speaker's video springs into the **FIN card** at the top: `fitCard([300, 330, 480, 640, 40], .5)`, so the head always pops out of the top edge (border behind the hair). The CTA eyebrow sits at y ≈ 132, above the head.
2. **Payoff object:** whatever the speaker promises (a file, link, list or template) springs in as a glass object below the card. If an earlier beat planted it (e.g. a `lockedFile` on "I'll give you at the end"), the same object returns and **unlocks** here. Up to three benefit chips appear on the words that name them, clear of the Instagram zone (x > 900, y 1100–1700).
3. **Keyword:** the keyword lands **once**, as a 3D extruded Inter Display Black word (hero gradient face, violet sides) at y ≈ 1130, with a shockwave ellipse and an impact sound. The caption group containing the keyword is hidden. No "Comment KEYWORD" pill.
4. **Steps:** two mono glass chips in the speaker's own words ("01 · COMMENT KEYWORD", "02 · GET THE GUIDE") at y ≈ 1300.
5. **Captions:** plain (no plate) at y ≈ 1590, with the emphasis word in its slot and the phrase below.
6. **End:** the video ends on the speaker's last frame. No tail hold, and no SFX ringing past it.

## The daily twist (only on how the keyword arrives)
| Day | Twist |
|---|---|
| Monday | **Slam:** the keyword drops from 2.2× straight into place with a riser before it |
| Tuesday | **Comment bar:** a glass comment bar types the keyword (caret, typing ticks), the send button pulses, then the word lifts out into the 3D slam |
| Wednesday | **Unlock:** a frosted glass padlock chip shows dots that resolve into the keyword, the shackle clicks open, then the slam |
| Thursday | **Split-flap:** the keyword flips in letter by letter on dark glass tiles, then extrudes into 3D |
| Friday | **Recap:** three small stills of the video's own beats fan out behind the keyword as it lands, then fold away |

If the publish day is unknown, use Monday. Keep the twist under 0.8 s before the keyword so the sync stays on the spoken word.
