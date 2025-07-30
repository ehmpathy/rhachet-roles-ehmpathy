# .brief: focal.distance

## what

**focal.distance** refers to the **distance from the lens to the focal plane** — the exact location in space where the subject is brought into geometric focus.

---

## why

While **focal.acuity** defines *how finely* the focal plane is rendered, and **focal.depth** defines *how far* sharpness extends around it, **focal.distance** defines *where* that clarity is placed in the scene.

It controls:
- Subject framing and spatial scale
- The perceived compression of background and foreground
- The sensitivity of focus and blur relationships in space

---

## governed by

### 📐 Thin lens equation

```\`\`
1/f = 1/focal.distance + 1/image_distance
\`\```

This determines **where** the focal plane sits for a given lens.

---

### 🔧 How aperture interacts — via depth of field

The **relationship between aperture and focal.distance** emerges through the depth of field equation:

```\`\`
focal.depth ≈ (2 * N * c * focal.distance²) / f²
\`\```

where
- `N` = aperture (f-number)
- `c` = circle of confusion (maximum acceptable blur)
- `focal.distance` = subject distance (from lens to focal plane)
- `f` = focal length, a fn of `focal.breadth`

simplified
- assume `c = d = 2.44 * λ * N`, a diffraction-limited system
- deref `f ∝ k₁ / focal.breadth`, by definition

```\`\`
focal.depth ∝ N² × focal.distance² × focal.breadth²
\`\```

---

## key behaviors

| Adjustment               | Effect on focal.distance           |
|--------------------------|------------------------------------|
| Physically moving closer | decreases it                       |
| Stepping farther back    | increases it                       |
| Using wider aperture     | makes the system more sensitive to small changes in focal.distance |
| Using smaller aperture   | tolerates more deviation from exact distance |

---

## creative usage

- **Close focal.distance**:
  - Emphasizes subject
  - Increases blur and isolation
  - Requires precision

- **Far focal.distance**:
  - Expands depth
  - Stabilizes scene-wide focus
  - Suits landscapes, architecture, and static subjects

---

## limitations

- Very close distances drastically reduce focal.depth
- Large apertures require extremely accurate focusing at short distances
- Focal.distance interacts with both lens choice and aperture behavior

---

## metaphorical phrasing

> **focal.distance** is your **placement of intent** — it marks where clarity lands.
> The closer it lies, the tighter your tolerance must be; the farther it stretches, the more generous the depth becomes.
