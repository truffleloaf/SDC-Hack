import { roles, tasks, skills, roleById, tasksForRole } from '../data/seed'
import type { AppState } from '../store'

export interface Evidence { id: string; excerpt: string }
export interface ResumeSuggestions {
  roles: Evidence[]
  tasks: Evidence[]
  skills: Evidence[]
}

// Deliberately bounded to Pivott's catalogue. These are text matches, not ability ratings.
const skillTerms: Record<string, string[]> = {
  excel: ['excel', 'spreadsheets', 'spreadsheet modelling', 'spreadsheet modeling', 'google sheets', 'pivot tables', 'vlookup'],
  erp: ['erp', 'sap', 'oracle financials', 'netsuite', 'dynamics 365'],
  sql: ['sql', 'postgresql', 'mysql', 'sql server'],
  python: ['python', 'pandas'],
  bi: ['power bi', 'tableau', 'looker', 'business intelligence', 'bi dashboards'],
  automation: ['process automation', 'workflow automation', 'power automate', 'uipath', 'rpa'],
  ai: ['ai tools', 'generative ai', 'chatgpt', 'copilot', 'claude'],
  analysis: ['data analysis', 'data analytics', 'financial analysis', 'variance analysis', 'analytical reporting'],
  stats: ['statistics', 'statistical analysis', 'hypothesis testing', 'regression analysis'],
  controls: ['financial controls', 'internal controls', 'audit controls', 'control matrix'],
  stakeholder: ['stakeholder communication', 'stakeholder management', 'requirements gathering', 'client communication'],
  writing: ['copywriting', 'technical writing', 'report writing', 'storytelling', 'content writing'],
  empathy: ['customer empathy', 'customer service', 'customer support', 'customer experience', 'customer relationships'],
  process: ['process design', 'process improvement', 'process mapping', 'standard operating procedures', 'sops'],
  coordination: ['project coordination', 'project management', 'scheduling', 'logistics', 'milestone tracking'],
}
const roleTerms: Record<string, string[]> = {
  'sales-operations': ['sales operations coordinator', 'sales operations analyst'],
  'hr-operations': ['hr operations coordinator', 'human resources coordinator', 'hr administrator'],
  'finance-admin': ['finance admin', 'finance administrator', 'accounts executive', 'accounts assistant', 'finance assistant', 'accounts payable', 'accounting clerk', 'bookkeeper'],
  'finance-systems-analyst': ['finance systems analyst', 'financial systems analyst', 'erp analyst', 'finance systems consultant'],
  'data-analyst': ['data analyst', 'business intelligence analyst', 'analytics analyst'],
  'marketing-executive': ['marketing executive', 'marketing specialist', 'digital marketer', 'digital marketing', 'marketing coordinator'],
  'customer-support-specialist': ['customer support specialist', 'customer service representative', 'customer support', 'customer service executive'],
  'operations-coordinator': ['operations coordinator', 'operations executive', 'logistics coordinator', 'project coordinator'],
}
const taskTerms: Record<string, string[]> = {
  'fa-invoice': ['invoice entry', 'invoice processing', 'processed invoices', 'supplier invoices', 'invoice coding'],
  'fa-recon': ['bank reconciliation', 'bank reconciliations', 'reconciled bank', 'reconcile bank'],
  'fa-exception': ['exception handling', 'payment discrepancies', 'invoice discrepancies', 'duplicate payments'],
  'fa-reporting': ['month end reporting', 'month end reports', 'month end packs', 'monthly financial reports'],
  'fa-comms': ['payment queries', 'vendor queries', 'client communication'],
  'fa-expense': ['expense claims', 'expense claim review', 'reviewed expenses', 'expense reports'],
  'fsa-config': ['erp configuration', 'erp testing', 'configured sap', 'configured erp'],
  'fsa-pipeline': ['finance data pipelines', 'bank feeds', 'erp integration', 'financial data integration'],
  'fsa-controls': ['system controls', 'audit design', 'control design'],
  'fsa-automation': ['workflow automation', 'automated workflows', 'approval flows', 'automation build'],
  'fsa-requirements': ['requirements workshops', 'requirements gathering', 'gathered requirements'],
  'da-clean': ['data cleaning', 'data cleansing', 'cleaned datasets', 'cleaned data'],
  'da-query': ['sql querying', 'sql queries', 'wrote queries', 'database queries'],
  'da-dashboards': ['dashboard building', 'built dashboards', 'power bi dashboards', 'tableau dashboards'],
  'da-story': ['insight storytelling', 'presented findings', 'communicated insights', 'data storytelling'],
  'da-adhoc': ['ad hoc analysis', 'ad hoc analytical', 'ad hoc reports'],
  'me-copy': ['copywriting', 'campaign copy', 'landing page copy', 'email campaigns'],
  'me-social': ['social scheduling', 'scheduled posts', 'social media calendar', 'content calendar'],
  'me-reporting': ['campaign reporting', 'campaign performance', 'marketing reports'],
  'me-partners': ['brand partnerships', 'creator partnerships', 'influencer partnerships'],
  'me-research': ['audience research', 'audience segmentation', 'customer research'],
  'cs-triage': ['ticket triage', 'routed tickets', 'categorised tickets', 'categorized tickets'],
  'cs-faq': ['faq responses', 'answered customer questions', 'responded to customer', 'customer enquiries', 'customer inquiries'],
  'cs-escalation': ['escalation handling', 'handled escalations', 'resolved escalations', 'customer complaints'],
  'cs-kb': ['knowledge base', 'help articles', 'support documentation'],
  'cs-feedback': ['customer feedback', 'feedback synthesis', 'feedback analysis'],
  'oc-scheduling': ['scheduling', 'shift planning', 'rota', 'logistics coordination'],
  'oc-vendors': ['vendor coordination', 'supplier management', 'vendor management', 'supplier relationships'],
  'oc-docs': ['process documentation', 'standard operating procedures', 'sops'],
  'oc-tracking': ['order tracking', 'inventory monitoring', 'inventory management', 'stock levels'],
  'oc-improve': ['improvement projects', 'process improvement', 'continuous improvement'],
}

