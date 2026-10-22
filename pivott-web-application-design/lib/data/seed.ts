export type SkillCategory = 'Technical' | 'Analytical' | 'Communication' | 'Operational'

export interface Skill {
  id: string
  name: string
  category: SkillCategory
  hoursPerLevel: number
  deliverable: string
  why: string
}

export interface Task {
  id: string
  roleId: string
  name: string
  description: string
  baseExposure: number
  humanJudgment: number
  defaultShare: number
  skills: string[]
  tryThisWeek: string
}

export interface RoleRequirement {
  skillId: string
  requiredLevel: number
  importance: number
}

export interface Role {
  id: string
  title: string
  family: string
  demand: number
  requirements: RoleRequirement[]
  sdgs: number[]
}

export interface Resource {
  id: string
  skillId: string
  title: string
  provider: string
  url: string
  free: boolean
}

export interface Signal {
  id: string
  date: string
  headline: string
  sourceName: string
  sourceUrl: string
  direction: 1 | -1
  strength: number
  impacts: { taskId: string; impact: number }[]
  explanation: string
  evidence: 'verified' | 'illustrative' | 'user'
}

export interface Scenario {
  id: 'normal' | 'fast'
  label: string
  multiplier: number
  description: string
}

export interface Sdg {
  id: number
  name: string
  color: string
}

export const DATA_AS_OF = '2026-10-01'
export const SEED_VERSION = '2026.10.2'

export const scenarios: Scenario[] = [
  {
    id: 'normal',
    label: 'Normal',
    multiplier: 1,
    description: 'AI adoption continues at the pace seen across 2025–2026.',
  },
  {
    id: 'fast',
    label: 'Fast',
    multiplier: 1.25,
    description: 'Tools mature quickly and adoption accelerates across teams.',
  },
]

export const sdgs: Sdg[] = [
  { id: 4, name: 'Quality Education', color: '#C5192D' },
  { id: 8, name: 'Decent Work and Economic Growth', color: '#A21942' },
  { id: 9, name: 'Industry, Innovation and Infrastructure', color: '#FD6925' },
  { id: 10, name: 'Reduced Inequalities', color: '#DD1367' },
]

export const skills: Skill[] = [
  { id: 'excel', name: 'Spreadsheet modelling', category: 'Technical', hoursPerLevel: 10, deliverable: 'A reusable reconciliation workbook with lookups and checks', why: 'Spreadsheets remain the lingua franca of finance and ops teams.' },
  { id: 'erp', name: 'ERP systems', category: 'Technical', hoursPerLevel: 14, deliverable: 'A documented test script for one ERP workflow', why: 'Knowing how the system is configured moves you from user to owner.' },
  { id: 'sql', name: 'SQL', category: 'Technical', hoursPerLevel: 12, deliverable: 'Five queries answering real questions about a sample ledger', why: 'SQL lets you pull the data yourself instead of waiting for exports.' },
  { id: 'python', name: 'Python', category: 'Technical', hoursPerLevel: 16, deliverable: 'A small script that cleans a messy CSV export', why: 'Light scripting turns repetitive cleanup into a one-click job.' },
  { id: 'bi', name: 'BI dashboards', category: 'Technical', hoursPerLevel: 10, deliverable: 'A one-page dashboard tracking three finance KPIs', why: 'Dashboards make your analysis visible to decision makers.' },
  { id: 'automation', name: 'Process automation', category: 'Technical', hoursPerLevel: 12, deliverable: 'An approval flow that routes invoices automatically', why: 'Building automations positions you as the person who designs the work.' },
  { id: 'ai', name: 'AI tool fluency', category: 'Technical', hoursPerLevel: 6, deliverable: 'A prompt library for three recurring tasks, with checks', why: 'Using AI well is quickly becoming a baseline expectation.' },
  { id: 'analysis', name: 'Data analysis', category: 'Analytical', hoursPerLevel: 12, deliverable: 'A variance analysis memo with three clear findings', why: 'Interpreting numbers is where human judgment adds the most value.' },
  { id: 'stats', name: 'Statistics', category: 'Analytical', hoursPerLevel: 12, deliverable: 'A short note explaining a trend with confidence intervals', why: 'Statistics helps you tell signal from noise.' },
  { id: 'controls', name: 'Financial controls', category: 'Analytical', hoursPerLevel: 10, deliverable: 'A control matrix for one end-to-end process', why: 'Controls expertise is durable: automation still needs oversight.' },
  { id: 'stakeholder', name: 'Stakeholder communication', category: 'Communication', hoursPerLevel: 8, deliverable: 'A requirements summary signed off by a stakeholder', why: 'Translating between teams is hard to automate and highly valued.' },
  { id: 'writing', name: 'Writing & storytelling', category: 'Communication', hoursPerLevel: 8, deliverable: 'A one-page narrative explaining a business change', why: 'Clear writing turns analysis into action.' },
  { id: 'empathy', name: 'Customer empathy', category: 'Communication', hoursPerLevel: 6, deliverable: 'Three customer journey notes with pain points', why: 'Understanding people keeps your work anchored to real needs.' },
  { id: 'process', name: 'Process design', category: 'Operational', hoursPerLevel: 10, deliverable: 'A swimlane map of a current process with one redesign', why: 'Redesigning processes is central to every AI rollout.' },
  { id: 'coordination', name: 'Project coordination', category: 'Operational', hoursPerLevel: 8, deliverable: 'A lightweight project plan with owners and milestones', why: 'Coordinating change keeps people and tools moving together.' },
]

