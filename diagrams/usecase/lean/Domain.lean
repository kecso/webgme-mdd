-- Auto-generated from diagrams/usecase/metamodel/Language.json
-- Fashion: kecso/webgme-lean (META → Lean structures). Regenerate: npm run generate:lean -- usecase
-- DO NOT hand-edit permanent semantics here without updating Language.json.

namespace UsecaseDomain

structure _NodeId where
  path : String
  deriving DecidableEq, Repr

class _Contained (parent child : Type) where
  children : parent → List child

inductive _Type where
  | _FCO
  | cDiagram
  | cActor
  | cUseCase
  | cBoundary
  | cLink
  deriving DecidableEq, BEq, Repr

structure FCO where
  _id : _NodeId
  _type : _Type
  name : String
  deriving Repr

-- META concept Diagram
structure Diagram extends FCO where
  title : String := ""
  direction : String := ""
  -- containment allows: Actor, Boundary, Link
  _childIds : List _NodeId := []
  deriving Repr

instance : Coe Diagram FCO where
  coe := Diagram.toFCO

-- META concept Actor
structure Actor extends FCO where
  label : String := ""
  deriving Repr

instance : Coe Actor FCO where
  coe := Actor.toFCO

-- META concept UseCase
structure UseCase extends FCO where
  label : String := ""
  deriving Repr

instance : Coe UseCase FCO where
  coe := UseCase.toFCO

-- META concept Boundary
structure Boundary extends FCO where
  label : String := ""
  -- containment allows: UseCase
  _childIds : List _NodeId := []
  deriving Repr

instance : Coe Boundary FCO where
  coe := Boundary.toFCO

-- META concept Link
-- pointers: src, dst (stored as _NodeId; bind via Integrating/correspondences)
structure Link extends FCO where
  kind : String := ""
  src : _NodeId := ⟨""⟩
  dst : _NodeId := ⟨""⟩
  deriving Repr

instance : Coe Link FCO where
  coe := Link.toFCO

/-- Well-formedness scaffold: every node name non-empty (domain-local). -/
def AllNamesNonEmpty (nodes : List FCO) : Bool :=
  nodes.all fun n => n.name ≠ ""

end UsecaseDomain
