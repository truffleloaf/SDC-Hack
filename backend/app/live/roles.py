"""Editorial configuration for the live catalogue.

O*NET supplies the occupations, tasks, skills and job titles. What O*NET does
not supply is Pivott's product decisions: which occupations the app shows,
which SDGs they map to, and which extra search terms (mostly German) are used
when matching live job postings from Arbeitnow.

Everything in this module is a deliberate, reviewable choice, not a measurement.
:mod:`app.live.importer` records it in ``meta`` so the API can explain itself.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.live.onet import ONET_DOCS_URL, ONET_LICENSE_URL, ONET_VERSION

# How many tasks per role: enough for the time-allocation screen (the demo uses
# six) without turning every role into a 30-row table.
TASKS_PER_ROLE = 6
# Role requirements shown on the skills screen and used for fit/gap.
REQUIREMENTS_PER_ROLE = 8
# Sample of live openings kept per role in the database.
POSTINGS_PER_ROLE = 10


@dataclass(frozen=True)
class LiveRoleSpec:
    """One O*NET occupation, plus Pivott's routing metadata."""

    code: str
    slug: str
    family: str
    sdgs: tuple[int, ...]
    aliases: tuple[str, ...] = ()


FAMILY_OFFICE = "Office & Admin Support"
FAMILY_FINANCE = "Business & Finance"
FAMILY_DATA = "Data & Analysis"
FAMILY_MANAGEMENT = "Management"
FAMILY_ENGINEERING = "Engineering & Technology"
FAMILY_SCIENCE = "Science & Research"
FAMILY_HEALTH = "Health"
FAMILY_DESIGN = "Design & Digital"

ROLES: tuple[LiveRoleSpec, ...] = (
    LiveRoleSpec(
        code="43-3031.00",
        slug="bookkeeping-clerk",
        family=FAMILY_OFFICE,
        sdgs=(8, 10),
        aliases=(
            "buchhalter",
            "buchhaltung",
            "bilanzbuchhaltung",
            "accounts payable",
            "accounts receivable",
            "bookkeeper",
            "accounting clerk",
            "finance clerk",
        ),
    ),
    LiveRoleSpec(
        code="43-6011.00",
        slug="executive-assistant",
        family=FAMILY_OFFICE,
        sdgs=(8, 10),
        aliases=(
            "executive assistant",
            "assistenz der geschaeftsfuehrung",
            "vorstandsassistenz",
            "teamassistenz",
            "office manager",
            "management assistant",
        ),
    ),
    LiveRoleSpec(
        code="43-4051.00",
        slug="customer-service-rep",
        family=FAMILY_OFFICE,
        sdgs=(8, 10),
        aliases=(
            "customer service",
            "kundenservice",
            "kundenbetreuung",
            "customer support",
            "call center",
            "callcenter",
            "kundenberater",
        ),
    ),
    LiveRoleSpec(
        code="13-2011.00",
        slug="accountant",
        family=FAMILY_FINANCE,
        sdgs=(8,),
        aliases=(
            "accountant",
            "bilanzbuchhalter",
            "steuerfachangestellte",
            "steuerfachangestellter",
            "wirtschaftspruefer",
            "auditor",
        ),
    ),
    LiveRoleSpec(
        code="13-2031.00",
        slug="budget-analyst",
        family=FAMILY_FINANCE,
        sdgs=(8, 9),
        aliases=(
            "budget analyst",
            "controller",
            "controlling",
            "finanzcontroller",
            "planungscontroller",
        ),
    ),
    LiveRoleSpec(
        code="13-1161.00",
        slug="market-research-analyst",
        family=FAMILY_FINANCE,
        sdgs=(8, 9),
        aliases=(
            "market research",
            "marketing analyst",
            "market analyst",
            "marketing specialist",
            "marketingreferent",
            "marktforschung",
        ),
    ),
    LiveRoleSpec(
        code="15-2051.01",
        slug="bi-analyst",
        family=FAMILY_DATA,
        sdgs=(8, 9),
        aliases=(
            "business intelligence",
            "bi analyst",
            "business analyst",
            "data analyst",
            "datenanalyst",
            "reporting analyst",
        ),
    ),
    LiveRoleSpec(
        code="15-2051.00",
        slug="data-scientist",
        family=FAMILY_DATA,
        sdgs=(8, 9),
        aliases=(
            "data scientist",
            "datenwissenschaftler",
            "machine learning",
            "analytics engineer",
            "statistician",
            "statistiker",
        ),
    ),
    LiveRoleSpec(
        code="13-1082.00",
        slug="project-manager",
        family=FAMILY_MANAGEMENT,
        sdgs=(8, 9),
        aliases=(
            "project manager",
            "projektmanager",
            "projektleitung",
            "project lead",
            "it-projektleiter",
        ),
    ),
    LiveRoleSpec(
        code="11-1021.00",
        slug="operations-manager",
        family=FAMILY_MANAGEMENT,
        sdgs=(8, 9),
        aliases=(
            "operations manager",
            "betriebsleiter",
            "niederlassungsleiter",
            "general manager",
            "standortleiter",
            "bereichsleiter",
        ),
    ),
    LiveRoleSpec(
        code="15-1252.00",
        slug="software-developer",
        family=FAMILY_ENGINEERING,
        sdgs=(8, 9),
        aliases=("software developer", "software engineer", "backend developer", "frontend developer", "full stack developer", "softwareentwickler"),
    ),
    LiveRoleSpec(
        code="17-2051.00",
        slug="civil-engineer",
        family=FAMILY_ENGINEERING,
        sdgs=(8, 9, 11),
        aliases=("civil engineer", "structural engineer", "bauingenieur", "construction engineer"),
    ),
    LiveRoleSpec(
        code="17-2071.00",
        slug="electrical-engineer",
        family=FAMILY_ENGINEERING,
        sdgs=(7, 8, 9),
        aliases=("electrical engineer", "electronics engineer", "elektroingenieur", "hardware engineer"),
    ),
    LiveRoleSpec(
        code="17-2141.00",
        slug="mechanical-engineer",
        family=FAMILY_ENGINEERING,
        sdgs=(8, 9, 12),
        aliases=("mechanical engineer", "maschinenbauingenieur", "design engineer", "manufacturing engineer"),
    ),
    LiveRoleSpec(
        code="17-2112.00",
        slug="industrial-engineer",
        family=FAMILY_ENGINEERING,
        sdgs=(8, 9, 12),
        aliases=("industrial engineer", "process engineer", "production engineer", "wirtschaftsingenieur"),
    ),
    LiveRoleSpec(
        code="19-2041.00",
        slug="environmental-scientist",
        family=FAMILY_SCIENCE,
        sdgs=(6, 12, 13),
        aliases=("environmental scientist", "environmental specialist", "umweltwissenschaftler", "environmental consultant"),
    ),
    LiveRoleSpec(
        code="19-2031.00",
        slug="chemist",
        family=FAMILY_SCIENCE,
        sdgs=(3, 8, 9),
        aliases=("chemist", "analytical chemist", "research chemist", "chemiker", "laboratory scientist"),
    ),
    LiveRoleSpec(
        code="19-1042.00",
        slug="medical-scientist",
        family=FAMILY_SCIENCE,
        sdgs=(3, 8, 9),
        aliases=("medical scientist", "biomedical scientist", "clinical scientist", "medical researcher", "wissenschaftlicher mitarbeiter"),
    ),
    LiveRoleSpec(
        code="29-1141.00",
        slug="registered-nurse",
        family=FAMILY_HEALTH,
        sdgs=(3, 8),
        aliases=("registered nurse", "staff nurse", "nurse", "pflegefachkraft", "krankenschwester", "krankenpfleger"),
    ),
    LiveRoleSpec(
        code="15-1255.00",
        slug="web-digital-interface-designer",
        family=FAMILY_DESIGN,
        sdgs=(8, 9, 10),
        aliases=("ui designer", "ux designer", "product designer", "web designer", "interface designer", "webdesigner"),
    ),
)