export const roles: Role[] = [
  {
    id: 'finance-admin',
    title: 'Finance Admin',
    family: 'Finance',
    demand: 55,
    sdgs: [8],
    requirements: [
      { skillId: 'excel', requiredLevel: 3, importance: 5 },
      { skillId: 'erp', requiredLevel: 3, importance: 4 },
      { skillId: 'controls', requiredLevel: 3, importance: 4 },
      { skillId: 'stakeholder', requiredLevel: 2, importance: 3 },
      { skillId: 'analysis', requiredLevel: 2, importance: 3 },
    ],
  },
  {
    id: 'finance-systems-analyst',
    title: 'Finance Systems Analyst',
    family: 'Finance & Technology',
    demand: 78,
    sdgs: [8, 9],
    requirements: [
      { skillId: 'erp', requiredLevel: 4, importance: 5 },
      { skillId: 'controls', requiredLevel: 3, importance: 4 },
      { skillId: 'automation', requiredLevel: 3, importance: 4 },
      { skillId: 'sql', requiredLevel: 2, importance: 3 },
      { skillId: 'stakeholder', requiredLevel: 3, importance: 3 },
      { skillId: 'process', requiredLevel: 3, importance: 3 },
      { skillId: 'excel', requiredLevel: 3, importance: 2 },
    ],
  },
  {
    id: 'data-analyst',
    title: 'Data Analyst',
    family: 'Data',
    demand: 82,
    sdgs: [8, 9],
    requirements: [
      { skillId: 'sql', requiredLevel: 3, importance: 5 },
      { skillId: 'analysis', requiredLevel: 3, importance: 5 },
      { skillId: 'bi', requiredLevel: 3, importance: 4 },
      { skillId: 'stats', requiredLevel: 2, importance: 3 },
      { skillId: 'python', requiredLevel: 2, importance: 2 },
      { skillId: 'excel', requiredLevel: 3, importance: 2 },
      { skillId: 'writing', requiredLevel: 2, importance: 2 },
    ],
  },
  {
    id: 'marketing-executive',
    title: 'Marketing Executive',
    family: 'Marketing',
    demand: 60,
    sdgs: [8],
    requirements: [
      { skillId: 'writing', requiredLevel: 4, importance: 5 },
      { skillId: 'ai', requiredLevel: 3, importance: 4 },
      { skillId: 'stakeholder', requiredLevel: 3, importance: 4 },
      { skillId: 'analysis', requiredLevel: 2, importance: 3 },
      { skillId: 'bi', requiredLevel: 2, importance: 2 },
      { skillId: 'empathy', requiredLevel: 3, importance: 3 },
    ],
  },
  {
    id: 'customer-support-specialist',
    title: 'Customer Support Specialist',
    family: 'Customer',
    demand: 50,
    sdgs: [8, 10],
    requirements: [
      { skillId: 'empathy', requiredLevel: 4, importance: 5 },
      { skillId: 'writing', requiredLevel: 3, importance: 3 },
      { skillId: 'stakeholder', requiredLevel: 3, importance: 3 },
      { skillId: 'ai', requiredLevel: 2, importance: 3 },
      { skillId: 'process', requiredLevel: 2, importance: 2 },
    ],
  },
  {
    id: 'operations-coordinator',
    title: 'Operations Coordinator',
    family: 'Operations',
    demand: 68,
    sdgs: [8, 9],
    requirements: [
      { skillId: 'coordination', requiredLevel: 3, importance: 5 },
      { skillId: 'process', requiredLevel: 3, importance: 3 },
      { skillId: 'stakeholder', requiredLevel: 3, importance: 4 },
      { skillId: 'excel', requiredLevel: 3, importance: 3 },
      { skillId: 'automation', requiredLevel: 2, importance: 2 },
      { skillId: 'erp', requiredLevel: 2, importance: 2 },
    ],
  },
]

