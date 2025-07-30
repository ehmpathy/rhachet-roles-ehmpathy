# .brief: focal.tradeoffs

## what

**focal.tradeoffs** describe the physical constraint that links:

- **focal.acuity** — the fineness of detail resolvable **at the focal plane**
- **focal.breadth** — the angular or spatial extent of the field of view (FoV)
- **focal.distance** — the distance **from the lens to the focal plane**
- **focal.depth** — the range of distances **around the focal plane** that remain acceptably sharp

These four factors are coupled by the geometry of light: changing one requires compensating adjustments to at least one of the others. The relationship models the inescapable tradeoffs in all optical focus systems.

---

## equation

Assuming constant sensor size and fixed circle of confusion:

\`\`\`ts
// given
focal.depth ∝ N² × focal.distance² × focal.breadth²
focal.acuity ∝ 1 / N

// then
N ∝ 1 / focal.acuity
focal.depth ∝ (1 / focal.acuity)² × focal.distance² × focal.breadth²
focal.depth ∝ focal.distance² × focal.breadth² / focal.acuity²

// therefore
focal.acuity² × focal.depth ∝ focal.distance² × focal.breadth²
\`\`\`

---

## key relationship

\`\`\`
focal.acuity² × focal.depth ∝ focal.distance² × focal.breadth²
\`\`\`

> You can only maximize two at a time — the other two must yield.

---

## variable meanings

- **focal.acuity** — how finely your lens resolves detail at the point of focus
- **focal.breadth** — how wide your frame sees (field of view)
- **focal.depth** — how far the focus zone stretches through space
- **focal.distance** — how close or far the focal plane is set

---

## tradeoff matrix

| Want to increase…     | Compensate by…                                   |
|------------------------|--------------------------------------------------|
| **focal.acuity** ↑     | decrease depth ↓, step back ↑, narrow breadth ↓ |
| **focal.breadth** ↑    | reduce acuity ↓, step back ↑, flatten depth ↓   |
| **focal.depth** ↑      | reduce acuity ↓, step back ↑, compress breadth ↓|
| **focal.distance** ↓   | reduce depth ↓, increase acuity ↑, narrow breadth ↓ |

---

## verbal examples

- want **finer details**? (focal.acuity++)
- then, either
  - step back (focal.distance++)
  - collapse depth (focal.depth--)
  - crop field of view (focal.breadth--)

- want a **wider scene**? (focal.breadth++)
- then, either
  - reduce acuity (focal.acuity--)
  - step back (focal.distance++)
  - tolerate shallow depth (focal.depth--)

- want **deeper focus**? (focal.depth++)
- then, either
  - reduce acuity (focal.acuity--)
  - step back (focal.distance++)
  - narrow scene (focal.breadth--)

- want to get **closer**? (focal.distance--)
- then, either
  - reduce depth (focal.depth--)
  - increase sharpness (focal.acuity++)
  - narrow scene (focal.breadth--)

---

## best practice zone

For full-frame photography:

- Aperture: f/5.6 to f/8
- Distance: 2–5 meters
- Focal length: 35mm–85mm (moderate breadth)

This keeps the optical balance manageable:

- **focal.acuity**: avoids diffraction or aberration
- **focal.breadth**: flexible for framing
- **focal.depth**: useful for subject layering
- **focal.distance**: compositional stability
