# .brief: depth of field vs granularity of detail

## what

Depth of field (DoF) defines the **range of distances** in a scene that appear **acceptably sharp**, while **granularity of detail** describes the **fineness of detail** that can be resolved *within* the sharp regions.

---

## why

These two properties govern different but complementary aspects of image clarity:

- **DoF** controls *where* in the scene focus occurs.
- **Granularity** controls *how much* detail is resolved in those in-focus areas.

Understanding their interaction is essential for balancing **focus range** with **image resolution**.

---

## interaction

- **Inside the DoF**, granularity defines how crisp and detailed the image appears.
- **Outside the DoF**, details are blurred regardless of sensor or lens quality.
- **Shallow DoF** → narrow sharp zone, often with high detail.
- **Deep DoF** → broader sharp zone, but small apertures can introduce **diffraction**, reducing detail.

---

## governed by

| Property             | Governed by                                          |
|----------------------|-------------------------------------------------------|
| **DoF**              | aperture, focal length, subject distance, CoC         |
| **Granularity**      | lens quality, sensor resolution, diffraction limit    |

---

## tradeoffs

- Increasing DoF (via smaller aperture) reduces diffraction tolerance → **lower granularity**
- Decreasing DoF (via wider aperture) narrows focus zone → **higher granularity within that zone**
- **Optimal detail** requires balancing DoF for subject matter and aperture for resolution

---

## grain size comparison (diffraction limit)

Granularity at the focal plane is limited by **diffraction**, quantified by the Airy disk diameter:

\[
d = 2.44 \cdot \lambda \cdot N
\]

Assuming green light (λ ≈ 550 nm):

| Mode            | Aperture | Diffraction-limited Grain Size | Relative |
|------------------|----------|-------------------------------|----------|
| Portrait         | f/1.4    | ≈ 0.0019 mm                    | 1×       |
| Landscape        | f/16     | ≈ 0.0215 mm                    | **11.3×** larger |

> So even at the **focal plane**, the finest resolvable detail in landscape mode is **~11× coarser** than in portrait mode.

---

## key points

- DoF = **zone of focus**
- Granularity = **detail within focus**
- Wide DoF = broad clarity, lower peak sharpness
- Shallow DoF = isolated focus, sharper details
- Overlapping but distinct optical concepts