export const tasks: Task[] = [
  // Finance Admin
  { id: 'fa-invoice', roleId: 'finance-admin', name: 'Invoice entry', description: 'Capture supplier invoices and code them to the ledger.', baseExposure: 0.78, humanJudgment: 0.15, defaultShare: 30, skills: ['erp', 'excel'], tryThisWeek: 'Batch ten invoices through your ERP’s capture feature and log every field you had to correct.' },
  { id: 'fa-recon', roleId: 'finance-admin', name: 'Bank reconciliation', description: 'Match bank lines to ledger entries and clear differences.', baseExposure: 0.66, humanJudgment: 0.3, defaultShare: 20, skills: ['excel', 'controls', 'erp'], tryThisWeek: 'Write matching rules for your three most common transaction types and test them on last month.' },
  { id: 'fa-exception', roleId: 'finance-admin', name: 'Exception handling', description: 'Investigate mismatches, duplicates, and policy breaches.', baseExposure: 0.4, humanJudgment: 0.68, defaultShare: 15, skills: ['controls', 'stakeholder', 'analysis'], tryThisWeek: 'Keep a short log of each exception and the judgment call you made. Patterns become playbooks.' },
  { id: 'fa-reporting', roleId: 'finance-admin', name: 'Month-end reporting', description: 'Prepare month-end packs and variance commentary.', baseExposure: 0.56, humanJudgment: 0.42, defaultShare: 15, skills: ['excel', 'analysis', 'writing'], tryThisWeek: 'Ask an AI assistant to draft variance commentary, then edit it and note what it missed.' },
  { id: 'fa-comms', roleId: 'finance-admin', name: 'Client communication', description: 'Resolve payment queries with vendors and internal teams.', baseExposure: 0.28, humanJudgment: 0.72, defaultShare: 10, skills: ['stakeholder', 'writing', 'empathy'], tryThisWeek: 'Draft three reusable reply templates for common payment queries and personalise each one.' },
  { id: 'fa-expense', roleId: 'finance-admin', name: 'Expense claim review', description: 'Check claims against policy and approve or return them.', baseExposure: 0.62, humanJudgment: 0.38, defaultShare: 10, skills: ['controls', 'ai'], tryThisWeek: 'Turn your expense policy into a checklist an AI tool can pre-screen against, then spot-check results.' },
  // Finance Systems Analyst
  { id: 'fsa-config', roleId: 'finance-systems-analyst', name: 'ERP configuration & testing', description: 'Configure modules and test changes before release.', baseExposure: 0.36, humanJudgment: 0.55, defaultShare: 30, skills: ['erp', 'process', 'controls'], tryThisWeek: 'Shadow a configuration change and write the test cases you would have run.' },
  { id: 'fsa-pipeline', roleId: 'finance-systems-analyst', name: 'Finance data pipelines', description: 'Maintain feeds between banks, ERP, and reporting.', baseExposure: 0.55, humanJudgment: 0.35, defaultShare: 20, skills: ['sql', 'erp', 'excel'], tryThisWeek: 'Trace one number from bank file to final report and document every hop.' },
  { id: 'fsa-controls', roleId: 'finance-systems-analyst', name: 'Control & audit design', description: 'Design system controls and support audits.', baseExposure: 0.24, humanJudgment: 0.75, defaultShare: 15, skills: ['controls', 'process'], tryThisWeek: 'Pick one manual control and sketch how a system control could replace it.' },
  { id: 'fsa-automation', roleId: 'finance-systems-analyst', name: 'Automation build', description: 'Build workflow automations for finance processes.', baseExposure: 0.44, humanJudgment: 0.5, defaultShare: 20, skills: ['automation', 'process'], tryThisWeek: 'Build a simple approval flow in a no-code tool for a low-risk request.' },
  { id: 'fsa-requirements', roleId: 'finance-systems-analyst', name: 'Requirements workshops', description: 'Gather needs from finance users and translate them.', baseExposure: 0.2, humanJudgment: 0.8, defaultShare: 15, skills: ['stakeholder', 'writing'], tryThisWeek: 'Run a 20-minute interview with a colleague about their biggest system frustration.' },
  // Data Analyst
  { id: 'da-clean', roleId: 'data-analyst', name: 'Data cleaning', description: 'Prepare and validate raw datasets for analysis.', baseExposure: 0.74, humanJudgment: 0.2, defaultShare: 25, skills: ['sql', 'python', 'excel'], tryThisWeek: 'Use an AI assistant to write a cleaning script, then verify each rule by hand.' },
  { id: 'da-query', roleId: 'data-analyst', name: 'SQL querying', description: 'Write queries to answer business questions.', baseExposure: 0.62, humanJudgment: 0.3, defaultShare: 20, skills: ['sql'], tryThisWeek: 'Have AI draft a query, then explain every clause in your own words.' },
  { id: 'da-dashboards', roleId: 'data-analyst', name: 'Dashboard building', description: 'Design and maintain recurring dashboards.', baseExposure: 0.5, humanJudgment: 0.4, defaultShare: 20, skills: ['bi', 'analysis'], tryThisWeek: 'Cut one dashboard down to the three metrics people actually use.' },
  { id: 'da-story', roleId: 'data-analyst', name: 'Insight storytelling', description: 'Turn findings into recommendations for leaders.', baseExposure: 0.3, humanJudgment: 0.72, defaultShare: 20, skills: ['writing', 'analysis', 'stakeholder'], tryThisWeek: 'Rewrite one report as a three-sentence recommendation.' },
  { id: 'da-adhoc', roleId: 'data-analyst', name: 'Ad-hoc analysis', description: 'Respond to one-off analytical requests.', baseExposure: 0.55, humanJudgment: 0.45, defaultShare: 15, skills: ['analysis', 'stats', 'excel'], tryThisWeek: 'Save your last three ad-hoc requests as reusable templates.' },
  // Marketing Executive
  { id: 'me-copy', roleId: 'marketing-executive', name: 'Campaign copywriting', description: 'Write emails, ads, and landing page copy.', baseExposure: 0.76, humanJudgment: 0.3, defaultShare: 25, skills: ['writing', 'ai'], tryThisWeek: 'Generate five variants with AI and edit the best one into your brand voice.' },
  { id: 'me-social', roleId: 'marketing-executive', name: 'Social scheduling', description: 'Plan and schedule posts across channels.', baseExposure: 0.72, humanJudgment: 0.2, defaultShare: 20, skills: ['ai', 'coordination'], tryThisWeek: 'Automate one week of scheduling and spend the time saved on community replies.' },
  { id: 'me-reporting', roleId: 'marketing-executive', name: 'Performance reporting', description: 'Track campaign results and summarise learnings.', baseExposure: 0.6, humanJudgment: 0.35, defaultShare: 20, skills: ['analysis', 'bi'], tryThisWeek: 'Add one “so what” line to every chart in your next report.' },
  { id: 'me-partners', roleId: 'marketing-executive', name: 'Brand partnerships', description: 'Build relationships with partners and creators.', baseExposure: 0.2, humanJudgment: 0.8, defaultShare: 15, skills: ['stakeholder', 'empathy'], tryThisWeek: 'Reach out to one partner with a specific, personalised idea.' },
  { id: 'me-research', roleId: 'marketing-executive', name: 'Audience research', description: 'Understand audience needs and segments.', baseExposure: 0.5, humanJudgment: 0.48, defaultShare: 20, skills: ['empathy', 'analysis'], tryThisWeek: 'Summarise ten customer reviews with AI, then validate the themes yourself.' },
  // Customer Support Specialist
  { id: 'cs-triage', roleId: 'customer-support-specialist', name: 'Ticket triage', description: 'Categorise and route incoming requests.', baseExposure: 0.8, humanJudgment: 0.2, defaultShare: 25, skills: ['process', 'ai'], tryThisWeek: 'List the rules you use to route tickets. They are the spec for automation.' },
  { id: 'cs-faq', roleId: 'customer-support-specialist', name: 'FAQ responses', description: 'Answer common questions by chat and email.', baseExposure: 0.82, humanJudgment: 0.15, defaultShare: 25, skills: ['writing', 'ai'], tryThisWeek: 'Review ten AI-drafted replies and note where tone needed a human touch.' },
  { id: 'cs-escalation', roleId: 'customer-support-specialist', name: 'Escalation handling', description: 'Resolve complex or sensitive customer issues.', baseExposure: 0.3, humanJudgment: 0.78, defaultShare: 20, skills: ['empathy', 'stakeholder'], tryThisWeek: 'Write down how you de-escalated your hardest case this week.' },
  { id: 'cs-kb', roleId: 'customer-support-specialist', name: 'Knowledge base upkeep', description: 'Keep help articles accurate and current.', baseExposure: 0.6, humanJudgment: 0.35, defaultShare: 15, skills: ['writing', 'process'], tryThisWeek: 'Find the three articles linked most in tickets and refresh them.' },
  { id: 'cs-feedback', roleId: 'customer-support-specialist', name: 'Feedback synthesis', description: 'Summarise customer feedback for product teams.', baseExposure: 0.46, humanJudgment: 0.5, defaultShare: 15, skills: ['analysis', 'empathy', 'writing'], tryThisWeek: 'Send product one paragraph on the most repeated complaint this month.' },
  // Operations Coordinator
  { id: 'oc-scheduling', roleId: 'operations-coordinator', name: 'Scheduling & logistics', description: 'Coordinate shifts, deliveries, and resources.', baseExposure: 0.6, humanJudgment: 0.3, defaultShare: 25, skills: ['coordination', 'excel'], tryThisWeek: 'Try an AI scheduling assistant on next week’s rota and compare results.' },
  { id: 'oc-vendors', roleId: 'operations-coordinator', name: 'Vendor coordination', description: 'Manage supplier relationships and service levels.', baseExposure: 0.34, humanJudgment: 0.66, defaultShare: 20, skills: ['stakeholder', 'coordination'], tryThisWeek: 'Set up a simple scorecard for your two most important vendors.' },
  { id: 'oc-docs', roleId: 'operations-coordinator', name: 'Process documentation', description: 'Write and maintain standard operating procedures.', baseExposure: 0.56, humanJudgment: 0.4, defaultShare: 15, skills: ['process', 'writing'], tryThisWeek: 'Record yourself doing a task and let AI draft the SOP from the transcript.' },
  { id: 'oc-tracking', roleId: 'operations-coordinator', name: 'Order tracking', description: 'Monitor inventory levels and order status.', baseExposure: 0.68, humanJudgment: 0.25, defaultShare: 20, skills: ['erp', 'excel', 'automation'], tryThisWeek: 'Set up one automated low-stock alert instead of a manual check.' },
  { id: 'oc-improve', roleId: 'operations-coordinator', name: 'Improvement projects', description: 'Lead small projects to remove friction from operations.', baseExposure: 0.24, humanJudgment: 0.72, defaultShare: 20, skills: ['process', 'coordination', 'stakeholder'], tryThisWeek: 'Pick the most annoying step in a process and propose one fix to your manager.' },
]

