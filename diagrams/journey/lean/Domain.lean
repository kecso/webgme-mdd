-- Auto-generated from diagrams/journey/metamodel/Language.json
-- Fashion: kecso/webgme-lean (META → Lean structures). Regenerate: npm run generate:lean -- journey
-- DO NOT hand-edit permanent semantics here without updating Language.json.

namespace JourneyDomain

structure _NodeId where
  path : String
  deriving DecidableEq, Repr

class _Contained (parent child : Type) where
  children : parent → List child

inductive _Type where
  | _FCO
  | cSection
  | cTask
  | cUserJourney
  deriving DecidableEq, BEq, Repr

structure FCO where
  _id : _NodeId
  _type : _Type
  name : String
  deriving Repr

-- META concept Section
structure Section extends FCO where
  deriving Repr

instance : Coe Section FCO where
  coe := Section.toFCO

-- META concept Task
structure Task extends FCO where
  score : String := ""
  actors : String := ""
  deriving Repr

instance : Coe Task FCO where
  coe := Task.toFCO

-- META concept UserJourney
structure UserJourney extends FCO where
  title : String := ""
  -- containment allows: Section, Task
  _childIds : List _NodeId := []
  deriving Repr

instance : Coe UserJourney FCO where
  coe := UserJourney.toFCO

/-- Well-formedness scaffold: every node name non-empty (domain-local). -/
def AllNamesNonEmpty (nodes : List FCO) : Bool :=
  nodes.all fun n => n.name ≠ ""

end JourneyDomain
