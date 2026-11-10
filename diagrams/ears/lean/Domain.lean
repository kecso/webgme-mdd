/-!
EARS requirements body language — webgme-lean fashion.
Companion to diagrams/requirement (traceability diagram), not a Mermaid diagram type.
-/

namespace EarsDomain

structure _NodeId where
  path : String
  deriving DecidableEq, Repr, BEq

inductive Pattern where
  | ubiquitous
  | state
  | event
  | optional
  | unwanted
  | complex
  deriving DecidableEq, BEq, Repr

structure EARSRequirement where
  _id : _NodeId
  reqId : String
  pattern : Pattern
  precondition : String := ""   -- While …
  trigger : String := ""        -- When …
  feature : String := ""        -- Where …
  unwantedCondition : String := "" -- If …
  system : String
  response : String
  deriving Repr

/-- Render canonical EARS prose (single response). -/
def EARSRequirement.toText (r : EARSRequirement) : String :=
  match r.pattern with
  | .ubiquitous => s!"The {r.system} shall {r.response}."
  | .state => s!"While {r.precondition}, the {r.system} shall {r.response}."
  | .event => s!"When {r.trigger}, the {r.system} shall {r.response}."
  | .optional => s!"Where {r.feature}, the {r.system} shall {r.response}."
  | .unwanted => s!"If {r.unwantedCondition}, then the {r.system} shall {r.response}."
  | .complex =>
      s!"While {r.precondition}, when {r.trigger}, the {r.system} shall {r.response}."

/-- Structural well-formedness of an EARS item (pattern ↔ required clauses). -/
def wellFormed (r : EARSRequirement) : Bool :=
  r.reqId ≠ "" && r.system ≠ "" && r.response ≠ "" &&
  match r.pattern with
  | .ubiquitous => true
  | .state => r.precondition ≠ ""
  | .event => r.trigger ≠ ""
  | .optional => r.feature ≠ ""
  | .unwanted => r.unwantedCondition ≠ ""
  | .complex => r.precondition ≠ "" && r.trigger ≠ ""

structure Specification where
  _id : _NodeId
  name : String
  requirements : List EARSRequirement
  deriving Repr

def allWellFormed (s : Specification) : Bool :=
  s.requirements.all wellFormed

-- ---------- S1 slice ----------

def reqAEB001 : EARSRequirement := {
  _id := ⟨"/ears/REQ-AEB-001"⟩
  reqId := "REQ-AEB-001"
  pattern := .event
  trigger := "an obstacle is detected within the braking envelope"
  system := "BrakeController"
  response := "command deceleration within 100 ms"
}

def reqAEB003 : EARSRequirement := {
  _id := ⟨"/ears/REQ-AEB-003"⟩
  reqId := "REQ-AEB-003"
  pattern := .unwanted
  unwantedCondition := "sensor fusion confidence is below threshold"
  system := "BrakeController"
  response := "not command autonomous braking"
}

def aebSpec : Specification := {
  _id := ⟨"/ears/aeb"⟩
  name := "AEB"
  requirements := [reqAEB001, reqAEB003]
}

theorem aeb_spec_well_formed : allWellFormed aebSpec = true := rfl

theorem aeb001_is_event_driven : reqAEB001.pattern = Pattern.event := rfl

end EarsDomain
