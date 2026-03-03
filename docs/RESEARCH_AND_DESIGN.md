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
- Beliefs (what matters to them), Facets (personality dimensions, 0-100 each), Goals (life aspirations)
- ~50 personality facets following bell-curve distributions
- Species-level defaults with individual variation
- Facets affect which skills can be learned and how dwarves interact
- Key insight: **Most facets cluster around neutral (78% in the 40-60 range)**. Only ~2% are extreme. This creates realistic populations where most people are "normal" but a few are exceptional.

**RimWorld**: Streamlined but impactful.
- Discrete traits (not continuous) with clear gameplay effects
- Backgrounds that combine into a life story
- Key insight: **Traits are intentionally unbalanced.** Working around deficiencies creates stories.

**Crusader Kings 3**: Dynasty and relationship simulation.
- Characters have traits that affect AI decision-making, relationships, and events
- Traits can be gained/lost through life events
- Lifestyle focuses allow characters to develop expertise over time
- Key insight: **Traits change through experience.** A kind person can become cruel through trauma.

**The Sims**: Needs-based behavior.
- Traits modify how needs decay and what actions satisfy them
- Aspirations provide long-term goals
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

### 2.3 Social Networks and Friend Groups

#### Current Problem
The system only has formal "groups" (factions with leaders). Real social life is about **overlapping informal circles**.

#### Research: Social Network Dynamics

**Dunbar's Number Model**:
- ~5 intimate friends (inner circle)
- ~15 good friends
- ~50 friends
- ~150 acquaintances
- Each layer has different interaction frequency and emotional closeness

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
Personality traits are frozen at creation. Memory is keyword-based.

#### Research: Episodic vs. Semantic Memory

Academic ABM research distinguishes:
- **Episodic Memory**: "On tick 450, John betrayed me at the market"
- **Semantic Memory**: "John is untrustworthy" (generalized from episodes)
- **Emotional Memory**: "I felt afraid when John approached" (visceral associations)

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
3. **Statistical Twins**: Groups of similar agents share computation. 1000 "young extroverted bakers" can be batch-processed.
4. **GPU Acceleration**: Trait calculations are embarrassingly parallel. NumPy/CuPy for batch personality math.
5. **Database-Backed State**: Not all agents in memory. SQLite/PostgreSQL for cold storage, Redis for hot agents.
6. **Temporal Batching**: Not every agent needs to decide every tick. Spread computation across ticks.

#### Realistic Milestones:

| Milestone | Agent Count | Architecture |
|-----------|------------|--------------|
| **Phase 1** (now → next) | 100-500 | Enhanced single-thread, full simulation |
| **Phase 2** | 5,000-50,000 | LOD 0+1, spatial partitioning, batch processing |
| **Phase 3** | 50,000-1,000,000 | LOD 0+1+2, database-backed, event-driven |
| **Phase 4** | 1M-100M | Full LOD stack, GPU acceleration, distributed |

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
    trust: float             # 0.0 to 1.0
    respect: float           # 0.0 to 1.0
    attraction: float        # 0.0 to 1.0 (romantic interest)
    types: set[str]          # {"friend", "romantic", "spouse", "parent", "child", "colleague", "rival", "mentor"}
    shared_experiences: int  # Count of shared events
    last_interaction: int    # Last tick of interaction
    grievances: list[str]    # Unresolved conflicts (grudges!)
    forgiven: list[str]      # Past grievances that were forgiven
```

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

At 100 million agents, you don't need to predict any individual. You need to correctly model:
- The **distribution** of personality types
- The **rules** of interaction
- The **feedback mechanisms** (how success breeds success, how grudges escalate)
- The **constraints** (geography, resources, time)

The emergent patterns — empires rising, communities forming, cultures diverging — come from the math, not from scripting.

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

- Ashton & Lee (2007). HEXACO Personality Model empirical advantages.
- Schwartz (1992). Theory of Basic Human Values.
- Schelling (1971). Dynamic Models of Segregation.
- Epstein & Axtell (1996). Growing Artificial Societies (Sugarscape).
- Adams, Tarn (2006-present). Dwarf Fortress personality system.
- Sylvester, Tynan (2013-present). RimWorld trait system design.
- JASSS — Journal of Artificial Societies and Social Simulation (various papers on value-based ABM).
- Mercer et al. (2025). Applying Psychometrics to LLM Simulated Populations: HEXACO experiment.
