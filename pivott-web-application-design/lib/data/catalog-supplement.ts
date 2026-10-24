import type { CatalogPayload, Role, Skill, Task } from './seed'

type TaskSpec = [name: string, description: string, exposure: number, judgment: number, skills: string[]]
type RoleSpec = { id: string; title: string; family: string; sdgs: number[]; requirements: Role['requirements']; tasks: TaskSpec[] }
const req = (skillId: string, requiredLevel: number, importance: number) => ({ skillId, requiredLevel, importance })

// These additional occupations use the same O*NET 31.0 source and Pivott
// scoring method as the imported snapshot. Demand stays neutral until the
// public job feed produces a verified title match.
const specs: RoleSpec[] = [
  { id:'software-developer', title:'Software Developers', family:'Engineering & Technology', sdgs:[8,9], requirements:[req('programming',4,5),req('complex-problem-solving',4,5),req('critical-thinking',4,4),req('active-learning',3,3),req('mathematics',3,3),req('writing',3,2)], tasks:[
    ['Analyse software requirements','Analyse user needs and software requirements to determine whether a design is feasible. O*NET-SOC 15-1252.00.',0.58,0.58,['complex-problem-solving','critical-thinking']],
    ['Design software systems','Design or develop software systems using computer science, engineering and mathematical analysis. O*NET-SOC 15-1252.00.',0.48,0.67,['programming','mathematics']],
    ['Modify and test software','Modify existing software to correct errors, adapt it to hardware or improve performance. O*NET-SOC 15-1252.00.',0.62,0.48,['programming','monitoring']],
    ['Collaborate on delivery','Confer with colleagues about project limitations, capabilities and interfaces. O*NET-SOC 15-1252.00.',0.25,0.82,['active-listening','speaking']],
  ]},
  { id:'civil-engineer', title:'Civil Engineers', family:'Engineering & Technology', sdgs:[8,9,11], requirements:[req('mathematics',4,5),req('complex-problem-solving',4,5),req('critical-thinking',4,4),req('judgment-and-decision-making',4,4),req('writing',3,3)], tasks:[
    ['Design infrastructure systems','Plan and design transportation, hydraulic or structural systems using established standards. O*NET-SOC 17-2051.00.',0.38,0.78,['mathematics','complex-problem-solving']],
    ['Inspect project sites','Inspect sites to monitor progress and compliance with design specifications and safety standards. O*NET-SOC 17-2051.00.',0.18,0.88,['monitoring','critical-thinking']],
    ['Estimate project needs','Estimate quantities, cost, resources and time required for engineering projects. O*NET-SOC 17-2051.00.',0.55,0.55,['mathematics','judgment-and-decision-making']],
    ['Prepare technical reports','Prepare or present reports on design, environmental impact and project status. O*NET-SOC 17-2051.00.',0.48,0.58,['writing','speaking']],
  ]},
  { id:'electrical-engineer', title:'Electrical Engineers', family:'Engineering & Technology', sdgs:[7,8,9], requirements:[req('mathematics',4,5),req('complex-problem-solving',4,5),req('critical-thinking',4,4),req('monitoring',3,3),req('writing',3,2)], tasks:[
    ['Design electrical systems','Design electrical systems, components or equipment to meet technical requirements. O*NET-SOC 17-2071.00.',0.4,0.75,['mathematics','complex-problem-solving']],
    ['Prepare specifications','Prepare technical drawings, specifications and procedures for electrical equipment. O*NET-SOC 17-2071.00.',0.5,0.6,['writing','critical-thinking']],
    ['Investigate failures','Investigate electrical equipment failures and recommend corrective action. O*NET-SOC 17-2071.00.',0.28,0.82,['critical-thinking','judgment-and-decision-making']],
    ['Oversee installation','Supervise installation, testing and operation so equipment meets standards. O*NET-SOC 17-2071.00.',0.2,0.85,['monitoring','speaking']],
  ]},
  { id:'mechanical-engineer', title:'Mechanical Engineers', family:'Engineering & Technology', sdgs:[8,9,12], requirements:[req('mathematics',4,5),req('complex-problem-solving',4,5),req('critical-thinking',4,4),req('monitoring',3,3),req('active-learning',3,2)], tasks:[
    ['Design mechanical devices','Design or redesign mechanical and thermal devices using analysis and computer-aided tools. O*NET-SOC 17-2141.00.',0.42,0.73,['mathematics','complex-problem-solving']],
    ['Read technical drawings','Read and interpret technical drawings, schematics and computer-generated reports. O*NET-SOC 17-2141.00.',0.48,0.58,['reading-comprehension','critical-thinking']],
    ['Test prototypes','Develop and test prototypes, analyse results and change designs as needed. O*NET-SOC 17-2141.00.',0.34,0.76,['monitoring','critical-thinking']],
    ['Oversee manufacturing','Oversee manufacture and installation of mechanical systems or equipment. O*NET-SOC 17-2141.00.',0.2,0.84,['monitoring','coordination']],
  ]},
  { id:'industrial-engineer', title:'Industrial Engineers', family:'Engineering & Technology', sdgs:[8,9,12], requirements:[req('mathematics',4,5),req('complex-problem-solving',4,5),req('critical-thinking',4,4),req('monitoring',4,4),req('coordination',3,3)], tasks:[
    ['Review production processes','Review schedules, specifications and process flows to understand manufacturing activities. O*NET-SOC 17-2112.00.',0.52,0.58,['reading-comprehension','monitoring']],
    ['Improve operating methods','Find ways to reduce cost, improve quality and make better use of people and equipment. O*NET-SOC 17-2112.00.',0.35,0.8,['complex-problem-solving','critical-thinking']],
    ['Estimate production cost','Estimate production costs and effects of product-design changes. O*NET-SOC 17-2112.00.',0.57,0.52,['mathematics','judgment-and-decision-making']],
    ['Coordinate quality control','Develop management-control systems that make production and financial planning more effective. O*NET-SOC 17-2112.00.',0.38,0.72,['coordination','monitoring']],
  ]},
  { id:'environmental-scientist', title:'Environmental Scientists and Specialists', family:'Science & Research', sdgs:[6,12,13], requirements:[req('science',4,5),req('critical-thinking',4,5),req('writing',4,4),req('complex-problem-solving',3,4),req('speaking',3,3)], tasks:[
    ['Collect environmental samples','Collect and analyse air, soil, water or other samples to identify threats to the environment or health. O*NET-SOC 19-2041.00.',0.25,0.82,['science','monitoring']],
    ['Analyse environmental data','Analyse data to assess environmental conditions and the effect of human activity. O*NET-SOC 19-2041.00.',0.46,0.68,['science','critical-thinking']],
    ['Advise organisations','Provide scientific guidance on environmental hazards, regulations and corrective action. O*NET-SOC 19-2041.00.',0.22,0.86,['speaking','judgment-and-decision-making']],
    ['Prepare technical reports','Prepare research or technical reports and present findings to stakeholders. O*NET-SOC 19-2041.00.',0.47,0.61,['writing','speaking']],
  ]},
  { id:'chemist', title:'Chemists', family:'Science & Research', sdgs:[3,8,9], requirements:[req('science',5,5),req('critical-thinking',4,4),req('mathematics',4,4),req('monitoring',4,4),req('writing',3,3)], tasks:[
    ['Analyse chemical compounds','Analyse organic or inorganic compounds to determine chemical or physical properties. O*NET-SOC 19-2031.00.',0.34,0.74,['science','mathematics']],
    ['Develop laboratory methods','Develop, improve or customise products, equipment, formulas and analytical methods. O*NET-SOC 19-2031.00.',0.27,0.83,['science','complex-problem-solving']],
    ['Maintain laboratory quality','Set up, maintain and verify laboratory instruments and quality-control standards. O*NET-SOC 19-2031.00.',0.31,0.75,['monitoring','critical-thinking']],
    ['Report research findings','Write technical papers or reports and present findings to colleagues. O*NET-SOC 19-2031.00.',0.45,0.63,['writing','speaking']],
  ]},
  { id:'medical-scientist', title:'Medical Scientists, Except Epidemiologists', family:'Science & Research', sdgs:[3,8,9], requirements:[req('science',5,5),req('critical-thinking',4,5),req('writing',4,4),req('active-learning',4,4),req('reading-comprehension',4,3)], tasks:[
    ['Plan medical studies','Plan and direct studies that investigate human disease and methods of prevention or treatment. O*NET-SOC 19-1042.00.',0.22,0.88,['science','judgment-and-decision-making']],
    ['Analyse clinical data','Analyse clinical or experimental data and interpret results. O*NET-SOC 19-1042.00.',0.43,0.72,['science','critical-thinking']],
    ['Develop research procedures','Develop and test procedures, equipment or treatments for medical research. O*NET-SOC 19-1042.00.',0.26,0.84,['science','complex-problem-solving']],
    ['Publish research','Write grant proposals, technical reports and scientific articles. O*NET-SOC 19-1042.00.',0.5,0.62,['writing','reading-comprehension']],
  ]},
  { id:'registered-nurse', title:'Registered Nurses', family:'Health', sdgs:[3,8], requirements:[req('active-listening',5,5),req('service-orientation',5,5),req('social-perceptiveness',4,5),req('critical-thinking',4,4),req('monitoring',4,4),req('speaking',4,4)], tasks:[
    ['Assess patient health','Assess patients’ health problems and needs and develop nursing-care plans. O*NET-SOC 29-1141.00.',0.14,0.94,['active-listening','critical-thinking']],
    ['Administer care','Administer nursing care, medicines and prescribed treatments while monitoring responses. O*NET-SOC 29-1141.00.',0.12,0.96,['service-orientation','monitoring']],
    ['Document clinical information','Record patients’ medical information and vital signs accurately. O*NET-SOC 29-1141.00.',0.5,0.62,['writing','monitoring']],
    ['Coordinate care teams','Consult and coordinate with health-care team members about patient care. O*NET-SOC 29-1141.00.',0.18,0.9,['speaking','coordination']],
  ]},
  { id:'web-digital-interface-designer', title:'Web and Digital Interface Designers', family:'Design & Digital', sdgs:[8,9,10], requirements:[req('programming',4,4),req('critical-thinking',4,4),req('active-listening',4,4),req('complex-problem-solving',3,3),req('writing',3,2)], tasks:[
    ['Design digital interfaces','Design and develop user interfaces, site layouts and navigation with usability in mind. O*NET-SOC 15-1255.00.',0.48,0.7,['programming','critical-thinking']],
    ['Research user needs','Gather and evaluate user requirements with product teams and users. O*NET-SOC 15-1255.00.',0.26,0.84,['active-listening','social-perceptiveness']],
    ['Test interface usability','Test layouts, links and interfaces for usability, compatibility and accessibility. O*NET-SOC 15-1255.00.',0.43,0.68,['monitoring','critical-thinking']],
    ['Build interface components','Write supporting code and create digital assets for web interfaces. O*NET-SOC 15-1255.00.',0.61,0.5,['programming','complex-problem-solving']],
  ]},
]

