/**
 * Story-shaped S1 demo fixtures (text only — no WebGME seeds required).
 * Keys: modelingDomainId:diagramType:instanceName
 *
 * Mermaid 11 notes:
 * - requirement ids/text with punctuation must be quoted
 * - architecture-beta service ids must be lowercase (labels may be TitleCase)
 * - usecase / usecase-beta not available in this Mermaid build — use flowchart stand-in
 */

export const S1_SEED_VERSION = 2;

/** @type {Record<string, { modelingDomainId: string, diagramType: string, name: string, source: string }>} */
export const S1_DEMO_DIAGRAMS = {
  'requirements-specification:ears:aeb-cacc-shalls': {
    modelingDomainId: 'requirements-specification',
    diagramType: 'ears',
    name: 'aeb-cacc-shalls',
    source: `# EARS — AEB / CACC shalls (S1 demo)
# Patterns: ubiquitous | state | event | optional | unwanted | complex

REQ-AEB-001 [event] risk=high verifymethod=test
When an obstacle is detected within the braking envelope, the BrakeController shall command deceleration within 100 ms.

REQ-AEB-002 [state] risk=high verifymethod=test
While AEB_Active, the BrakeController shall ignore driver acceleration requests that reduce deceleration.

REQ-AEB-003 [unwanted] risk=high verifymethod=test
If sensor fusion confidence is below threshold, then the BrakeController shall not command autonomous braking.

REQ-CACC-001 [ubiquitous] risk=medium verifymethod=analysis
The LongitudinalController shall maintain gap error within ±0.5 m in steady cruise.

REQ-CACC-002 [optional] risk=medium verifymethod=demonstration
Where the vehicle has V2XGateway, the FusionApp shall incorporate remote vehicle tracks into gap control.

REQ-CACC-003 [complex] risk=high verifymethod=test
While ACC is engaged, when the lead vehicle brakes, the LongitudinalController shall reduce speed to preserve the selected time gap.
`
  },

  'requirements-management:requirement:aeb-req-trace': {
    modelingDomainId: 'requirements-management',
    diagramType: 'requirement',
    name: 'aeb-req-trace',
    source: `requirementDiagram
  requirement AEB_DetectAndBrake {
    id: "REQ-AEB-001"
    text: "Detect obstacle and brake within 100ms"
    risk: high
    verifymethod: test
  }
  requirement AEB_InhibitLowConfidence {
    id: "REQ-AEB-003"
    text: "Do not brake when fusion confidence is low"
    risk: high
    verifymethod: test
  }
  requirement CACC_MaintainGap {
    id: "REQ-CACC-001"
    text: "Maintain gap error within 0.5 m"
    risk: medium
    verifymethod: analysis
  }
  requirement Sec_AntiSpoof {
    id: "REQ-SEC-001"
    text: "Reject spoofed V2X tracks without secondary corroboration"
    risk: high
    verifymethod: test
  }
  element DriverEngageCACC {
    type: usecase
  }
  element EmergencyBrake {
    type: usecase
  }
  element ObstacleDetect_Seq {
    type: simulation
  }
  DriverEngageCACC - satisfies -> CACC_MaintainGap
  EmergencyBrake - satisfies -> AEB_DetectAndBrake
  ObstacleDetect_Seq - verifies -> AEB_DetectAndBrake
  ObstacleDetect_Seq - verifies -> AEB_InhibitLowConfidence
`
  },

  // usecase-beta not shipped in Mermaid 11.17 used here — flowchart stand-in for early UX feedback
  'process-modeling:flowchart:driver-scenarios': {
    modelingDomainId: 'process-modeling',
    diagramType: 'flowchart',
    name: 'driver-scenarios',
    source: `flowchart LR
  Driver((Driver)) --> Engage[DriverEngageCACC]
  Driver --> Brake[EmergencyBrake]
  Driver --> Override[OverrideDeceleration]
  Tech((Technician)) --> Diag[EnterDiagnostics]
  Engage --> Gap[MaintainTimeGap]
  Brake --> Detect[DetectAndBrake]
`
  },

  'system-context:c4:vehicle-context': {
    modelingDomainId: 'system-context',
    diagramType: 'c4',
    name: 'vehicle-context',
    source: `C4Context
  title S1 Vehicle AEB / CACC context
  Person(driver, "Driver", "Operates vehicle and CACC")
  Person(tech, "Technician", "Diagnostics")
  System(vehicle, "Ego Vehicle", "AEB + CACC++ stack")
  System_Ext(lead, "Lead Vehicle", "V2X peer")
  System_Ext(cloud, "Cloud Diagnostics", "DTC / logs")
  Rel(driver, vehicle, "Engages CACC / overrides")
  Rel(vehicle, lead, "V2X tracks / gap")
  Rel(vehicle, cloud, "Uploads DTC")
  Rel(tech, vehicle, "DiagnosticsOnly mode")
`
  },

  'software-architecture:architecture:ecu-services': {
    modelingDomainId: 'software-architecture',
    diagramType: 'architecture',
    name: 'ecu-services',
    source: `architecture-beta
  group vehicle(cloud)[Ego Vehicle]
  service radar(server)[RadarECU] in vehicle
  service camera(server)[CameraECU] in vehicle
  service fusion(server)[FusionApp] in vehicle
  service brake(server)[BrakeController] in vehicle
  service longctrl(server)[LongitudinalController] in vehicle
  service v2x(server)[V2XGateway] in vehicle
  service hmi(server)[HMI] in vehicle
  radar:R --> L:fusion
  camera:R --> L:fusion
  v2x:R --> L:fusion
  fusion:R --> L:brake
  fusion:R --> L:longctrl
  brake:R --> L:hmi
  longctrl:R --> L:hmi
`
  },

  'object-oriented-design:class:fusion-control': {
    modelingDomainId: 'object-oriented-design',
    diagramType: 'class',
    name: 'fusion-control',
    source: `classDiagram
  class ObstacleTrack {
    +String obstacleId
    +float ttc
    +float confidence
  }
  class EgoState {
    +float speed
    +float gapError
  }
  class SensorFusion {
    +fuse()
    +confidence() float
  }
  class ThreatAssessor {
    +plausible() bool
    +recommendBrake()
  }
  class LongitudinalController {
    +maintainGap()
  }
  class BrakeController {
    +commandDecel()
  }
  SensorFusion --> ObstacleTrack : produces
  ThreatAssessor --> SensorFusion : uses
  ThreatAssessor --> BrakeController : BrakeRequest
  LongitudinalController --> EgoState : reads
`
  },

  'finite-state-machines:state:aeb-modes': {
    modelingDomainId: 'finite-state-machines',
    diagramType: 'state',
    name: 'aeb-modes',
    source: `stateDiagram-v2
  [*] --> Off
  Off --> ACC: DriverEngageCACC
  ACC --> AEB_Arming: ObstaclePlausible
  AEB_Arming --> AEB_Active: BrakeRequest
  AEB_Active --> Complete: ActuatorAck
  Complete --> ACC: ResumeGap
  ACC --> Off: DriverCancel
  ACC --> DiagnosticsOnly: EnterDiagnostics
  DiagnosticsOnly --> Off: ExitDiagnostics
  AEB_Active --> LimpHome: ActuatorFault
  note right of AEB_Active
    While AEB_Active ignore accel that reduces deceleration
  end note
`
  },

  'software-interaction:sequence:obstacle-brake': {
    modelingDomainId: 'software-interaction',
    diagramType: 'sequence',
    name: 'obstacle-brake',
    source: `sequenceDiagram
  actor Driver
  participant RadarECU
  participant FusionApp
  participant BrakeCtrl as BrakeController
  participant HMI
  Driver->>FusionApp: CACC engaged
  RadarECU->>+FusionApp: ObstacleDetect
  FusionApp->>FusionApp: PlausibilityCheck
  alt confidence >= threshold
    FusionApp->>+BrakeCtrl: BrakeRequest
    BrakeCtrl-->>-FusionApp: ActuatorAck
    BrakeCtrl->>HMI: AEB_Active
    Note over FusionApp,BrakeCtrl: Happy path binds to architecture services
  else low confidence REQ-AEB-003
    FusionApp-->>RadarECU: InhibitBrake
    Note over FusionApp: No BrakeRequest
  end
`
  },

  'software-interaction:sequence:sensor-fault': {
    modelingDomainId: 'software-interaction',
    diagramType: 'sequence',
    name: 'sensor-fault',
    source: `sequenceDiagram
  participant CameraECU
  participant FusionApp
  participant BrakeCtrl as BrakeController
  participant HMI
  CameraECU->>FusionApp: SensorFault
  FusionApp->>FusionApp: DropCameraTracks
  FusionApp->>BrakeCtrl: EnterLimpHome
  BrakeCtrl->>HMI: LimpHome
  Note over FusionApp,BrakeCtrl: Forbidden BrakeRequest in DiagnosticsOnly
`
  },

  'process-modeling:flowchart:plausibility-gate': {
    modelingDomainId: 'process-modeling',
    diagramType: 'flowchart',
    name: 'plausibility-gate',
    source: `flowchart TD
  Start([ObstacleDetect]) --> Conf{confidence ok?}
  Conf -->|No| Inhibit[InhibitBrake REQ-AEB-003]
  Conf -->|Yes| Plaus[PlausibilityCheck]
  Plaus --> InEnv{in braking envelope?}
  InEnv -->|No| TrackOnly[Update ObstacleTrack]
  InEnv -->|Yes| Mode{ACC or AEB_Arming?}
  Mode -->|No| Reject[Reject BrakeRequest]
  Mode -->|Yes| Brake[BrakeRequest to BrakeController]
  Inhibit --> End([Done])
  TrackOnly --> End
  Reject --> End
  Brake --> End
`
  },

  'database-design:er:vehicle-trip': {
    modelingDomainId: 'database-design',
    diagramType: 'er',
    name: 'vehicle-trip',
    source: `erDiagram
  ObstacleTrack ||--o{ BrakeEvent : triggers
  EgoState ||--o{ BrakeEvent : context
  ObstacleTrack {
    string obstacleId PK
    float ttc
    float confidence
    string source
  }
  EgoState {
    string sampleId PK
    float speed
    float gapError
  }
  BrakeEvent {
    string eventId PK
    string obstacleId FK
    float decelerationCmd
    string mode
  }
  DTC {
    string code PK
    string ecu
    string severity
  }
  BrakeEvent ||--o| DTC : may_raise
`
  }
};

