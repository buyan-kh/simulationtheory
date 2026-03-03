# Simulation Theory: Research & Design Document

## Vision

Simulate a city of **100 million people** where each person is a complex, multi-dimensional being — not reducible to a single archetype like "warrior" or "scholar." A scholar can also be a warrior. A warrior can also be a caretaker. People change over time, hold grudges, forgive, fall in love, have children, divorce, throw birthday parties, and make decisions based on who they are and what they've lived through.

Individual behavior is hard to predict. But in aggregate — like history shows us — empires rise, cultures form, communities coalesce and fracture. The math works at scale even when individuals are chaotic.

---

## Part 1: Current System Analysis

### What We Have Today

The simulation currently models characters with:

| System | Current State | Limitations |
|--------|--------------|-------------|
| **Personality** | Big Five (OCEAN) traits, 0.0-1.0 each | Traits never change after creation. No values, beliefs, or role identity. |
| **Emotions** | 7 emotions (happiness, anger, fear, trust, surprise, disgust, sadness) | Simple decay model. No mood vs. emotion distinction. No emotional memory. |
| **Relationships** | Single float (-1.0 to 1.0) per pair | No relationship *type* (friend vs. romantic vs. family). No social circles. |
| **Memory** | Short-term (20 items) + long-term, keyword-based beliefs | Keyword matching only. No semantic understanding. Beliefs are binary labels. |
| **Groups** | Single group membership, leader/member/officer roles | No overlapping social circles. No informal friend groups. No events (parties, gatherings). |
| **Lifecycle** | Age, death, offspring with trait blending | No gender. No marriage/divorce. No birthday events. Children don't grow up meaningfully. |
| **Identity** | Name + profile string | No occupation, skills, hobbies, or social roles. A person IS their Big Five scores. |
| **Scale** | ~30 agents max | Every agent is fully simulated every tick. No LOD system. |

### Key Gaps for the Vision

1. **People are one-dimensional** — A person is just 5 floats (OCEAN) + goals/motivations as strings. There's no sense of "I am a teacher who also paints and was once a soldier."
2. **Personalities are frozen** — Traits don't evolve from life experiences.
3. **No social events** — No birthday parties, weddings, funerals, community gatherings.
4. **No friend groups** — Only formal "groups" (factions). No informal social circles.
5. **No gender/romance model** — Offspring requires relationship > 0.7 but there's no courtship, marriage, or family structure.
6. **Can't scale** — The engine processes every agent with full decision-making every tick.

---

## Part 2: Research Findings

### 2.1 Personality Models

#### Big Five (OCEAN) — What We Already Use
- **Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism**
- Well-validated in psychology. Good for broad behavioral tendencies.
- Used heavily in LLM-based agent simulations (2024-2025 research shows LLM agents with OCEAN profiles produce realistic negotiation and social behavior).
- **Limitation**: Captures *how* people behave, not *what they value* or *who they are*.

#### HEXACO — Extension of Big Five
- Adds a 6th dimension: **Honesty-Humility** (H)
- H = fairness, sincerity, greed avoidance, modesty
- Critical for simulating corruption, betrayal, generosity — behaviors central to social dynamics.
- 2025 research (Mercer et al.) successfully simulated HEXACO populations with GPT-4 agents.
- **Recommendation**: Add Honesty-Humility as a 6th trait.

#### Schwartz's Theory of Basic Human Values
- 10 universal values arranged in a circle of motivational tensions:
  - **Self-Enhancement**: Power, Achievement, Hedonism
  - **Openness to Change**: Stimulation, Self-Direction
  - **Self-Transcendence**: Universalism, Benevolence
  - **Conservation**: Tradition, Conformity, Security
- Values predict *what people pursue*, while OCEAN predicts *how they pursue it*.
- Used in JASSS (Journal of Artificial Societies and Social Simulation) for economic and refugee logistics simulations.
- **Recommendation**: Implement values as a separate layer from personality traits. Values drive goals; traits drive behavior style.

#### Game Design Approaches

**Dwarf Fortress**: The gold standard for personality simulation in games.
- Three independent personality subsystems that can *conflict with each other*:
  - **Facets** (~50 dimensions, each 0-100): HOW a creature acts. Love, Anger, Greed, Altruism, Bravery, Gregariousness, Trust, Excitement-seeking, Imagination, etc.
  - **Beliefs/Values** (~30 dimensions, each -50 to +50): WHAT a creature believes in. Law, Loyalty, Family, Friendship, Power, Truth, Romance, Knowledge, etc.
  - **Goals/Dreams**: Long-term aspirations that produce happy thoughts when fulfilled.