export const supplementAliases: Record<string,string[]> = {
  'software-developer':['software developer','software engineer','backend developer','frontend developer','full stack developer','softwareentwickler'],
  'civil-engineer':['civil engineer','structural engineer','bauingenieur','construction engineer'],
  'electrical-engineer':['electrical engineer','electronics engineer','elektroingenieur','hardware engineer'],
  'mechanical-engineer':['mechanical engineer','maschinenbauingenieur','design engineer','manufacturing engineer'],
  'industrial-engineer':['industrial engineer','process engineer','production engineer','wirtschaftsingenieur'],
  'environmental-scientist':['environmental scientist','environmental specialist','umweltwissenschaftler','environmental consultant'],
  'chemist':['chemist','analytical chemist','research chemist','chemiker','laboratory scientist'],
  'medical-scientist':['medical scientist','biomedical scientist','clinical scientist','medical researcher'],
  'registered-nurse':['registered nurse','staff nurse','nurse','pflegefachkraft','krankenschwester','krankenpfleger'],
  'web-digital-interface-designer':['ui designer','ux designer','product designer','web designer','interface designer','webdesigner'],
}

const extraRoles: Role[] = specs.map(spec => ({ id:spec.id, title:spec.title, family:spec.family, demand:50, requirements:spec.requirements, sdgs:spec.sdgs }))
const extraTasks: Task[] = specs.flatMap(spec => spec.tasks.map((task,index) => ({ id:`onet-${spec.id}-${index+1}`, roleId:spec.id, name:task[0], description:task[1], baseExposure:task[2], humanJudgment:task[3], defaultShare:25, skills:task[4], tryThisWeek:`Observe or practise “${task[0].toLowerCase()}” once, then note which steps need human review.` })))
const extraSkills: Skill[] = [{ id:'science', name:'Science', category:'Analytical', hoursPerLevel:10, sdgs:[4,9], deliverable:'A one-page analysis applying scientific reasoning to a real role-specific question.' }]

export function addCatalogSupplement(payload: CatalogPayload): CatalogPayload {
  const roleIds = new Set(payload.roles.map(role => role.id))
  const roles = [...payload.roles, ...extraRoles.filter(role => !roleIds.has(role.id))]
  const included = new Set(roles.map(role => role.id))
  const taskIds = new Set(payload.tasks.map(task => task.id))
  const tasks = [...payload.tasks, ...extraTasks.filter(task => included.has(task.roleId) && !taskIds.has(task.id))]
  const skillIds = new Set(payload.skills.map(skill => skill.id))
  const skills = [...payload.skills, ...extraSkills.filter(skill => !skillIds.has(skill.id))]
  return { ...payload, version: payload.version.includes('catalog20') ? payload.version : `${payload.version}+catalog20`, roles, tasks, skills }
}
