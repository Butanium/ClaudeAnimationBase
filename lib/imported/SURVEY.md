# Harvest survey (2026-09-25, harvester)

What was checked for lib/imported/, so a later harvest can skip what's already been read. Clones: /var/tmp/clawd-harvest/
(`forks/` = upstream + every fork with work as a remote).

Upstream JohnHeibel/ClaudeAnimationBase: MIT since ca86b56 (2026-09-23T20:30:00Z); repo created 20:27, so every fork
(all created after 20:30) carries the LICENSE. Checked: each fork branch's LICENSE is byte-identical to upstream's.

## Forks (36; every branch compared to JohnHeibel:main)

Nothing new (identical to upstream main, or behind it): StuBehan, cd1517, banditburai, amikovid, Dor5hacham, Vicky8106,
gcode9341, flipkast, dellreey, m0sth8, yar-malik, seanphan, n1ckfg, SandraBiwolL, Hongxin-Chen, rtimwilson, mattykuch,
0xharryriddle, faskety, conorbronsdon, snegnik, shadowcodex-forks, philipdaquin, janbam; Butanium (our own PR branches,
merged upstream; pr-assets = one PR image).

With work (MIT, LICENSE unchanged at the tip):
| fork / branch | tip | ahead | what | verdict |
|---|---|---|---|---|
| bin38 / claude/gallant-maxwell-nppvog | bca4e83 | 2 | film "life" with narration; core.js, render.mjs edits | nothing importable yet: story code; `PROJECT.lite` (fills → washes) is an engine idea, reported |
| james-banks / claude/modest-dijkstra-m3ynz2 | e64e9bd | 4 | film "opus" (building, cast, street, feed...); clawd.js, core.js edits | candidate (batch 2): opus_cast.js octopus, canary + birdcage, paper doves/balls, quill, phone, memeNote; hats wig, chef (clawd.js); `?draft` + W/H from PROJECT reported |
| nerlfield / claude/wonderful-carson-hrbcuv | c9c4077 | 12 | a vertical crypto-explainer short (short/): plates, captions, sets; core.js edit | nothing: baked image plates, burned-in captions, fonts; engine ideas (PROJECT.w/h, fills: 'wash', overlayLayer) reported |
| BreakDimbo / claude/mid-autumn-animation-e86aht | 4634747 | 22 | mid-autumn film with its own core, wc.js (watercolour), cast, props, sprites | nothing: its own engine (sprites cut from images, own core), not portable |
| ishallwin20 / main, reel/bappa | 9faca7e, c815c74 | 3, 6 | Ganesh (bappa) character + reel; core.js edit | candidate (batch 2): bappa.js, a chibi Ganesha + mouse that reuse Clawd's EMO faces; `caption()` is text (no) |
| cromwellian / main, c64demoscene | d62c9c0, 9c79c4e | 1, 2 | butterfly film; a C64 demoscene film (own core64/vic) | candidate (batch 2): the butterfly (flap 0..1) and one-outline bloom; C64 film is its own engine |
| riay3 / claude/focused-ritchie-wpfp57 | 47d1969 | 6 | Hebrew film (mt_*), make-video.mjs; clawd.js, core.js, timeline.js edits | maybe: mt_common set pieces (clay lamp, menorahs, shadow puppets) are film-specific; kippah hat; `?fast` + RTL letters reported |
| bianbianzhu / main | feb20e9 | 1 | beach film (home, city, country, beach, sunset scenes) | **imported** beach.js, ukulele.js; left for batch 2: whip-pan + splash-wipe transitions, swim ring, straw/goggles hats, noteStream |
| sanaloveu / bbiriville-code-redraw-v1, bbiriville-focus-v1 | d038e6d, c91ed8f | 1, 2 | bbirri character, cat, room, props, ambience, effects | candidate (batch 2): sleeping cat, fireplace with flames, mug steam, falling leaves; focus-v1 paints over a PNG plate (no) |
| BaesTheorem/claude-animation / main, video/{artesian,artesian-v2,butterfly,dungeon} | 6ed1b4f... | 3–13 (behind 4) | bin/song-sync, sfx-mix; artesian film (rig, people, props, world, p3d), dungeon, butterfly | nothing for lib: artesian is a Canvas2D pencil engine + three.js 3D rigs (breaks "no 3D"); Kenney CC0 sfx not needed; bin/song-sync, sfx-mix are sound tools |
| ddrcoder / clawd-butterfly | 0bb7319 | 1 (behind 4) | butterfly film | nothing beyond cromwellian's butterfly (same prompt) |

## Other repos (gh search repos/code: ClaudeAnimationBase, boilSeed, brushWipe, spinView, clawd(, p5.brush)

| repo | licence | what | verdict |
|---|---|---|---|
| JohnHeibel/PDoomVideo | none | upstream author's music video (the kit's origin); 93 forks | link-only |
| az9713/opus-5.5-musical-cartoon | none | 15 s Clawd cartoon + journey docs | link-only |
| aadil6971/clawd-video | none | Claude plugin/skills for Clawd videos | link-only |
| satyajitghana/ai | none | vendors the kit as a skill (brand-crew/skills/claude-animation-base) + explainer-films engine | nothing: a copy of the kit + its own engine, no licence |
| hanisaf/2d-animation-studio | none | own engine, not the kit | nothing |
| octalline7/super-duper-octo-waffle | MIT | kit-based film (world.js, s4_night, s5_fall, s6_bloom) | nothing: a guillotine-square film; houses/cobbles/fog are film-bound |
| Ale6100/animaciones-claude | MIT | kit copy + claude_pop.js scene | nothing: one K-pop scene, story code |
| kuhnhomeuk-cell/procedural-film | MIT | skill: 30 s vertical films in JS; lib.js with boilSeed | nothing now: its own Canvas2D engine (4.7k lines), porting cost too high |
| heygen-com/hyperframes-community-skills | Apache-2.0 | day-in-my-life kit (brush-ink.js, props.js), session-story engine | not inspected (HyperFrames engine, not p5.brush) |
| PixelML/club-170hx | Apache-2.0 | a benchmark result folder containing one kit animation (mimo.js) | nothing: one generated film |
| lintsinghua/paint-mv-skills | MIT (GitHub: other) | skills for watercolour music videos | link-only (built on PDoomVideo's unlicensed code) |
| zpalmtree/dave | AGPL-3.0 | discord bot; a Clawd ad storyboard only | nothing |
| boilSeed-only hits (saeedkolivand, imann24, erulabs, KNIGHTABDO, Goosterhof) | — | unrelated (own rough/boil code, no p5.brush) | nothing |
| EveryCatchLiu/ClawdAnimation, fand/clawd-animation, BewyBoy/Clawd-Animation | none | pixel/terminal Clawd, not this style | nothing |

## Posts (web search)
Searches (ClaudeAnimationBase, Clawd p5.brush, P(doom) video) only led back to GitHub repos above.