/**
 * Soft Integrating correspondences for book / overview feedback
 * (not enforced until CrossDomainValidate exists).
 */
export const S1_DEMO_CORRESPONDENCES = [
  {
    from: 'software-interaction:sequence:obstacle-brake#RadarECU',
    to: 'software-architecture:architecture:ecu-services#radar',
    kind: 'sameAs',
    check: 'participant-binds-service'
  },
  {
    from: 'software-interaction:sequence:obstacle-brake#FusionApp',
    to: 'software-architecture:architecture:ecu-services#fusion',
    kind: 'sameAs',
    check: 'participant-binds-service'
  },
  {
    from: 'software-interaction:sequence:obstacle-brake#BrakeController',
    to: 'software-architecture:architecture:ecu-services#brake',
    kind: 'sameAs',
    check: 'participant-binds-service'
  },
  {
    from: 'requirements-specification:ears:aeb-cacc-shalls#REQ-AEB-001',
    to: 'requirements-management:requirement:aeb-req-trace#AEB_DetectAndBrake',
    kind: 'specifies',
    check: 'specifies-body'
  },
  {
    from: 'database-design:er:vehicle-trip#ObstacleTrack.ttc',
    to: 'software-interaction:sequence:obstacle-brake#ObstacleDetect',
    kind: 'sameAs',
    check: 'payload-schema-contract'
  }
];

export function buildS1DemoProject() {
  const diagrams = {};
  Object.entries(S1_DEMO_DIAGRAMS).forEach(([key, inst]) => {
    diagrams[key] = {
      ...inst,
      source: inst.source.trim() + '\n',
      updatedAt: '2026-11-10T00:00:00.000Z',
      seeded: true
    };
  });
  return {
    id: 'demo+s1-aeb',
    owner: 'demo',
    name: 's1-aeb',
    title: 'S1 AEB / CACC (demo)',
    storyId: 'S1',
    seedVersion: S1_SEED_VERSION,
    enabledModelingDomains: [
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
    ],
    diagrams,
    correspondences: [...S1_DEMO_CORRESPONDENCES]
  };
}