- Distribution follows a bell curve: 78% neutral (40-60), 8.5% high/low, <2% very high/low, <0.4% extreme.
- Species-level defaults with individual variation (dwarves have altruism median 50, goblins have altruism median 25).
- Facets affect which skills can be learned (CRUELTY > 75 blocks consoler skill; GREGARIOUSNESS < 25 blocks conversationalist).
- **Critical insight for our project**: Facets and beliefs CAN CONFLICT. A dwarf can deeply value romance but have a facet that prevents forming romantic bonds, producing: *"She never falls in love, and she is bothered by this since she sees romance as one of the highest ideals."* This internal contradiction is what makes characters feel real — the scholar who craves excitement, the warrior who values peace.

**RimWorld**: Streamlined but impactful.
- 2-3 discrete traits per pawn from a curated list, plus a backstory (childhood + adulthood)
- Every trait has visible, direct consequences (Pyromaniac sets fires; Kind gives mood buffs to others)
- Key insight: **Traits are intentionally unbalanced.** Working around deficiencies creates stories. A balanced colony is a boring place.

**Crusader Kings 3**: Dynasty and relationship simulation.
- Up to 3 personality traits from mutually exclusive pairs (Brave/Craven, Honest/Deceitful)
- Characters experience **stress** when acting against their personality traits
- Traits are inheritable with genetic modeling
- **Opinion inheritance**: 25% of positive opinions and 50% of negative opinions pass to heirs
- Key insight: **Traits change through experience.** A kind person can become cruel through trauma. And grudges outlive the people who created them.

