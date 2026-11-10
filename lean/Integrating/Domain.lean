/-!
# Integrating Language (webgme-lean fashion)

Thin cross-domain META formalized as Lean structures — the “generic glue”
from docs/findings/integration-architecture.md.

Maps to a future `diagrams/integrating` WebGME package / router META:
SystemElement, Correspondence, ConstraintInstance.
-/

namespace IntegratingDomain

structure _NodeId where
  path : String
  deriving DecidableEq, Repr, BEq

/-- Host identity for one portion of the system (ECU, actor, requirement subject, …). -/
structure SystemElement where
  _id : _NodeId
  name : String
  deriving Repr, DecidableEq

/-- Typed link among aspect instances (ISO 42010 correspondence / SysML-like dependency). -/
structure Correspondence where
  _id : _NodeId
  kind : String
  ends : List _NodeId
  deriving Repr

/-- Binding of a multi-diagram rule to concrete participants. -/
structure ConstraintInstance where
  _id : _NodeId
  ruleId : String
  severity : String
  participants : List _NodeId
  status : String := "unknown"
  deriving Repr

/-- Integrated project snapshot: host identities + correspondences + constraint instances. -/
structure IntegratedModel where
  elements : List SystemElement
  correspondences : List Correspondence
  constraints : List ConstraintInstance
  deriving Repr

/-- Does a correspondence of the given kind connect these two node ids (order-insensitive)? -/
def hasCorrespondence (m : IntegratedModel) (kind : String) (a b : _NodeId) : Bool :=
  m.correspondences.any fun c =>
    c.kind == kind &&
      (c.ends.contains a && c.ends.contains b)

/-- Every ConstraintInstance with the given ruleId is marked holds. -/
def allHolds (m : IntegratedModel) (ruleId : String) : Bool :=
  (m.constraints.filter fun c => c.ruleId == ruleId).all fun c =>
    c.status == "holds"

/--
S1-style rule *predicate* (domain×domain knowledge as a function, not a package):
every participant id must share a `sameAs` correspondence with some architecture/service id.
-/
def participantBindsArchitecture
    (m : IntegratedModel)
    (participants archNodes : List _NodeId) : Bool :=
  participants.all fun p =>
    archNodes.any fun a =>
      hasCorrespondence m "sameAs" p a

/--
EARS body → Mermaid requirementDiagram node:
every EARS requirement id must `specifiesBody` a requirement diagram node.
-/
def earsSpecifiesRequirement
    (m : IntegratedModel)
    (earsNodes reqNodes : List _NodeId) : Bool :=
  earsNodes.all fun e =>
    reqNodes.any fun r =>
      hasCorrespondence m "specifiesBody" e r

end IntegratingDomain
