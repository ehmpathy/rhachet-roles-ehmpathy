# .brief: focal.depth

## what

**focal.depth** refers to the **range of object distances** in front of and behind the focal plane that appear **acceptably sharp**. It defines the "thickness" of the focus zone surrounding the point of perfect sharpness.

---

## why

While **focal.acuity** describes *how sharply* the focal plane is rendered, **focal.depth** describes *how far that sharpness extends*. It's critical for:

- Keeping entire subjects or scenes acceptably in focus
- Managing viewer attention and spatial context
- Balancing artistic isolation with technical clarity

---

## governed by

### 📐 Depth of field (approximate)

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

| Adjustment                   | Effect on focal.depth         |
|------------------------------|-------------------------------|
| Smaller aperture (↑ f-number)| increases it (more in focus)  |
| Larger aperture (↓ f-number) | decreases it (shallower zone) |
| Farther focus distance       | increases it nonlinearly      |
| Closer focus distance        | decreases it rapidly          |

---

## creative usage

- **Shallow focal.depth** (e.g. f/1.4):
  - Isolates subject from background
  - Ideal for portraits and cinematic shots

- **Deep focal.depth** (e.g. f/16):
  - Maintains clarity across space
  - Used in landscapes, architecture, documentation

---

## limitations

- Increasing focal.depth via smaller apertures introduces **diffraction**, reducing **focal.acuity**
- Getting more depth often requires stepping farther away
- Focal.depth depends on the lens, aperture, and subject distance — not just focus point

---

## metaphorical phrasing

> **focal.depth** is the **breadth** of your clarity
> It defines how far sharpness can **reach** across space, extending from the focal plane outward
