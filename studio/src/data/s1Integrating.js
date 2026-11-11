/**
 * Domain-independent integrating instance for the S1 demo.
 *
 * Diagram metamodels stay shared. This layer only says:
 * - which elements are the same portion of the system (SystemElement + AspectRefs)
 * - how one portion uses another (Correspondence)
 * - which story checks hold or are still open (ConstraintInstance)
 *
 * Ends name diagram elements. They do not name modeling domains.
 */

const D = {
  ears: 'requirements-specification:ears:aeb-cacc-shalls',
  req: 'requirements-management:requirement:aeb-req-trace',
  scenarios: 'process-modeling:flowchart:driver-scenarios',
  c4: 'system-context:c4:vehicle-context',
  arch: 'software-architecture:architecture:ecu-services',
  cls: 'object-oriented-design:class:fusion-control',
  state: 'finite-state-machines:state:aeb-modes',
  seq: 'software-interaction:sequence:obstacle-brake',
  fault: 'software-interaction:sequence:sensor-fault',
  flow: 'process-modeling:flowchart:plausibility-gate',
  er: 'database-design:er:vehicle-trip'
};

function ref(id, systemElement, diagramKey, diagramType, element, role, symbol) {
  return {
    id,
    systemElement,
    diagramKey,
    diagramType,
    element,
    role,
    ...(symbol ? { symbol } : {})
  };
}

function link(id, kind, ruleId, from, to) {
  return { id, kind, ruleId, ends: [from, to] };
}

const aspectRefs = [
  ref('arch.brake', 'BrakeController', D.arch, 'architecture', 'BrakeController', 'Service', 'brake'),
  ref('cls.brake', 'BrakeController', D.cls, 'class', 'BrakeController', 'Class'),
  ref('seq.brake', 'BrakeController', D.seq, 'sequence', 'BrakeController', 'Participant'),
  ref('fault.brake', 'BrakeController', D.fault, 'sequence', 'BrakeController', 'Participant'),

  ref('arch.fusion', 'FusionApp', D.arch, 'architecture', 'FusionApp', 'Service', 'fusion'),
  ref('seq.fusion', 'FusionApp', D.seq, 'sequence', 'FusionApp', 'Participant'),
  ref('fault.fusion', 'FusionApp', D.fault, 'sequence', 'FusionApp', 'Participant'),
  ref('cls.fusion', 'SensorFusion', D.cls, 'class', 'SensorFusion', 'Class'),

  ref('arch.radar', 'RadarECU', D.arch, 'architecture', 'RadarECU', 'Service', 'radar'),
  ref('seq.radar', 'RadarECU', D.seq, 'sequence', 'RadarECU', 'Participant'),

  ref('arch.camera', 'CameraECU', D.arch, 'architecture', 'CameraECU', 'Service', 'camera'),
  ref('fault.camera', 'CameraECU', D.fault, 'sequence', 'CameraECU', 'Participant'),

  ref('arch.hmi', 'HMI', D.arch, 'architecture', 'HMI', 'Service', 'hmi'),
  ref('seq.hmi', 'HMI', D.seq, 'sequence', 'HMI', 'Participant'),

  ref('arch.long', 'LongitudinalController', D.arch, 'architecture', 'LongitudinalController', 'Service', 'longctrl'),
  ref('cls.long', 'LongitudinalController', D.cls, 'class', 'LongitudinalController', 'Class'),

  ref('arch.v2x', 'V2XGateway', D.arch, 'architecture', 'V2XGateway', 'Service', 'v2x'),

  ref('c4.driver', 'Driver', D.c4, 'c4', 'Driver', 'Person', 'driver'),
  ref('flow.driver', 'Driver', D.scenarios, 'flowchart', 'Driver', 'Actor'),
  ref('seq.driver', 'Driver', D.seq, 'sequence', 'Driver', 'Actor'),

  ref('ears.aeb1', 'REQ-AEB-001', D.ears, 'ears', 'REQ-AEB-001', 'Clause'),
  ref('req.aeb1', 'REQ-AEB-001', D.req, 'requirement', 'AEB_DetectAndBrake', 'Requirement'),

  ref('ears.aeb3', 'REQ-AEB-003', D.ears, 'ears', 'REQ-AEB-003', 'Clause'),
  ref('req.aeb3', 'REQ-AEB-003', D.req, 'requirement', 'AEB_InhibitLowConfidence', 'Requirement'),

  ref('ears.cacc1', 'REQ-CACC-001', D.ears, 'ears', 'REQ-CACC-001', 'Clause'),
  ref('req.cacc1', 'REQ-CACC-001', D.req, 'requirement', 'CACC_MaintainGap', 'Requirement'),

  ref('ears.aeb2', 'REQ-AEB-002', D.ears, 'ears', 'REQ-AEB-002', 'Clause'),
  ref('state.active', 'AEB_Active', D.state, 'state', 'AEB_Active', 'State'),

  ref('req.engage', 'DriverEngageCACC', D.req, 'requirement', 'DriverEngageCACC', 'Element'),
  ref('flow.engage', 'DriverEngageCACC', D.scenarios, 'flowchart', 'DriverEngageCACC', 'Step'),

  ref('req.ebrake', 'EmergencyBrake', D.req, 'requirement', 'EmergencyBrake', 'Element'),
  ref('flow.ebrake', 'EmergencyBrake', D.scenarios, 'flowchart', 'EmergencyBrake', 'Step'),

  ref('req.proof', 'ObstacleDetectPath', D.req, 'requirement', 'ObstacleDetect_Seq', 'Element'),
  ref('seq.path', 'ObstacleDetectPath', D.seq, 'sequence', 'obstacle-brake', 'Diagram'),

  ref('seq.detect', 'ObstacleDetect', D.seq, 'sequence', 'ObstacleDetect', 'Message'),
  ref('flow.detect', 'ObstacleDetect', D.flow, 'flowchart', 'ObstacleDetect', 'Step'),

  ref('seq.brakeReq', 'BrakeRequest', D.seq, 'sequence', 'BrakeRequest', 'Message'),
  ref('state.brakeReq', 'BrakeRequest', D.state, 'state', 'BrakeRequest', 'Transition'),
  ref('flow.brakeReq', 'BrakeRequest', D.flow, 'flowchart', 'BrakeRequest', 'Step'),

  ref('seq.plaus', 'PlausibilityCheck', D.seq, 'sequence', 'PlausibilityCheck', 'Message'),
  ref('flow.plaus', 'PlausibilityCheck', D.flow, 'flowchart', 'PlausibilityCheck', 'Step'),
  ref('cls.threat', 'ThreatAssessor', D.cls, 'class', 'ThreatAssessor', 'Class'),

  ref('cls.track', 'ObstacleTrack', D.cls, 'class', 'ObstacleTrack', 'Class'),
  ref('er.track', 'ObstacleTrack', D.er, 'er', 'ObstacleTrack', 'Entity'),

  ref('req.spoof', 'Sec_AntiSpoof', D.req, 'requirement', 'Sec_AntiSpoof', 'Requirement')
];

