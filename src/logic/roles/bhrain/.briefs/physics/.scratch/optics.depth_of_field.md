# .brief: depth of field

## what

Depth of field (DoF) is the **range of object distances** from a lens within which the resulting image appears **acceptably sharp**. It is not a hard boundary of focus, but a **tolerance zone** where image blur remains below a perceptual threshold known as the **circle of confusion (CoC)**.

---

## why

Only one object distance produces a **perfectly focused** image according to lens optics. However, regions slightly in front of or behind that point still appear "sharp enough" if the spread of light rays (blur circle) is small enough. This is what defines the depth of field.

---

## governed by

- **Geometric optics** via the **thin lens equation**
  \[
  \frac{1}{f} = \frac{1}{d_o} + \frac{1}{d_i}
  \]
- **Circle of confusion**: the maximum blur diameter considered still "sharp"
- **Aperture (f-number)**: smaller aperture → narrower light cones → greater DoF
- **Focal length**: longer lenses compress DoF; shorter lenses expand it
- **Subject distance**: closer subjects have shallower DoF
- **Sensor resolution or human eye**: sets acceptable blur threshold

---

## key formula

Approximate total DoF:

\[
\text{DoF} \approx \frac{2 N c s^2}{f^2}
\]

Where:
- \( N \) = aperture (f-number)
- \( c \) = acceptable circle of confusion
- \( s \) = subject distance
- \( f \) = focal length

---

## key points

- DoF is a **perceptual zone**, not a strict optical limit
- It results from **ray divergence** through a finite aperture
- Governed by **physics**, but defined by **visual tolerance**
- Increases with: smaller aperture, shorter focal length, farther subject
- Related but distinct from **depth of focus**, which refers to image-side tolerances
