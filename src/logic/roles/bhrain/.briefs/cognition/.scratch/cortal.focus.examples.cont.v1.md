### 🎓 scenario: learning what a “dog” is

- `depth.target = [concept:"dog"]`
- `depth.range--`
  - focus locked around [concept:"dog"]
  - add immediate examples via `<exemplify>([concept:"dog"]) → [concept:"husky"]`
  - ignores deeper abstractions like [concept:"mammal"]
  - ignores finer specializations like [concept:"siberian-husky"]
- `breadth--`
  - no lateral exploration of peer concepts like [concept:"cat"] or [concept:"bunny"]
- `acuity++`
  - sharply tracks salient features like `bark.style`, `fur.type`, `tail.shape`
  - but misses latent or low-salience traits like `vision.range`, `hair.growth.speed`

→ **outcome:**
- forms a **crisp prototype** of “dog”
- strong within-category recognition
- **low abstraction** and **poor cross-category generalization**

### 🔧 scenario: designing a physical tool

- `depth.target = [concept:"mechanical screwdriver"]`
- `depth.range--`
  - attention fixed on [concept:"mechanical screwdriver"]
  - ignores tool abstractions like [concept:"cutting tool"], [concept:"manual device"]
- `breadth--`
  - isolates to one design path; no lateral alternatives like [concept:"electric screwdriver"] or [concept:"ratchet wrench"]
- `acuity++`
  - sharply resolves features like `bit.torque`, `grip.texture`, `shaft.rigidity`
  - enables material and ergonomic optimization

→ **outcome:**
- high-fidelity artifact design
- **precise but narrow solution space**

### 🧯 scenario: firefighter evaluating gear

- `depth.target = [concept:"protective equipment"]`
- `depth.range++`
  - links to [concept:"thermal barrier"], [concept:"mobility gear"], [concept:"breathing system"]
  - dips down into gear variants: `<exemplify>^2([concept:"helmet"]) → [concept:"structural helmet"], [concept:"wildland helmet"]`
- `breadth++`
  - laterally compares options across budget, environment, risk level
- `acuity--`
  - simplifies features into functional goals: `resist.heat`, `enable.vision`, `fit.reliability`

→ **outcome:**
- supports operational readiness decisions
- balances abstraction and field usability
- **trades fine material distinction** for systemic fit

### 🧰 scenario: plumber diagnosing a leak

- `depth.target = [concept:"pipe fitting"]`
- `depth.range++`
  - spans outwards to specific joints and sealing types: [concept:"compression fitting"], [concept:"threaded fitting"]
  - spans inwards to structural system: [concept:"residential water loop"], [concept:"fixture feed line"]
- `breadth--`
  - focuses tightly on the failing component
- `acuity++`
  - attends to microfeatures: `thread.condition`, `material.reactivity`, `seal.compression.ratio`

→ **outcome:**
- precise fault localization
- enables fast intervention
- **limited awareness** of systemic causes beyond immediate range

### 🧱 scenario: mason training a new hire

- `depth.target = [concept:"bricklaying technique"]`
- `depth.range++`
  - connects [concept:"tool use"] → [concept:"trowel handling"]
  - down to `<exemplify>^2([concept:"bond"]) → [concept:"running bond"], [concept:"stack bond"]`
- `breadth--`
  - restricts scope to core workflow
- `acuity++`
  - focuses on `joint.spacing`, `mortar.consistency`, `course.leveling`

→ **outcome:**
- builds strong procedural memory
- maintains craft quality
- **limits adaptability** to unusual patterns or new materials