export const resources: Resource[] = [
  { id: 'r-excel-gcf', skillId: 'excel', title: 'Excel Tutorials', provider: 'GCFGlobal', url: 'https://edu.gcfglobal.org/en/excel/', free: true },
  { id: 'r-erp-sap', skillId: 'erp', title: 'SAP Learning Journeys', provider: 'SAP Learning', url: 'https://learning.sap.com/', free: true },
  { id: 'r-sql-bolt', skillId: 'sql', title: 'Interactive SQL Lessons', provider: 'SQLBolt', url: 'https://sqlbolt.com/', free: true },
  { id: 'r-sql-khan', skillId: 'sql', title: 'Intro to SQL: Querying and managing data', provider: 'Khan Academy', url: 'https://www.khanacademy.org/computing/computer-programming/sql', free: true },
  { id: 'r-python-py4e', skillId: 'python', title: 'Python for Everybody', provider: 'PY4E', url: 'https://www.py4e.com/', free: true },
  { id: 'r-bi-ms', skillId: 'bi', title: 'Power BI training', provider: 'Microsoft Learn', url: 'https://learn.microsoft.com/en-us/training/powerplatform/power-bi', free: true },
  { id: 'r-bi-gda', skillId: 'bi', title: 'Google Data Analytics Certificate', provider: 'Coursera', url: 'https://www.coursera.org/professional-certificates/google-data-analytics', free: false },
  { id: 'r-auto-ms', skillId: 'automation', title: 'Power Automate training', provider: 'Microsoft Learn', url: 'https://learn.microsoft.com/en-us/training/powerplatform/power-automate', free: true },
  { id: 'r-auto-uipath', skillId: 'automation', title: 'UiPath Academy', provider: 'UiPath', url: 'https://academy.uipath.com/', free: true },
  { id: 'r-ai-elements', skillId: 'ai', title: 'Elements of AI', provider: 'University of Helsinki', url: 'https://www.elementsofai.com/', free: true },
  { id: 'r-ai-prompting', skillId: 'ai', title: 'Learn Prompting', provider: 'Learn Prompting', url: 'https://learnprompting.org/', free: true },
  { id: 'r-analysis-gda', skillId: 'analysis', title: 'Google Data Analytics Certificate', provider: 'Coursera', url: 'https://www.coursera.org/professional-certificates/google-data-analytics', free: false },
  { id: 'r-analysis-cfi', skillId: 'analysis', title: 'Financial analysis courses', provider: 'Corporate Finance Institute', url: 'https://corporatefinanceinstitute.com/', free: false },
  { id: 'r-stats-khan', skillId: 'stats', title: 'Statistics and probability', provider: 'Khan Academy', url: 'https://www.khanacademy.org/math/statistics-probability', free: true },
  { id: 'r-analysis-ms', skillId: 'analysis', title: 'Working with Data', provider: 'Microsoft', url: 'https://github.com/microsoft/Data-Science-For-Beginners/tree/main/2-Working-With-Data', free: true },
  { id: 'r-controls-cfi', skillId: 'controls', title: 'Accounting & controls courses', provider: 'Corporate Finance Institute', url: 'https://corporatefinanceinstitute.com/', free: false },
  { id: 'r-controls-open', skillId: 'controls', title: 'OpenLearn free courses', provider: 'The Open University', url: 'https://www.open.edu/openlearn/', free: true },
  { id: 'r-stakeholder-open', skillId: 'stakeholder', title: 'OpenLearn free courses', provider: 'The Open University', url: 'https://www.open.edu/openlearn/', free: true },
  { id: 'r-stakeholder-gpm', skillId: 'stakeholder', title: 'Google Project Management Certificate', provider: 'Coursera', url: 'https://www.coursera.org/professional-certificates/google-project-management', free: false },
  { id: 'r-writing-open', skillId: 'writing', title: 'OpenLearn free courses', provider: 'The Open University', url: 'https://www.open.edu/openlearn/', free: true },
  { id: 'r-empathy-hubspot', skillId: 'empathy', title: 'HubSpot Academy', provider: 'HubSpot', url: 'https://academy.hubspot.com/', free: true },
  { id: 'r-process-gpm', skillId: 'process', title: 'Google Project Management Certificate', provider: 'Coursera', url: 'https://www.coursera.org/professional-certificates/google-project-management', free: false },
  { id: 'r-process-open', skillId: 'process', title: 'OpenLearn free courses', provider: 'The Open University', url: 'https://www.open.edu/openlearn/', free: true },
  { id: 'r-coord-gpm', skillId: 'coordination', title: 'Google Project Management Certificate', provider: 'Coursera', url: 'https://www.coursera.org/professional-certificates/google-project-management', free: false },
  { id: 'r-coord-open', skillId: 'coordination', title: 'OpenLearn free courses', provider: 'The Open University', url: 'https://www.open.edu/openlearn/', free: true },
]