const correspondences = [
  link('c.engage-satisfies', 'satisfies', 'req-scenario-coverage', 'req.engage', 'req.cacc1'),
  link('c.ebrake-satisfies', 'satisfies', 'req-scenario-coverage', 'req.ebrake', 'req.aeb1'),
  link('c.path-verifies-aeb1', 'verifies', 'req-verify-path', 'req.proof', 'req.aeb1'),
  link('c.path-verifies-aeb3', 'verifies', 'req-verify-path', 'req.proof', 'req.aeb3'),
  link('c.when-detect', 'when', 'when-trigger-binds-message', 'ears.aeb1', 'seq.detect'),
  link('c.while-active', 'while', 'while-precondition-binds-mode', 'ears.aeb2', 'state.active'),
  link('c.subject-brake', 'subject', 'system-subject-binds-service', 'ears.aeb1', 'arch.brake'),
  link('c.plaus-alloc', 'allocates', 'function-allocation', 'flow.plaus', 'arch.fusion'),
  link('c.plaus-owned', 'ownedBy', 'decision-owned-by-type', 'flow.plaus', 'cls.threat'),
  link('c.fusion-realizes', 'realizes', 'decision-owned-by-type', 'cls.fusion', 'arch.fusion'),
  link('c.detect-uses-track', 'uses', 'payload-schema-contract', 'seq.detect', 'er.track'),
  link('c.brake-alloc', 'allocates', 'function-allocation', 'flow.brakeReq', 'arch.brake')
];

