# .brief: focal.acuity

## what

**focal.acuity** refers to the **fineness of structure** that can be resolved **at the focal plane** — the geometric surface where optical focus is sharpest. It represents the **resolving power** of the system in the region of maximum clarity.

---

## why

While **focal.depth** determines *how much* of the scene appears in focus, **focal.acuity** determines *how sharply* the focal plane itself is rendered.

It is essential for:
- Capturing fine textures and edge contrast
- Supporting high-resolution imaging
- Achieving clinical clarity in product, macro, and technical photography

---

## governed by

### 🔬 Diffraction-limited resolution

blur_diameter = d = 2.44 * λ * N
=> focal.acuity ∝ 1 / d
=> focal.acuity ∝ 1 / N

```\`\`
focal.acuity ∝ 1 / N
\`\```

where:
- d = diffraction blur diameter
- lambda = wavelength of light (e.g. 550 nm for green)
- N = aperture (f-number)

> focal.acuity **decreases** (detail coarsens) with:
> - smaller aperture (larger f-number)
> - longer wavelengths (e.g. redder light)

---

## key behaviors

| Adjustment                   | Effect on focal.acuity        |
|------------------------------|-------------------------------|
| Larger aperture (↓ f-number) | increases it (sharper detail) |
| Smaller aperture (↑ f-number)| decreases it (diffraction blur) |
| Shorter wavelength           | increases it (sharper edges)  |
| Better optics/sensor         | improves overall acuity       |

---

## creative usage

- **High focal.acuity** (e.g. f/2.8–f/5.6):
  - Yields crisp microtexture and high subject clarity
  - Ideal for macro, studio, and product photography

- **Reduced focal.acuity** (e.g. f/16–f/22):
  - Acceptable in landscape or documentary work
  - Used when prioritizing depth over precision

---

## limitations

- **focal.acuity** is fundamentally limited by diffraction at small apertures
- Increasing acuity reduces **focal.depth**, unless distance is increased
- Post-processing cannot restore detail beyond optical resolution

---

## metaphorical phrasing

> **focal.acuity** is how finely your lens can **etch the truth** onto the focal plane
> It defines the **maximum clarity** achievable in the region of perfect focus
