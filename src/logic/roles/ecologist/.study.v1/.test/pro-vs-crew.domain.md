## 📚 domain brief: pro > crew > doer

### .what
defines how labor is structured in a service business

### .why
establishes clear roles and relationships between business units and workers for job coordination, scheduling, and accountability



---

### 🧱 entity hierarchy

  Pro
   └─ Crew[]
        └─ Doer[]


- a **pro** is a service business (e.g., Joe's Landscaping)
- a **crew** is a team of doers under a pro (e.g., Tree Removal Team)
- a **doer** is an individual who performs physical work (e.g., Miguel the tech)



---

### 🔁 relationship rules

- each **pro** can have many crews
- each **crew** belongs to **one** pro
- each **doer** may belong to **many** crews
- a **doer** may participate in crews across **multiple** pros

---

### 🏷 canonical terms

| concept       | ✅ use     | 🚫 avoid                     |
|---------------|-----------|------------------------------|
| business unit | `pro`     | provider, vendor, account    |
| work team     | `crew`    | team, unit, group            |
| laborer       | `doer`    | user, staff, technician      |
