-- Auto-generated from diagrams/c4/metamodel/Language.json
-- Fashion: kecso/webgme-lean (META → Lean structures). Regenerate: npm run generate:lean -- c4
-- DO NOT hand-edit permanent semantics here without updating Language.json.

namespace C4Domain

structure _NodeId where
  path : String
  deriving DecidableEq, Repr

class _Contained (parent child : Type) where
  children : parent → List child

inductive _Type where
  | _FCO
  | cDiagram
  | cPerson
  | cSystem
  | cContainer
  | cBoundary
  | cRelation
  deriving DecidableEq, BEq, Repr

structure FCO where
  _id : _NodeId
  _type : _Type
  name : String
  deriving Repr

-- META concept Diagram
structure Diagram extends FCO where
  level : String := ""
  title : String := ""
  -- containment allows: Relation
  _childIds : List _NodeId := []
  deriving Repr

instance : Coe Diagram FCO where
  coe := Diagram.toFCO

-- META concept Person
structure Person extends FCO where
  alias : String := ""
  description : String := ""
  external : String := ""
  deriving Repr

instance : Coe Person FCO where
  coe := Person.toFCO

-- META concept System
structure System extends FCO where
  alias : String := ""
  description : String := ""
  external : String := ""
  kind : String := ""
  deriving Repr

instance : Coe System FCO where
  coe := System.toFCO

-- META concept Container
structure Container extends FCO where
  alias : String := ""
  technology : String := ""
  description : String := ""
  kind : String := ""
  deriving Repr

instance : Coe Container FCO where
  coe := Container.toFCO

-- META concept Boundary
structure Boundary extends FCO where
  alias : String := ""
  kind : String := ""
  -- containment allows: Person, System, Container, Boundary
  _childIds : List _NodeId := []
  deriving Repr

instance : Coe Boundary FCO where
  coe := Boundary.toFCO

-- META concept Relation
-- pointers: src, dst (stored as _NodeId; bind via Integrating/correspondences)
structure Relation extends FCO where
  label : String := ""
  technology : String := ""
  bidirectional : String := ""
  src : _NodeId := ⟨""⟩
  dst : _NodeId := ⟨""⟩
  deriving Repr

instance : Coe Relation FCO where
  coe := Relation.toFCO

/-- Well-formedness scaffold: every node name non-empty (domain-local). -/
def AllNamesNonEmpty (nodes : List FCO) : Bool :=
  nodes.all fun n => n.name ≠ ""

end C4Domain
