/**
 * Modeling domains vs diagram types.
 *
 * WebGME / MDSS "domains" are modeling concerns (ci-cd, uml, systems-engineering…).
 * Diagram types (flowchart, sequence, ears…) are view languages that domains may share.
 * Couplings bind a domain to a diagram type and name the translators that carry
 * domain knowledge ↔ diagram text (and later ↔ Core META).
 */

/** Prefer these labels over raw kebab-case ids. */
const DOMAIN_LABELS = {
  'ci-cd': 'CI/CD & workflows',
  uml: 'Object-oriented / UML design',
  'software-architecture': 'Software & enterprise architecture',
  'software-interaction': 'API / protocol interaction',
  'systems-engineering': 'Systems engineering / MBSE',
  'requirements-management': 'Requirements & product scope',
  'requirements-specification': 'Requirements specification (EARS)',
  'safety-critical': 'Safety-critical verification',
  'finite-state-machines': 'Finite-state / embedded / UI state',
  'database-design': 'Database / ER modeling',
  'process-modeling': 'Process modeling',
  workflows: 'Workflows',
  'event-driven-architecture': 'Event-driven / CQRS / DDD',
  'project-management': 'Agile delivery & work tracking',
  strategy: 'Strategy & technology evolution',
  'root-cause-analysis': 'Root-cause / quality',
  'cloud-architecture': 'Cloud / infra topology',
  'llm-assisted-engineering': 'LLM-assisted engineering',
  'object-oriented-design': 'Object-oriented design',
  'system-context': 'System context',
  protocols: 'Protocols',
  'data-modeling': 'Data modeling',
  mbse: 'MBSE',
  embedded: 'Embedded systems',
  'embedded-systems': 'Embedded systems'
};

/** S1 story — coarse modeling domains the create form offers. */
export const S1_MODELING_DOMAINS = [
  'systems-engineering',
  'requirements-management',
  'requirements-specification',
  'safety-critical',
  'llm-assisted-engineering',
  'uml',
  'software-architecture',
  'system-context',
  'object-oriented-design',
  'finite-state-machines',
  'embedded-systems',
  'software-interaction',
  'protocols',
  'process-modeling',
  'workflows',
  'database-design',
  'data-modeling'
];

/** Diagram types a project may allow while the studio stays on S1. */
export const S1_DIAGRAM_TYPES = [
  'ears',
  'requirement',
  'usecase',
  'c4',
  'architecture',
  'class',
  'state',
  'sequence',
  'flowchart',
  'er',
  'block',
  'gantt',
  'kanban'
];

const DIAGRAM_LABELS = {
  ears: 'EARS',
  requirement: 'Requirement',
  usecase: 'Use case',
  c4: 'C4',
  architecture: 'Architecture',
  class: 'Class',
  state: 'State',
  sequence: 'Sequence',
  flowchart: 'Flowchart',
  er: 'Entity-relationship',
  block: 'Block',
  gantt: 'Gantt',
  kanban: 'Kanban'
};

/**
 * Diagrams each coarse S1 domain allows.
 * Taken from domainIndex, limited to S1 diagram types (so protocols does not
 * pull in packet, which this story does not use).
 */
export const S1_DOMAIN_DIAGRAMS = {
  'systems-engineering': ['requirement', 'ears', 'c4'],
  'requirements-management': ['requirement', 'ears', 'usecase'],
  'requirements-specification': ['ears'],
  'safety-critical': ['requirement', 'ears'],
  'llm-assisted-engineering': ['ears'],
  uml: ['sequence', 'class', 'state', 'usecase'],
  'software-architecture': ['class', 'c4', 'architecture', 'block'],
  'system-context': ['c4'],
  'object-oriented-design': ['class'],
  'finite-state-machines': ['state'],
  'embedded-systems': ['state'],
  'software-interaction': ['sequence'],
  protocols: ['sequence', 'state'],
  'process-modeling': ['flowchart'],
  workflows: ['flowchart'],
  'database-design': ['er'],
  'data-modeling': ['er']
};

export function diagramLabel(diagramType) {
  return DIAGRAM_LABELS[diagramType] || diagramType;
}

export function diagramsForDomain(domainId) {
  return [...(S1_DOMAIN_DIAGRAMS[domainId] || [])];
}

export function domainLabel(domainId) {
  if (DOMAIN_LABELS[domainId]) return DOMAIN_LABELS[domainId];
  return String(domainId || '')
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/**
 * @param {object} catalog diagram-catalog.json
 * @returns {{ id: string, name: string, diagramTypes: string[] }[]}
 */
export function listModelingDomains(catalog) {
  const index = catalog?.domainIndex || {};
  return Object.keys(index)
    .sort()
    .map((id) => ({
      id,
      name: domainLabel(id),
      diagramTypes: [...(index[id] || [])]
    }));
}

export function diagramTypesForDomain(catalog, modelingDomainId) {
  return [...(catalog?.domainIndex?.[modelingDomainId] || [])];
}

/**
 * Couplings available for a modeling domain: each allowed diagram type + translators.
 * Translators are domain-rooted configuration points — same flowchart type can mean
 * different META mappings under ci-cd vs business-process later.
 */
export function couplingsForDomain(catalog, modelingDomainId) {
  return diagramTypesForDomain(catalog, modelingDomainId).map((diagramType) => ({
    modelingDomainId,
    diagramType,
    importTranslator: diagramType === 'ears' ? 'ImportEARS' : 'ImportMermaid',
    exportTranslator: diagramType === 'ears' ? 'ExportEARS' : 'ExportMermaid',
    // Future: domainKnowledge pack that specializes META ↔ syntax for this domain.
    domainKnowledgeId: `${modelingDomainId}:${diagramType}`
  }));
}

export function findDiagramMeta(catalog, diagramType) {
  const diagrams = catalog?.diagrams || [];
  const companions = catalog?.companionLanguages || [];
  return (
    diagrams.find((d) => d.id === diagramType) ||
    companions.find((d) => d.id === diagramType) ||
    null
  );
}

/** First modeling domain among `enabled` that lists `diagramType`. */
export function inferModelingDomain(catalog, diagramType, enabledModelingDomains = []) {
  const index = catalog?.domainIndex || {};
  for (const id of enabledModelingDomains) {
    if ((index[id] || []).includes(diagramType)) return id;
  }
  for (const [id, types] of Object.entries(index)) {
    if ((types || []).includes(diagramType)) return id;
  }
  return null;
}

/** Known diagram / companion package ids (for migrating old demo stores). */
export function isDiagramPackageId(catalog, id) {
  if (!id) return false;
  if ((catalog?.diagrams || []).some((d) => d.id === id)) return true;
  if ((catalog?.companionLanguages || []).some((d) => d.id === id)) return true;
  return false;
}