const normalise = (text: string) => text.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
function findEvidence(text: string, terms: string[]): string | null {
  // Keep source excerpts small and ephemeral; they are never part of the saved profile.
  for (const source of text.split(/[\n\r]+/).filter(Boolean)) {
    const line = ` ${normalise(source)} `
    for (const term of terms) {
      const at = line.indexOf(` ${normalise(term)} `)
      if (at < 0) continue
      const before = line.slice(Math.max(0, at - 55), at)
      if (/\b(?:no|without)\b.{0,40}$|\bnot familiar with\s*$|\b(?:want|wish) to learn\s*$/.test(before)) continue
      return source.trim().slice(0, 180)
    }
  }
  return null
}

export function suggestFromResume(text: string): ResumeSuggestions {
  const match = (items: { id: string; name?: string; title?: string }[], terms: Record<string, string[]>) => items.flatMap((item) => {
    const excerpt = findEvidence(text, [...(terms[item.id] ?? []), item.name ?? item.title ?? item.id])
    return excerpt ? [{ id: item.id, excerpt }] : []
  })
  const matchedTasks = match(tasks, taskTerms)
  const matchedSkills = match(skills, skillTerms)
  const directRoles = match(roles, roleTerms)
  const candidates = roles.map((role) => {
    const direct = directRoles.find((item) => item.id === role.id)
    const work = matchedTasks.filter((item) => tasks.some((task) => task.id === item.id && task.roleId === role.id))
    const overlap = role.requirements.filter((requirement) => matchedSkills.some((item) => item.id === requirement.skillId)).length
    return { id: role.id, excerpt: direct?.excerpt ?? work[0]?.excerpt ?? '', score: (direct ? 10 : 0) + work.length * 3 + overlap, eligible: !!direct || work.length >= 2 }
  }).filter((item) => item.eligible).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
  return { roles: candidates.slice(0, 3).map(({ id, excerpt }) => ({ id, excerpt })), tasks: matchedTasks, skills: matchedSkills }
}

/** Only user-confirmed catalogue IDs enter persistent state. No résumé text or ratings. */
export function resumeProfilePatch(current: AppState, input: { roleId: string; jobTitle: string; taskIds: string[]; skillIds: string[] }): Partial<AppState> {
  if (current.mode === 'demo') throw new Error('Exit the example before importing your own work.')
  if (!Object.hasOwn(roleById, input.roleId)) throw new Error('Choose a reference role.')
  const selected = tasksForRole(input.roleId).filter((task) => input.taskIds.includes(task.id))
  if (!selected.length) throw new Error('Select at least one task that reflects your work.')
  const total = selected.reduce((sum, task) => sum + task.defaultShare, 0)
  return {
    roleId: input.roleId, jobTitle: input.jobTitle.trim().slice(0, 60),
    selections: selected.map((task) => ({ taskId: task.id, share: task.defaultShare / total * 100 })),
    resumeSkillIds: [...new Set(input.skillIds)].filter((id) => skills.some((skill) => skill.id === id)),
    taskNames: {}, targetRoleId: null, completedSteps: [], recentlyChanged: [],
  }
}