**The Sims 4**: Needs-based behavior with aspirations.
- Up to 3 personality traits (6 with Growing Together's self-discovery system)
- Traits drive **Whims** (short-term contextual desires) that interact with **Aspirations** (long-term goals)
- Feedback loop: traits → whims → satisfaction points → aspiration progress → permanent reward traits
- Key insight: **Needs drive immediate behavior; traits modify how needs feel and what satisfies them.**

### 2.2 Complex Identity: Beyond Archetypes

The user's core insight is correct: you can't define a person in one word. Here's how to model multi-dimensional identity:

#### Layered Identity Model (Proposed)

```
Layer 1: TRAITS (stable, slow-changing)
  - HEXACO personality (6 continuous values)
  - These are the "hardware" — biological temperament

Layer 2: VALUES (medium stability)
  - Schwartz values (10 continuous values)
  - Shaped by upbringing, culture, major life events
  - These are the "operating system" — what matters to you

Layer 3: ROLES & SKILLS (dynamic)
  - Occupations, skills, social roles
  - "Teacher", "Painter", "Parent", "Community Leader"
  - Can hold multiple simultaneously
  - Gain/lose through life events
  - These are the "applications" — what you do

Layer 4: LIFE NARRATIVE (accumulative)
  - Key memories that define identity
  - "Survived the flood of '32", "Lost my first child", "Founded the bakery"
  - These are the "files" — your unique story
```

A single person might be:
- **Traits**: High openness, moderate conscientiousness, low agreeableness, high honesty-humility
- **Values**: Self-direction (high), Benevolence (high), Power (low)
- **Roles**: Baker (primary), former soldier, amateur poet, mother of 3
- **Narrative**: Lost husband in the war, rebuilt life, known for sharp tongue but kind heart

This is NOT definable in one word. The baker is also a poet is also a survivor is also a mother.

#### Recommended Composite Approach (from research)

| Layer | Model | What It Captures | Update Frequency |
|-------|-------|------------------|------------------|
| Behavioral Tendencies | HEXACO (6 continuous floats) | HOW agents act | Slow drift from major life events |
| Motivational Values | Schwartz (10 values) | WHY agents act | Very slow drift; mostly stable |
| Facets/Quirks | DF-style facets (additional dimensions, 0-100) | Emotional predispositions, quirks | Medium drift from memories |
| Goals/Aspirations | Sims-style aspirations | WHAT agents want to achieve | Change at life stage transitions |
| Role Identities | Tags earned/lost through actions | Social roles (Scholar, Warrior, Caretaker) | Dynamic, event-driven |

The key Dwarf Fortress insight: **internal conflict between layers creates the most believable characters.** A warrior who values peace. A scholar who craves excitement. These contradictions are not bugs — they are features.

### 2.3 Social Networks and Friend Groups

#### Current Problem
The system only has formal "groups" (factions with leaders). Real social life is about **overlapping informal circles**.

#### Research: Social Network Dynamics

**Dunbar's Number Model** (validated across mobile phone networks, Facebook, Christmas card lists, military units, churches, Anglo-Saxon villages, and Bronze Age communities):

| Layer | Size | Description | Interaction Frequency |
|-------|------|-------------|----------------------|
| **Support clique** | ~1.5 | Partner/best friend | Daily |
| **Sympathy group** | ~5 | Intimate friends — would call in crisis | Multiple times/week |
| **Close friends** | ~15 | Good friends — regular socializing | Weekly |
| **Affinity group** | ~50 | Friends — would invite to a party | Monthly |
| **Active network** | ~150 | Acquaintances — know by name | Yearly |
| **Mega-band** | ~500 | Faces you recognize | Rarely |
| **Tribe** | ~1500 | Names you recognize | Almost never |

Each layer is ~3x the size of the one inside it. This is a *fractal* structure.

**Trust Dynamics** (Sutcliffe et al., JASSS):
- Trust increases with cooperative interactions (with diminishing returns — trust reaches an asymptote)
- Trust decays over time without interaction
- **Strong ties resist occasional defections** — best friends are given the benefit of the doubt
- Strategies favoring existing strong ties produce more Dunbar-conformant networks than strategies favoring many weak ties

**Friend/Foe Networks** (PLOS ONE, 2024):
- Each agent has a **private opinion** and a **public opinion** (shared with the group)
- Social network represented as adjacency matrix with positive (friend) and negative (foe) weights
- Validated against longitudinal data from real schools

**Proposed: Social Circles**

Instead of a single relationship float, model:

```python
class Relationship:
    affinity: float        # -1.0 to 1.0 (how much I like them)
    familiarity: float     # 0.0 to 1.0 (how well I know them)
    trust: float           # 0.0 to 1.0 (how much I trust them)
    type: set[str]         # {"friend", "romantic", "family", "colleague", "rival"}
    shared_memories: list   # Events we experienced together
    last_interaction: int   # Tick of last meaningful contact
```

**Social Circles** emerge naturally from relationship clusters:
- Characters with mutual high-affinity relationships form implicit friend groups
- No formal membership — it's detected from the relationship graph
- Dunbar layers emerge organically: sort relationships by trust/affinity → top 5 are inner circle, top 15 are close friends, etc.
- The birthday party scenario works: "Who are my top 5-15 friends?" → invite them
- Others are excluded not by malice but by social distance

### 2.4 Social Events: The Birthday Party Problem

The user described a specific scenario: 10 friends throwing a birthday party, potentially inviting 5 outsiders, each making personality-based decisions.

#### Event-Driven Social Dynamics (Proposed)

```
Social Event System:
1. TRIGGER: Calendar event (birthday), milestone, or spontaneous idea
2. ORGANIZER: Character with highest extraversion/social need initiates
3. GUEST LIST: Organizer's social circle + optional expansion
4. INVITATION DECISIONS:
   - Each invitee evaluates based on:
     * Relationship with organizer (affinity, trust)
     * Relationship with other guests (do I know anyone?)
     * Personality (extraversion → more likely to attend)
     * Current needs (social need high → more motivated)
     * Values (benevolence → attend to be kind; conformity → attend because expected)
     * Competing obligations
5. EVENT EXECUTION: Attendees interact, form new connections
6. AFTERMATH: New relationships, strengthened bonds, potential conflicts
```

For the "expand friend group" scenario:
- Someone with high Openness + high Benevolence suggests inviting outsiders
- Each of the 5 outsiders evaluates:
  - High Extraversion + high Openness → "Sure, I love meeting people!" (80% yes)
  - Low Extraversion + high Neuroticism → "I don't know anyone there..." (20% yes)
  - Medium traits + high Social need → "I could use some friends" (60% yes)
  - Previous negative experience with a guest → "That guy was rude to me" (10% yes)

### 2.5 Memory and Personality Evolution

#### Current Problem
Personality traits are frozen at creation. Memory is keyword-based (matches on words like "betray", "cooperat"). Beliefs are simple binary labels ("untrustworthy", "ally").

#### Research: The Stanford Generative Agents Architecture (Park et al., 2023)

The landmark paper "Generative Agents: Interactive Simulacra of Human Behavior" created 25 agents in a Sims-like sandbox with a three-component memory system:

1. **Observation/Memory Stream**: Complete record of experiences in natural language. Each memory tagged with recency, importance (mundane → poignant), and relevance.

2. **Reflection**: When accumulated importance of recent memories exceeds a threshold, generate higher-level abstractions. *"Klaus Mueller is dedicated to his research on gentrification (because of memories 1, 2, 8, 15)."* Reflections recursively reference other reflections, building an abstraction hierarchy.

3. **Planning**: Top-down recursive plans. Day-level → hour-level → 5-15 minute action chunks. Plans revised when significant new observations occur.

**Result**: Agents autonomously spread Valentine's Day party invitations over two days, made new acquaintances, asked each other on dates, and coordinated to show up at the right time — from a single user seed. Crowdworkers rated generative agents as more believable than humans pretending to be those agents.

#### Research: Memory Taxonomy for Agents (2025 Survey)

| Memory Type | What It Stores | How It's Retrieved | Update Frequency |
|-------------|---------------|-------------------|-----------------|
| **Working** | Current context, active task | Direct access | Every tick |
| **Episodic** | Specific events with (time, place, people, emotion, importance) | Weighted by recency + importance + relevance | On each experience |
| **Semantic** | Generalized knowledge ("Bob is unreliable", "market is busy on Tuesdays") | Query by subject/predicate | Consolidated from episodes |
| **Procedural** | Behavioral rules ("when confronted by a bully, stand your ground") | Pattern matching on situation | Strengthened by repeated success |

**Key mechanism**: Episodic-to-semantic consolidation. Novel experiences → stored as episodes → background process identifies patterns → abstracts into semantic rules → agents query semantic memory before acting. This mirrors hippocampal-cortical consolidation in neuroscience.

**Advanced approaches**:
- **A-MEM** (2025): Organizes memories as interconnected knowledge graphs (Zettelkasten method), not flat lists
- **AriGraph** (IJCAI 2025): Knowledge graph as world model with episodic memory — significantly outperforms unstructured memory in planning tasks
- **Divergent beliefs**: Without synchronization, agents develop incompatible beliefs about the same facts. This is actually realistic (humans do this too) and creates interesting conflict.

#### Proposed: Personality Drift

```python
# After significant life events, traits shift slightly
def process_life_event(character, event):
    if event.type == "betrayal_victim":
        character.traits.agreeableness -= 0.02  # Become slightly less trusting
        character.traits.neuroticism += 0.01    # Become slightly more anxious
    elif event.type == "community_leadership":
        character.traits.extraversion += 0.01   # Grow more comfortable leading
        character.traits.conscientiousness += 0.01  # Become more responsible

# Traits drift slowly (bounded), creating characters who
# "grew bitter after the war" or "mellowed with age"
```

**Key constraint**: Drift must be slow (0.01-0.03 per major event) and bounded. Core personality is ~60% stable, ~40% shaped by experience. This matches psychological research.

#### Proposed: Grudges and Forgiveness

```python
class Grudge:
    cause: str              # "stole from me", "betrayed my trust"
    source_event_id: str    # The specific memory
    severity: float         # 0.0 to 1.0
    created_tick: int
    decay_rate: float       # Very slow (0.001/tick)

# Forgiveness is probabilistic, based on:
# - Agent's Agreeableness trait (high = more forgiving)
# - Relationship's historical trust level (deep history = more forgiveness)
# - Number of positive interactions since the grudge
# - Time elapsed (grudges fade, slowly)
# - The other person's apparent remorse (did they apologize?)
```

Strong relationships absorb occasional defections (you forgive your best friend). Weak relationships shatter from a single betrayal (you never trust that stranger again). This matches the trust dynamics from Sutcliffe et al.

### 2.6 Scaling to 100 Million: The Architecture Challenge

#### The Problem
Current: 30 agents, each fully computed every tick.
Target: 100,000,000 agents.
That's a **3,333,333x** increase.

#### Research: Multi-Resolution Simulation

The only viable approach is **Level of Detail (LOD)** inspired by game rendering:

```
LOD 0 — "Spotlight" (1-100 agents)
  Full personality simulation every tick
  Complete decision trees, dialogue, memory
  This is what we have now

LOD 1 — "Neighborhood" (1,000-10,000 agents)
  Simplified personality (traits + top 3 relationships)
  Decisions every 10 ticks using reduced action set
  Summary memories, no dialogue
  Promoted to LOD 0 when interacting with spotlight agents

LOD 2 — "District" (100,000-1,000,000 agents)
  Statistical aggregates: demographic profiles
  Batch-processed: "In district X, 40% are happy, unemployment is 12%"
  Individual agents exist but only wake up when needed
  Modeled as distributions, not individuals

LOD 3 — "City" (1,000,000-100,000,000 agents)
  Pure statistical modeling
  Population flows, economic indicators, cultural trends
  Individual identity preserved in database but never active
  Agent emerges into LOD 2 only on significant events
```

#### Key Techniques for Scale:

1. **Spatial Hashing**: Agents only interact with nearby agents. O(n) instead of O(n^2).
2. **Event-Driven Activation**: Most agents sleep. Only wake when something happens to them.
3. **Agent Compression / Group Agents**: Groups of similar agents share computation. GA-S3 (ACL 2025) models collections of similar individuals as a single "group agent" with emotion fading and forgetting probability.
4. **GPU Acceleration**: FLAME GPU 2 simulates **hundreds of millions of agents** on NVIDIA GPUs — at least 1000x faster than next best simulator. Has simulated tumors with 3 billion cells. Active research toward billion-agent simulations.
5. **Database-Backed State**: Not all agents in memory. SQLite/PostgreSQL for cold storage, Redis for hot agents. Lazy evaluation delays non-critical computations until needed.
6. **Temporal Batching**: Not every agent needs to decide every tick. Spread computation across ticks.
7. **Hybrid Agent/Statistical**: JASSS research on combining individual agents (foreground) with statistical distributions (background). When a background event affects a foreground agent, instantiate a new individual from the statistical model.

#### CPU Budget by LOD:

| LOD Level | Agents | Simulation Detail | CPU Budget |
|-----------|--------|-------------------|------------|
| LOD 0 (Full) | 10-100 | Full personality, memory, social reasoning | ~60% |
| LOD 1 (Simplified) | 1K-10K | HEXACO + values + top relationships, decisions every N ticks | ~20% |
| LOD 2 (Aggregate) | 100K | Major life events sampled from statistical distributions | ~10% |
| LOD 3 (Statistical) | 1M+ | Pure demographics, economic indicators, migration flows | ~5% |
| LOD 4 (Background) | 100M | Population numbers only, no individuals active | ~5% |

#### Available Frameworks for Scale:

| Framework | Language | Max Scale | GPU | Best For |
|-----------|----------|-----------|-----|----------|
| **FLAME GPU 2** | CUDA/Python | Billions | Native | Maximum performance |
| **Repast HPC** | C++ | Millions | Via MPI | HPC clusters |
| **Mesa 3** | Python | ~100K | No | Rapid prototyping (our current tier) |
| **Agents.jl** | Julia | ~1M | Possible | Performance + usability |
| **krABMaga** | Rust | ~1M | Possible | Performance-critical |

#### Realistic Milestones:

| Milestone | Agent Count | Architecture | Tech Stack |
|-----------|------------|--------------|------------|
| **Phase 1** (now → next) | 100-500 | Enhanced single-thread, full simulation | Python + FastAPI (current) |
| **Phase 2** | 5,000-50,000 | LOD 0+1, spatial partitioning, batch processing | Python + NumPy, PostgreSQL |
| **Phase 3** | 50K-1M | LOD 0+1+2, database-backed, event-driven | Python + FLAME GPU or Julia |
| **Phase 4** | 1M-100M | Full LOD stack, GPU acceleration, distributed | FLAME GPU / custom CUDA + distributed DB |

---

## Part 3: Proposed Architecture Changes

### 3.1 Enhanced Character Model

```python
class Character(BaseModel):
    # === IDENTITY ===
    id: str
    name: str
    gender: str                    # NEW: "male", "female", "other"
    birthday: int                  # NEW: tick of birth (for birthday events!)
    profile: str

    # === PERSONALITY (HEXACO) ===
    traits: PersonalityTraits      # NEW: expanded model
    #   honesty_humility: float    # NEW 6th trait
    #   openness: float
    #   conscientiousness: float
    #   extraversion: float
    #   agreeableness: float
    #   neuroticism: float

    # === VALUES (Schwartz) ===     # NEW SYSTEM
    values: HumanValues
    #   power: float
    #   achievement: float
    #   hedonism: float
    #   stimulation: float
    #   self_direction: float
    #   universalism: float
    #   benevolence: float
    #   tradition: float
    #   conformity: float
    #   security: float

    # === ROLES & SKILLS ===        # NEW SYSTEM
    roles: list[Role]              # Multiple simultaneous roles
    #   Role: {name, proficiency, acquired_tick, active}
    #   e.g., "baker" (0.8), "poet" (0.3), "parent" (1.0)
    skills: dict[str, float]       # Skill name -> proficiency 0-1

    # === RELATIONSHIPS ===          # ENHANCED
    relationships: dict[str, Relationship]  # char_id -> rich relationship
    social_circles: list[str]      # Detected friend group IDs

    # === MEMORY ===                 # ENHANCED
    episodic_memory: list[Episode]  # Specific events with context
    semantic_memory: dict[str, Belief]  # Generalized knowledge
    emotional_associations: dict[str, float]  # char_id -> gut feeling

    # === LIFECYCLE ===
    age: float
    birthday_day: int              # NEW: day-of-year for annual celebrations
    gender: str                    # NEW
    spouse_id: str | None          # NEW: marriage
    parent_ids: list[str]
    children_ids: list[str]        # NEW: track children
    life_stage: str                # NEW: child/teen/adult/elder

    # === EMOTIONS (same, enhanced) ===
    emotions: EmotionalState       # 7 emotions + mood baseline

    # === NEEDS (same) ===
    needs: CharacterNeeds
```

### 3.2 Social Event System

```python
class SocialEvent(BaseModel):
    id: str
    type: str           # "birthday_party", "wedding", "funeral", "gathering", "festival"
    organizer_id: str
    location_id: str
    tick: int
    invited: list[str]          # Character IDs invited
    attending: list[str]        # Characters who accepted
    declined: list[str]         # Characters who declined
    outcomes: list[EventOutcome]  # What happened at the event

class SocialEventManager:
    def check_upcoming_events(self, state, tick):
        """Check for birthdays, anniversaries, etc."""
        for char in state.characters:
            if char.birthday_day == tick % 365:
                self.trigger_birthday(char, state)

    def trigger_birthday(self, birthday_char, state):
        """The birthday scenario from the user's vision."""
        # Find organizer (closest friend with high extraversion)
        friends = self.get_social_circle(birthday_char, state)
        organizer = max(friends, key=lambda f: f.traits.extraversion)

        # Build guest list: inner circle + potential expansions
        inner_circle = self.get_close_friends(birthday_char, state, limit=15)
        potential_new = self.get_expansion_candidates(organizer, state)

        # Each potential guest makes a decision
        for candidate in potential_new:
            decision = self.evaluate_invitation(candidate, birthday_char, inner_circle)
            # decision based on personality, relationships, needs...
```

### 3.3 Relationship Types

```python
class Relationship(BaseModel):
    target_id: str
    affinity: float          # -1.0 to 1.0 (like/dislike)
    familiarity: float       # 0.0 to 1.0 (how well known)
    trust: float             # -1.0 to 1.0 (negative = distrust/grudge)
    respect: float           # 0.0 to 1.0
    attraction: float        # 0.0 to 1.0 (romantic interest)
    types: set[str]          # {"friend", "romantic", "spouse", "parent", "child", "colleague", "rival", "mentor"}
    shared_experiences: int  # Count of shared events
    last_interaction: int    # Last tick of interaction
    grievances: list[Grudge] # Unresolved conflicts (grudges!)
    forgiven: list[Grudge]   # Past grievances that were forgiven
    decay_rate: float        # Relationship-type-dependent
```

**Trust Dynamics** (from Sutcliffe et al.):
- Trust increases linearly with cooperation, then switches to **logarithmic growth** (diminishing returns — trust reaches an asymptote, like real relationships)
- Strong ties resist occasional defections (**forgiveness in strong ties**)
- Betrayal from a high-trust relationship hurts more than from a stranger
- Without reinforcing interactions, even strong ties decay

**Parent-Child Relationships**:
- Asymmetric: parent's investment is high and unconditional (barring extreme traits)
- Child's attachment shaped by parenting quality and evolves with age
- **Opinion inheritance** (from CK3): 25% of positive opinions and 50% of negative opinions pass to children. Grudges outlive the people who created them.

### 3.4 Marriage, Divorce, and Family

```python
class FamilyManager:
    def check_romantic_progression(self, state):
        """Romance develops through stages."""
        for char in state.alive_characters:
            for rel_id, rel in char.relationships.items():
                if "romantic" in rel.types:
                    if rel.affinity > 0.8 and rel.trust > 0.7:
                        self.consider_proposal(char, rel_id, state)

    def check_divorce_conditions(self, char, spouse, state):
        """Divorce happens when relationships decay."""
        rel = char.relationships[spouse.id]
        if rel.affinity < -0.3 and rel.trust < 0.2:
            if len(rel.grievances) > 3:
                return True  # Likely to divorce
        return False
```

---

## Part 4: The Mathematical Insight

The user's key insight: **Individual humans are unpredictable, but human systems follow patterns.**

This is exactly what agent-based modeling (ABM) research confirms:

- **Schelling's Segregation Model**: Agents with mild preference for similar neighbors → complete neighborhood segregation. Simple rules, complex macro outcomes.
- **Sugarscape**: Agents gathering resources → wealth inequality, trade networks, cultural zones emerge naturally.
- **Axelrod's Culture Model**: Agents adopting traits from similar neighbors → cultural regions form and stabilize.

**The math works because:**
1. Individual decisions have bounded randomness (personality constrains choices)
2. Interactions create feedback loops (relationships reinforce behavior)
3. Large numbers smooth out individual chaos (Law of Large Numbers)
4. Structure emerges from simple rules (self-organization)

**Key properties of emergent ABM systems:**
- **Non-linearity**: Small changes in micro-rules can produce dramatic macro-level shifts
- **Feedback loops**: Macro patterns constrain individual choices, which in turn reinforce or alter the macro patterns
- **Path dependence**: The same micro-rules can produce different macro outcomes depending on initial conditions
- **Phase transitions**: Systems can flip between qualitatively different macro states at critical parameter thresholds

At 100 million agents, you don't need to predict any individual. You need to correctly model:
- The **distribution** of personality types
- The **rules** of interaction
- The **feedback mechanisms** (how success breeds success, how grudges escalate)
- The **constraints** (geography, resources, time)

The emergent patterns — empires rising, communities forming, cultures diverging — come from the math, not from scripting.

### 4.1 Designing for Emergence

Based on ABM research, the rules for rich emergent behavior:

1. **Keep individual rules simple but interconnected.** Each rule understandable alone, but rules interact in non-obvious ways.
2. **Include positive AND negative feedback loops.** Positive (success breeds success) creates amplification. Negative (overcrowding reduces resources) creates stabilization. The interplay produces complexity.
3. **Model spatial and social proximity.** Agents interact primarily with nearby agents (physical or social), not globally. Local interaction is the engine of emergence.
4. **Allow heterogeneity.** Agents with identical rules but different parameters (personalities, values) produce richer emergence than homogeneous populations.
5. **Implement indirect effects (stigmergy).** Agents modify the environment (leave reputations, deplete resources, build structures). Other agents respond to these environmental changes. Coordination without direct communication.
6. **Run at sufficient scale.** Schelling needs hundreds. Wealth inequality needs thousands. Cultural evolution needs tens of thousands. Empires need millions.

Recent research (2024-2025) shows LLM agents in Sugarscape-style environments exhibit emergent survival-directed behavior from pre-training alone, without explicit survival rules. OASIS (2024) demonstrates group polarization and herd effects emerging naturally at scale, with larger populations producing more pronounced dynamics.

---

## Part 5: Implementation Priorities

### Phase 1: Rich People (Current Sprint)

Priority enhancements to make each agent a complex being:

1. **Gender + Family Model** — male/female, romance, marriage, divorce, children tracking
2. **Birthday System** — each character has a birthday, triggers social events
3. **HEXACO Traits** — add Honesty-Humility as 6th personality dimension
4. **Schwartz Values** — 10-value system driving goals and life decisions
5. **Role System** — characters hold multiple roles (baker+poet+parent) that change over time
6. **Rich Relationships** — replace single float with multi-dimensional relationship model
7. **Social Events** — birthday parties, gatherings, weddings with invitation dynamics
8. **Personality Drift** — traits slowly shift based on life experiences
9. **Grudges & Forgiveness** — explicit tracking of unresolved conflicts
10. **Social Circles** — detected from relationship graph, not explicit membership

### Phase 2: Smart Scale (Future)

1. LOD system for handling 5,000+ agents
2. Spatial partitioning
3. Event-driven activation
4. Database-backed cold storage

### Phase 3: City Scale (Future)

1. Statistical population modeling
2. GPU-accelerated batch processing
3. Distributed simulation
4. 100M agent architecture

---

## References

### Personality & Values
- Ashton & Lee (2007). [150 Empirical Advantages of the HEXACO Model](https://differentialclub.wdfiles.com/local--files/5fm/Ashton%202007%20HEXACO%20Model%20JPSP.pdf)
- Mercer et al. (2025). [Applying Psychometrics to LLM Simulated Populations: HEXACO experiment](https://arxiv.org/abs/2508.00742)
- Schwartz (1992). Theory of Basic Human Values. [Wikipedia](https://en.wikipedia.org/wiki/Theory_of_basic_human_values)
- JASSS (2024). [Schwartz Human Values and Economic Performance in ABM](https://www.jasss.org/27/1/2.html)
- JASSS (2020). [Agent-Based Modelling of Values: Refugee Logistics](https://www.jasss.org/23/4/6.html)
- Nature Scientific Reports (2025). [Value-Based LLM Agent Dialogue Simulation](https://www.nature.com/articles/s41598-025-25531-1)

### Game Design
- [Dwarf Fortress Personality Facets Wiki](https://dwarffortresswiki.org/index.php/Personality_facet)
- [Dwarf Fortress Personality Values Wiki](https://dwarffortresswiki.org/index.php/Personality_value)
- [RimWorld Design Analysis — Game Developer](https://www.gamedeveloper.com/design/how-i-rimworld-i-fleshes-out-the-i-dwarf-fortress-i-formula)
- [CK3 Traits — Paradox Wiki](https://ck3.paradoxwikis.com/Traits)
- [The Sims 4 Traits — Sims Wiki](https://sims.fandom.com/wiki/Trait_(The_Sims_4))

### Social Networks & Relationships
- Sutcliffe et al. [Trust and Social Relationships — JASSS](https://www.jasss.org/15/1/3.html)
- [Friend/Foe Networks — PLOS ONE (2024)](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0298791)
- [Dunbar's Number in Motion (2024)](https://www.researchgate.net/publication/388135232)
- [Marriage Market Models — Springer](https://link.springer.com/chapter/10.1007/978-3-658-26042-2_3)

### Memory & Learning
- Park et al. (2023). [Generative Agents: Interactive Simulacra of Human Behavior](https://arxiv.org/abs/2304.03442)
- (2025). [Memory in the Age of AI Agents — Survey](https://arxiv.org/abs/2512.13564)
- (2025). [A-MEM: Agentic Memory with Zettelkasten Method](https://arxiv.org/abs/2502.12110)

### Scaling & Frameworks
- [FLAME GPU 2](https://flamegpu.com/) — GPU-accelerated agent simulation (billions of agents)
- [FLAME GPU — NVIDIA Blog](https://developer.nvidia.com/blog/fast-large-scale-agent-based-simulations-on-nvidia-gpus-with-flame-gpu/)
- [OASIS: One Million Social Media Agents](https://arxiv.org/html/2411.11581v3)
- [GA-S3: Group Agents for Social Simulation — ACL 2025](https://aclanthology.org/2025.findings-acl.468/)
- [LOD AI for Virtual Characters](https://www.researchgate.net/publication/221252089_Level_of_Detail_AI_for_Virtual_Characters_in_Games_and_Simulation)
- [Hybrid Agent Modeling in Population Simulation — JASSS](https://www.jasss.org/19/1/12.html)
- [ScaleSim: Scaling LLM Agent Simulation](https://arxiv.org/html/2601.21473v1)
- [Mesa ABM Framework](https://github.com/mesa/mesa)
- [Agents.jl Comparison](https://juliadynamics.github.io/Agents.jl/stable/comparison/)

### Emergence
- Schelling (1971). Dynamic Models of Segregation. [Explained](https://medium.com/data-science/schellings-model-of-racial-segregation-4852fad06c13)
- Epstein & Axtell (1996). Growing Artificial Societies (Sugarscape). [Wikipedia](https://en.wikipedia.org/wiki/Sugarscape)
- [On Complexity: Emergence in ABM](https://runestone.academy/ns/books/published/complex/AgentBasedModels/Emergence.html)
- [Generative Social Simulation — Emergent Mind](https://www.emergentmind.com/topics/generative-social-simulation)