export const signals: Signal[] = [
  { id: 's01', date: '2026-09-18', headline: 'Invoice-capture agents reach general availability in major ERPs', sourceName: 'SAP Business AI', sourceUrl: 'https://www.sap.com/products/artificial-intelligence.html', direction: 1, strength: 0.7, impacts: [{ taskId: 'fa-invoice', impact: 0.045 }, { taskId: 'oc-tracking', impact: 0.04 }], explanation: 'Line-item extraction now ships inside core finance modules.', evidence: 'illustrative' },
  { id: 's02', date: '2026-09-02', headline: 'Finance teams report more time on exception review after automation', sourceName: 'Microsoft Work Trend Index', sourceUrl: 'https://www.microsoft.com/en-us/worklab/work-trend-index', direction: -1, strength: 0.5, impacts: [{ taskId: 'fa-exception', impact: 0.07 }, { taskId: 'fsa-controls', impact: 0.05 }], explanation: 'Judgment-heavy review grows as routine entry shrinks.', evidence: 'illustrative' },
  { id: 's03', date: '2026-08-21', headline: 'Bank-feed matching rules become a standard accounting feature', sourceName: 'Microsoft Copilot', sourceUrl: 'https://www.microsoft.com/en-us/microsoft-365/copilot', direction: 1, strength: 0.6, impacts: [{ taskId: 'fa-recon', impact: 0.05 }, { taskId: 'fsa-pipeline', impact: 0.05 }], explanation: 'Rule-based reconciliation is moving into default workflows.', evidence: 'illustrative' },
  { id: 's04', date: '2026-08-05', headline: 'Support teams pair AI drafts with human escalation paths', sourceName: 'HubSpot', sourceUrl: 'https://www.hubspot.com/', direction: 1, strength: 0.6, impacts: [{ taskId: 'cs-faq', impact: 0.1 }, { taskId: 'cs-triage', impact: 0.08 }], explanation: 'Routine replies are increasingly drafted automatically.', evidence: 'illustrative' },
  { id: 's05', date: '2026-07-14', headline: 'Demand rises for people who can design and govern automations', sourceName: 'TalentCorp Malaysia', sourceUrl: 'https://www.talentcorp.com.my/', direction: -1, strength: 0.5, impacts: [{ taskId: 'fsa-automation', impact: 0.1 }, { taskId: 'oc-improve', impact: 0.08 }], explanation: 'Organisations need owners for new automated processes.', evidence: 'illustrative' },
  { id: 's06', date: '2026-06-30', headline: 'Generative tools draft month-end commentary from ledger data', sourceName: 'Anthropic Economic Index', sourceUrl: 'https://www.anthropic.com/economic-index', direction: 1, strength: 0.5, impacts: [{ taskId: 'fa-reporting', impact: 0.07 }, { taskId: 'me-reporting', impact: 0.05 }], explanation: 'Narrative drafting is a common professional AI use.', evidence: 'illustrative' },
  { id: 's07', date: '2026-06-10', headline: 'Expense tools add policy pre-screening by default', sourceName: 'SAP Concur', sourceUrl: 'https://www.concur.com/', direction: 1, strength: 0.55, impacts: [{ taskId: 'fa-expense', impact: 0.11 }], explanation: 'Claims are flagged against policy before a reviewer sees them.', evidence: 'illustrative' },
  { id: 's08', date: '2026-05-20', headline: 'Marketing teams scale AI copy while tightening brand review', sourceName: 'HubSpot', sourceUrl: 'https://www.hubspot.com/state-of-marketing', direction: 1, strength: 0.6, impacts: [{ taskId: 'me-copy', impact: 0.1 }, { taskId: 'me-social', impact: 0.08 }], explanation: 'Draft volume rises; editing and approval become the bottleneck.', evidence: 'illustrative' },
  { id: 's09', date: '2026-04-15', headline: 'AI Index tracks rapid gains in agentic task completion', sourceName: 'Stanford HAI AI Index', sourceUrl: 'https://hai.stanford.edu/ai-index', direction: 1, strength: 0.4, impacts: [{ taskId: 'da-clean', impact: 0.08 }, { taskId: 'da-query', impact: 0.08 }, { taskId: 'oc-scheduling', impact: 0.05 }], explanation: 'Benchmarks show models completing longer multi-step tasks.', evidence: 'illustrative' },
  { id: 's10', date: '2026-03-12', headline: 'Employers prize communication and relationship skills alongside AI', sourceName: 'LinkedIn Economic Graph', sourceUrl: 'https://economicgraph.linkedin.com/', direction: -1, strength: 0.4, impacts: [{ taskId: 'fa-comms', impact: 0.11 }, { taskId: 'me-partners', impact: 0.08 }, { taskId: 'oc-vendors', impact: 0.06 }], explanation: 'Interpersonal work is valued more as routine work shifts.', evidence: 'illustrative' },
  { id: 's11', date: '2026-02-04', headline: 'Escalations handled by people show higher customer satisfaction', sourceName: 'Zendesk CX Trends', sourceUrl: 'https://www.zendesk.com/customer-experience-trends/', direction: -1, strength: 0.45, impacts: [{ taskId: 'cs-escalation', impact: 0.1 }, { taskId: 'fa-exception', impact: 0.05 }], explanation: 'Complex cases still benefit from a human owner.', evidence: 'illustrative' },
  { id: 's12', date: '2025-11-18', headline: 'Process mining makes SOP drafting faster', sourceName: 'Celonis', sourceUrl: 'https://www.celonis.com/process-mining/', direction: 1, strength: 0.4, impacts: [{ taskId: 'oc-docs', impact: 0.08 }, { taskId: 'cs-kb', impact: 0.05 }], explanation: 'Event logs can generate first-draft procedures.', evidence: 'illustrative' },
  { id: 's13', date: '2025-09-15', headline: 'Usage data shows AI concentrated in writing, coding, and analysis', sourceName: 'Anthropic Economic Index', sourceUrl: 'https://www.anthropic.com/economic-index', direction: 1, strength: 0.5, impacts: [{ taskId: 'da-clean', impact: 0.1 }, { taskId: 'me-copy', impact: 0.1 }, { taskId: 'fa-reporting', impact: 0.05 }], explanation: 'Reported usage clusters in text and data-heavy tasks.', evidence: 'verified' },
  { id: 's14', date: '2025-06-03', headline: 'AI-exposed industries see faster productivity growth', sourceName: 'PwC Global AI Jobs Barometer', sourceUrl: 'https://www.pwc.com/gx/en/issues/artificial-intelligence/ai-jobs-barometer.html', direction: 1, strength: 0.4, impacts: [{ taskId: 'fa-invoice', impact: 0.05 }, { taskId: 'da-query', impact: 0.05 }], explanation: 'Productivity gains are strongest where tasks are most exposed.', evidence: 'verified' },
  { id: 's15', date: '2025-05-20', headline: 'Refined index finds clerical work most exposed to generative AI', sourceName: 'International Labour Organization', sourceUrl: 'https://www.ilo.org/publications/generative-ai-and-jobs-refined-global-index-occupational-exposure', direction: 1, strength: 0.6, impacts: [{ taskId: 'fa-invoice', impact: 0.1 }, { taskId: 'fa-recon', impact: 0.05 }, { taskId: 'cs-faq', impact: 0.05 }], explanation: 'Clerical support occupations show the highest exposure.', evidence: 'verified' },
  { id: 's16', date: '2025-04-23', headline: 'Organisations plan for “agent bosses” who manage AI agents', sourceName: 'Microsoft Work Trend Index', sourceUrl: 'https://www.microsoft.com/en-us/worklab/work-trend-index', direction: -1, strength: 0.35, impacts: [{ taskId: 'fsa-automation', impact: 0.1 }, { taskId: 'fsa-requirements', impact: 0.05 }], explanation: 'New oversight work emerges around AI agents.', evidence: 'verified' },
  { id: 's17', date: '2025-01-07', headline: 'Employers expect AI and big data to be the fastest-growing skills', sourceName: 'World Economic Forum', sourceUrl: 'https://www.weforum.org/publications/the-future-of-jobs-report-2025/', direction: -1, strength: 0.4, impacts: [{ taskId: 'da-story', impact: 0.05 }, { taskId: 'fsa-config', impact: 0.05 }], explanation: 'Analytical and technical skills top growth forecasts.', evidence: 'verified' },
  { id: 's18', date: '2024-01-14', headline: 'Almost 40% of global employment exposed to AI', sourceName: 'International Monetary Fund', sourceUrl: 'https://www.imf.org/en/Publications/Staff-Discussion-Notes/Issues/2024/01/14/Gen-AI-Artificial-Intelligence-and-the-Future-of-Work-542379', direction: 1, strength: 0.5, impacts: [{ taskId: 'fa-reporting', impact: 0.05 }], explanation: 'Exposure is higher in advanced economies and cognitive roles.', evidence: 'verified' },
  { id: 's19', date: '2023-06-14', headline: 'Generative AI could automate activities absorbing 60–70% of time', sourceName: 'McKinsey & Company', sourceUrl: 'https://www.mckinsey.com/capabilities/mckinsey-digital/our-insights/the-economic-potential-of-generative-ai-the-next-productivity-frontier', direction: 1, strength: 0.5, impacts: [{ taskId: 'me-copy', impact: 0.05 }, { taskId: 'cs-faq', impact: 0.05 }], explanation: 'Technical potential, not a forecast of adoption.', evidence: 'verified' },
  { id: 's20', date: '2023-03-17', headline: 'Around 80% of US workers have at least 10% of tasks exposed to LLMs', sourceName: 'Eloundou et al. (arXiv)', sourceUrl: 'https://arxiv.org/abs/2303.10130', direction: 1, strength: 0.4, impacts: [{ taskId: 'da-query', impact: 0.05 }], explanation: 'Early task-level estimate of exposure across occupations.', evidence: 'verified' },
]

export const demoPersona = {
  name: 'Aisyah',
  roleId: 'finance-admin',
  skills: {
    excel: 3,
    erp: 3,
    controls: 3,
    stakeholder: 2,
    analysis: 2,
    writing: 2,
    empathy: 2,
    coordination: 2,
    process: 1,
    automation: 1,
    bi: 1,
    ai: 1,
    stats: 1,
    sql: 0,
    python: 0,
  } as Record<string, number>,
}

export const skillById = Object.fromEntries(skills.map((s) => [s.id, s]))
export const roleById = Object.fromEntries(roles.map((r) => [r.id, r]))
export const taskById = Object.fromEntries(tasks.map((t) => [t.id, t]))
export const tasksForRole = (roleId: string) => tasks.filter((t) => t.roleId === roleId)