const constraints = [
  {
    id: 'k.specifies',
    ruleId: 'specifies-body',
    status: 'holds',
    summary:
      'REQ-AEB-001, REQ-AEB-003, and REQ-CACC-001 are the same requirements in EARS and on the requirement diagram.'
  },
  {
    id: 'k.scenario',
    ruleId: 'req-scenario-coverage',
    status: 'holds',
    summary: 'DriverEngageCACC satisfies CACC_MaintainGap. EmergencyBrake satisfies AEB_DetectAndBrake.'
  },
  {
    id: 'k.spoof',
    ruleId: 'req-scenario-coverage',
    status: 'open',
    summary: 'Sec_AntiSpoof has a requirement node and no scenario or sequence.'
  },
  {
    id: 'k.verify',
    ruleId: 'req-verify-path',
    status: 'holds',
    summary: 'ObstacleDetect_Seq is the obstacle-brake sequence and verifies AEB-001 and AEB-003.'
  },
  {
    id: 'k.when',
    ruleId: 'when-trigger-binds-message',
    status: 'holds',
    summary: 'REQ-AEB-001’s When trigger is the ObstacleDetect message.'
  },
  {
    id: 'k.while',
    ruleId: 'while-precondition-binds-mode',
    status: 'holds',
    summary: 'REQ-AEB-002’s While precondition is the state AEB_Active.'
  },
  {
    id: 'k.subject',
    ruleId: 'system-subject-binds-service',
    status: 'holds',
    summary: 'The EARS system of REQ-AEB-001 is the BrakeController service.'
  },
  {
    id: 'k.container',
    ruleId: 'participant-binds-container',
    status: 'holds',
    summary:
      'Sequence actor Driver is the C4 person Driver. ECU participants sit inside the C4 system Ego Vehicle and bind as architecture services.'
  },
  {
    id: 'k.service',
    ruleId: 'participant-binds-service',
    status: 'holds',
    summary:
      'RadarECU, CameraECU, FusionApp, BrakeController, and HMI each have a sequence participant and an architecture service on the same system element.'
  },
  {
    id: 'k.v2x',
    ruleId: 'participant-binds-service',
    status: 'open',
    summary: 'V2XGateway is an architecture service and has no sequence participant.'
  },
  {
    id: 'k.mode',
    ruleId: 'mode-message-compatibility',
    status: 'holds',
    summary:
      'BrakeRequest is both the transition into AEB_Active and the happy-path message. The fault sequence sends EnterLimpHome and does not send BrakeRequest.'
  },
  {
    id: 'k.alloc',
    ruleId: 'function-allocation',
    status: 'holds',
    summary: 'PlausibilityCheck and BrakeRequest on the flowchart are allocated to FusionApp and BrakeController.'
  },
  {
    id: 'k.owned',
    ruleId: 'decision-owned-by-type',
    status: 'holds',
    summary: 'PlausibilityCheck is owned by ThreatAssessor. SensorFusion realizes FusionApp.'
  },
  {
    id: 'k.payload',
    ruleId: 'payload-schema-contract',
    status: 'holds',
    summary: 'ObstacleDetect uses ObstacleTrack, the same entity on the class diagram and the ER diagram (ttc, confidence, obstacleId).'
  }
];

const systemElementOrder = [];
const seenElements = new Set();
aspectRefs.forEach((r) => {
  if (!seenElements.has(r.systemElement)) {
    seenElements.add(r.systemElement);
    systemElementOrder.push(r.systemElement);
  }
});

export const S1_INTEGRATING = {
  language: 'integrating',
  storyId: 'S1',
  systemElements: systemElementOrder.map((name) => ({ id: name, name })),
  aspectRefs,
  correspondences,
  constraints
};

export function flatCorrespondences(model = S1_INTEGRATING) {
  const byId = Object.fromEntries(model.aspectRefs.map((r) => [r.id, r]));
  return model.correspondences.map((c) => {
    const a = byId[c.ends[0]];
    const b = byId[c.ends[1]];
    return {
      from: `${a.diagramKey}#${a.element}`,
      to: `${b.diagramKey}#${b.element}`,
      kind: c.kind,
      check: c.ruleId
    };
  });
}

/** View model for the demo overview. Identity is shared system elements; use is a correspondence. */
export function integrationView(model) {
  if (!model) return null;
  const byElement = new Map();
  model.aspectRefs.forEach((r) => {
    if (!byElement.has(r.systemElement)) byElement.set(r.systemElement, []);
    byElement.get(r.systemElement).push(r);
  });
  const byId = Object.fromEntries(model.aspectRefs.map((r) => [r.id, r]));
  const identities = [...byElement.entries()]
    .filter(([, refs]) => refs.length > 1)
    .map(([name, refs]) => ({
      name,
      places: refs.map((r) => `${r.element} · ${r.diagramType}`)
    }));
  const uses = model.correspondences.map((c) => {
    const a = byId[c.ends[0]];
    const b = byId[c.ends[1]];
    return {
      id: c.id,
      kind: c.kind,
      ruleId: c.ruleId,
      left: `${a.element} (${a.diagramType})`,
      right: `${b.element} (${b.diagramType})`
    };
  });
  return {
    identities,
    uses,
    open: (model.constraints || []).filter((c) => c.status !== 'holds')
  };
}
