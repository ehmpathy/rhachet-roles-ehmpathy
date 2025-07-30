# .brief: focal.detail vs focal.depth

## what

The **focal.detail vs focal.depth tradeoff** describes the inverse relationship between:

- **focal.detail** — the **grain of fine structure** resolvable **at the focal plane** (limited by diffraction)
- **focal.depth** — the **range of distances** that appear **acceptably sharp** around the focal plane (depth of field)

Both are governed by the **aperture** of the lens, and both cannot be maximized simultaneously due to physical constraints.

---

## why

A single optical parameter — the **aperture (f-number, N)** — controls:

- How finely light can be focused at the focal plane (**focal.detail**)
- How broadly the image remains acceptably sharp in depth (**focal.depth**)

This creates a fundamental **tradeoff**:

> Increasing **focal.depth** comes at the cost of **focal.detail**
> Increasing **focal.detail** comes at the cost of **focal.depth**

---

## governed by

### 📐 focal.depth — Depth of Field

\[
\text{DoF} \approx \frac{2 N c s^2}{f^2}
\]

Where:
- \( N \) = aperture (f-number)
- \( c \) = circle of confusion (blur tolerance)
- \( s \) = subject distance
- \( f \) = focal length

> **Smaller aperture (higher N)** → increases **focal.depth**

---

### 🔬 focal.detail — Diffraction-limited Grain Size

\[
\text{grain} = d = 2.44 \cdot \lambda \cdot N
\]

Where:
- \( d \) = diffraction blur diameter (grain size)
- \( \lambda \) = wavelength of light (~550 nm for green)
- \( N \) = aperture (f-number)

> **Larger aperture (lower N)** → increases **focal.detail**

---

## core tradeoff

| Goal               | Requires                  | Consequence                   |
|--------------------|---------------------------|--------------------------------|
| Maximize **focal.depth**  | Smaller aperture (e.g. f/16)   | **Larger diffraction blur** → lower **focal.detail** |
| Maximize **focal.detail** | Larger aperture (e.g. f/1.4)   | **Shallow depth of field** → lower **focal.depth**   |

---

## typical sweet spot

For full-frame sensors:
- Aperture around **f/5.6–f/8** balances both:
  - **Moderate focal.depth**
  - **Good focal.detail**
  - Minimal diffraction, usable range

---

## related terms

- **Aperture (f-number)** — diameter of lens opening; governs both depth and diffraction
- **Diffraction** — wave behavior that softens detail at small apertures
- **Circle of Confusion (CoC)** — acceptable blur size threshold defining depth of field
- **Focal Plane** — the geometric plane of perfect focus

---

## metaphorical phrasing

> We expand our **focal.depth** by sacrificing **focal.detail**
> We sharpen our **focal.detail** by narrowing our **focal.depth**
