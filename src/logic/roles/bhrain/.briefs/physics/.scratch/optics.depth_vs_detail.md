# .brief: detail–depth tradeoff

## what

The **detail–depth tradeoff** describes the inverse relationship between:

- **Detail** — the **grain of fine structure** resolvable in the image (*grain of detail*)
- **Depth** — the **range of distances** that appear acceptably sharp (*depth of field*)

This tradeoff arises from fundamental optical physics, specifically the role of **aperture** in controlling both **depth of field** and **diffraction blur**.

---

## why

A single variable — the **aperture (f-number, N)** — governs both:

- The **angular spread** of light rays (affecting depth)
- The **diffraction limit** of resolving detail (affecting granularity)

Physics prevents both from being maximized simultaneously:
→ **increasing one necessarily sacrifices the other**

---

## governed by

### 📐 Depth of field (approximate total DoF)

\[
\text{DoF} \approx \frac{2 N c s^2}{f^2}
\]

Where:
- \( N \) = aperture (f-number)
- \( c \) = circle of confusion (acceptable blur diameter)
- \( s \) = subject distance
- \( f \) = focal length

> → **Smaller aperture (larger N)** increases depth of field.

---

### 🔬 Detail limit (diffraction blur diameter)

\[
d = 2.44 \cdot \lambda \cdot N
\]

Where:
- \( d \) = diffraction-limited grain size at the focal plane
- \( \lambda \) = wavelength of light (≈ 550 nm for green)
- \( N \) = aperture (f-number)

> → **Larger aperture (smaller N)** reduces diffraction and improves detail.

---

## core tradeoff

| Goal             | Requires               | Consequence                  |
|------------------|------------------------|-------------------------------|
| Maximize **depth** | Use small aperture (e.g. f/16) | Reduced detail due to diffraction |
| Maximize **detail** | Use wide aperture (e.g. f/1.4) | Reduced depth of field        |

---

## key principle

> To increase **depth**, you must reduce **detail**
> To increase **detail**, you must reduce **depth**

---

## typical sweet spot

On full-frame sensors, the **f/5.6–f/8** range often provides a **balanced compromise**:
- Moderate depth of field
- Minimal diffraction
- Good overall sharpness

---

## related terms

- **Aperture (f-number)** — controls the size of the light cone entering the lens
- **Diffraction** — wave interference that limits granularity at small apertures
- **Circle of Confusion (CoC)** — perceptual threshold for acceptable blur, defines depth of field

---

## metaphorical phrasing

> We widen our **depth** at the cost of our **detail**
> We sharpen our **detail** by narrowing our **depth**
