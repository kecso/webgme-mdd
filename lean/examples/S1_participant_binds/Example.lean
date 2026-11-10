/-!
S1 exemplar: sequence participants must bind to architecture services.

Self-contained in the fashion of kecso/webgme-lean examples/statechart/Turnstile.lean:
META concepts as structures, model as defs, constraint as Bool predicate, theorem by `rfl`.

Source constraint (DSL): constraints.wgl
Story: docs/stories/S1-automotive-aeb-cacc.md (integration pair sequence↔architecture)
-/

namespace S1ParticipantBinds

structure _NodeId where
  path : String
  deriving DecidableEq, Repr, BEq

-- Aspect: Sequence (subset of diagrams/sequence META)
structure Participant where
  _id : _NodeId
  name : String
  deriving Repr, DecidableEq

structure Message where
  _id : _NodeId
  name : String
  label : String
  fromP : _NodeId
  toP : _NodeId
  deriving Repr

structure SequenceDiagram where
  _id : _NodeId
  name : String
  participants : List Participant
  messages : List Message
  deriving Repr

-- Aspect: Architecture (subset of diagrams/architecture META)
structure Service where
  _id : _NodeId
  name : String
  deriving Repr, DecidableEq

structure ArchitectureDiagram where
  _id : _NodeId
  name : String
  services : List Service
  deriving Repr

-- Integrating Language
structure Correspondence where
  kind : String
  ends : List _NodeId
  deriving Repr

structure IntegratedAEB where
  sequence : SequenceDiagram
  architecture : ArchitectureDiagram
  correspondences : List Correspondence
  deriving Repr

def hasSameAs (m : IntegratedAEB) (a b : _NodeId) : Bool :=
  m.correspondences.any fun c =>
    c.kind == "sameAs" && c.ends.contains a && c.ends.contains b

/--
Constraint ParticipantBindsArchitecture:
∀ p ∈ participants, ∃ s ∈ services, sameAs(p, s)
-/
def ParticipantBindsArchitecture (m : IntegratedAEB) : Bool :=
  m.sequence.participants.all fun p =>
    m.architecture.services.any fun s =>
      hasSameAs m p._id s._id

-- ---------- Model: AEB happy path (good) ----------

def radarP : Participant := { _id := ⟨"/seq/radar"⟩, name := "Radar" }
def fusionP : Participant := { _id := ⟨"/seq/fusion"⟩, name := "Fusion" }
def brakeP : Participant := { _id := ⟨"/seq/brake"⟩, name := "BrakeCtrl" }

def radarS : Service := { _id := ⟨"/arch/radar"⟩, name := "RadarECU" }
def fusionS : Service := { _id := ⟨"/arch/fusion"⟩, name := "FusionApp" }
def brakeS : Service := { _id := ⟨"/arch/brake"⟩, name := "BrakeController" }

def aebGood : IntegratedAEB := {
  sequence := {
    _id := ⟨"/seq"⟩
    name := "AEBDetect"
    participants := [radarP, fusionP, brakeP]
    messages := [{
      _id := ⟨"/seq/m1"⟩
      name := "track"
      label := "track"
      fromP := radarP._id
      toP := fusionP._id
    }]
  }
  architecture := {
    _id := ⟨"/arch"⟩
    name := "VehicleECUs"
    services := [radarS, fusionS, brakeS]
  }
  correspondences := [
    { kind := "sameAs", ends := [radarP._id, radarS._id] },
    { kind := "sameAs", ends := [fusionP._id, fusionS._id] },
    { kind := "sameAs", ends := [brakeP._id, brakeS._id] }
  ]
}

-- ---------- Model: missing V2X binding (bad) ----------

def v2xP : Participant := { _id := ⟨"/seq/v2x"⟩, name := "V2XGateway" }

def aebBad : IntegratedAEB := {
  sequence := {
    _id := ⟨"/seq2"⟩
    name := "AEBWithV2X"
    participants := [radarP, fusionP, brakeP, v2xP]
    messages := []
  }
  architecture := {
    _id := ⟨"/arch2"⟩
    name := "VehicleECUs"
    services := [radarS, fusionS, brakeS]
  }
  -- Intentionally no sameAs for V2XGateway — architecture has no such service
  correspondences := [
    { kind := "sameAs", ends := [radarP._id, radarS._id] },
    { kind := "sameAs", ends := [fusionP._id, fusionS._id] },
    { kind := "sameAs", ends := [brakeP._id, brakeS._id] }
  ]
}

-- ---------- Proofs (webgme-lean style: reduce to Bool, prove by rfl) ----------

theorem aeb_good_satisfies_participant_binds :
    ParticipantBindsArchitecture aebGood = true := rfl

theorem aeb_bad_violates_participant_binds :
    ParticipantBindsArchitecture aebBad = false := rfl

theorem brake_participant_bound_to_brake_service :
    hasSameAs aebGood brakeP._id brakeS._id = true := rfl

end S1ParticipantBinds