# Pivott's four skill categories, mapped from the 35 O*NET skill elements.
SKILL_CATEGORIES: dict[str, str] = {
    "Reading Comprehension": "Communication",
    "Active Listening": "Communication",
    "Writing": "Communication",
    "Speaking": "Communication",
    "Social Perceptiveness": "Communication",
    "Coordination": "Communication",
    "Persuasion": "Communication",
    "Negotiation": "Communication",
    "Instructing": "Communication",
    "Service Orientation": "Communication",
    "Mathematics": "Analytical",
    "Science": "Analytical",
    "Critical Thinking": "Analytical",
    "Active Learning": "Analytical",
    "Learning Strategies": "Analytical",
    "Monitoring": "Analytical",
    "Complex Problem Solving": "Analytical",
    "Operations Analysis": "Analytical",
    "Quality Control Analysis": "Analytical",
    "Judgment and Decision Making": "Analytical",
    "Systems Analysis": "Analytical",
    "Systems Evaluation": "Analytical",
    "Technology Design": "Technical",
    "Equipment Selection": "Technical",
    "Installation": "Technical",
    "Programming": "Technical",
    "Operation Monitoring": "Technical",
    "Operation and Control": "Technical",
    "Equipment Maintenance": "Technical",
    "Troubleshooting": "Technical",
    "Repairing": "Technical",
    "Time Management": "Operational",
    "Management of Financial Resources": "Operational",
    "Management of Material Resources": "Operational",
    "Management of Personnel Resources": "Operational",
}

HOURS_PER_LEVEL = {
    "Technical": 12,
    "Analytical": 10,
    "Communication": 8,
    "Operational": 6,
}

DELIVERABLES = {
    "Technical": "A small working artifact that uses {name} on real {family} data.",
    "Analytical": "A one-page analysis showing your {name} reasoning on a real {family} case.",
    "Communication": "A recorded five-minute walkthrough that demonstrates {name} with a stakeholder.",
    "Operational": "A tracked week where you apply {name} to your own workload.",
}

# Product constants, not demo rows: both datasets need the same two scenarios.
SCENARIOS = (
    {'id':'slow','label':'Slow','multiplier':0.75,'description':'Team assumption: 0.75× baseline exposure. Not a forecast.'},
    {
        "id": "normal",
        "label": "Normal",
        "multiplier": 1.0,
        "description": "Team assumption: 1× baseline exposure. Not a forecast.",
    },
    {
        "id": "fast",
        "label": "Fast",
        "multiplier": 1.25,
        "description": "Team assumption: 1.25× baseline exposure. Not a forecast.",
    },
)

from app.sdg import MAPPING
SDGS = MAPPING['goals']

SOURCE_CATALOG = {
    "name": f"O*NET {ONET_VERSION} Database",
    "publisher": "U.S. Department of Labor, Employment and Training Administration",
    "url": "https://www.onetcenter.org/database.html",
    "license": "CC BY 4.0",
    "licenseUrl": ONET_LICENSE_URL,
    "docsUrl": ONET_DOCS_URL,
}
