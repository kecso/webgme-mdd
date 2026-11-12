-- Auto-generated from diagrams/state/metamodel/Language.json
-- Fashion: kecso/webgme-lean (META → Lean structures). Regenerate: npm run generate:lean -- state
-- DO NOT hand-edit permanent semantics here without updating Language.json.

namespace StateDomain

structure _NodeId where
  path : String
  deriving DecidableEq, Repr

class _Contained (parent child : Type) where
  children : parent → List child

inductive _Type where
  | _FCO
  | cState
  | cTransition
  | cNote
  | cStateDiagram
  deriving DecidableEq, BEq, Repr

structure FCO where
  _id : _NodeId
  _type : _Type
  name : String
  deriving Repr

-- META concept State
structure State extends FCO where
  kind : String := ""
  label : String := ""
  -- containment allows: State, Transition
  _childIds : List _NodeId := []
  deriving Repr

instance : Coe State FCO where
  coe := State.toFCO

-- META concept Transition
-- pointers: src, dst (stored as _NodeId; bind via Integrating/correspondences)
structure Transition extends FCO where
  event : String := ""
  guard : String := ""
  action : String := ""
  src : _NodeId := ⟨""⟩
  dst : _NodeId := ⟨""⟩
  deriving Repr

instance : Coe Transition FCO where
  coe := Transition.toFCO

-- META concept Note
-- pointers: target (stored as _NodeId; bind via Integrating/correspondences)
structure Note extends FCO where
  text : String := ""
  target : _NodeId := ⟨""⟩
  deriving Repr

instance : Coe Note FCO where
  coe := Note.toFCO

-- META concept StateDiagram
structure StateDiagram extends FCO where
  title : String := ""
  -- containment allows: Note, State, Transition
  _childIds : List _NodeId := []
  deriving Repr

instance : Coe StateDiagram FCO where
  coe := StateDiagram.toFCO

/-- Well-formedness scaffold: every node name non-empty (domain-local). -/
def AllNamesNonEmpty (nodes : List FCO) : Bool :=
  nodes.all fun n => n.name ≠ ""

end StateDomain
