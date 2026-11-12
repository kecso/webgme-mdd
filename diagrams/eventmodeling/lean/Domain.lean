-- Auto-generated from diagrams/eventmodeling/metamodel/Language.json
-- Fashion: kecso/webgme-lean (META → Lean structures). Regenerate: npm run generate:lean -- eventmodeling
-- DO NOT hand-edit permanent semantics here without updating Language.json.

namespace EventmodelingDomain

structure _NodeId where
  path : String
  deriving DecidableEq, Repr

class _Contained (parent child : Type) where
  children : parent → List child

inductive _Type where
  | _FCO
  | cSwimlane
  | cCommand
  | cEvent
  | cView
  | cFlow
  | cEventModelingDiagram
  deriving DecidableEq, BEq, Repr

structure FCO where
  _id : _NodeId
  _type : _Type
  name : String
  deriving Repr

-- META concept Swimlane
structure Swimlane extends FCO where
  deriving Repr

instance : Coe Swimlane FCO where
  coe := Swimlane.toFCO

-- META concept Command
structure Command extends FCO where
  label : String := ""
  deriving Repr

instance : Coe Command FCO where
  coe := Command.toFCO

-- META concept Event
structure Event extends FCO where
  label : String := ""
  deriving Repr

instance : Coe Event FCO where
  coe := Event.toFCO

-- META concept View
structure View extends FCO where
  label : String := ""
  deriving Repr

instance : Coe View FCO where
  coe := View.toFCO

-- META concept Flow
-- pointers: src, dst (stored as _NodeId; bind via Integrating/correspondences)
structure Flow extends FCO where
  src : _NodeId := ⟨""⟩
  dst : _NodeId := ⟨""⟩
  deriving Repr

instance : Coe Flow FCO where
  coe := Flow.toFCO

-- META concept EventModelingDiagram
structure EventModelingDiagram extends FCO where
  title : String := ""
  -- containment allows: Swimlane, Command, Event, View, Flow
  _childIds : List _NodeId := []
  deriving Repr

instance : Coe EventModelingDiagram FCO where
  coe := EventModelingDiagram.toFCO

/-- Well-formedness scaffold: every node name non-empty (domain-local). -/
def AllNamesNonEmpty (nodes : List FCO) : Bool :=
  nodes.all fun n => n.name ≠ ""

end EventmodelingDomain
