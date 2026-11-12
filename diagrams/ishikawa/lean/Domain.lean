-- Auto-generated from diagrams/ishikawa/metamodel/Language.json
-- Fashion: kecso/webgme-lean (META → Lean structures). Regenerate: npm run generate:lean -- ishikawa
-- DO NOT hand-edit permanent semantics here without updating Language.json.

namespace IshikawaDomain

structure _NodeId where
  path : String
  deriving DecidableEq, Repr

class _Contained (parent child : Type) where
  children : parent → List child

inductive _Type where
  | _FCO
  | cCategory
  | cCause
  | cIshikawaDiagram
  deriving DecidableEq, BEq, Repr

structure FCO where
  _id : _NodeId
  _type : _Type
  name : String
  deriving Repr

-- META concept Category
structure Category extends FCO where
  deriving Repr

instance : Coe Category FCO where
  coe := Category.toFCO

-- META concept Cause
structure Cause extends FCO where
  -- containment allows: Cause
  _childIds : List _NodeId := []
  deriving Repr

instance : Coe Cause FCO where
  coe := Cause.toFCO

-- META concept IshikawaDiagram
structure IshikawaDiagram extends FCO where
  title : String := ""
  effect : String := ""
  -- containment allows: Category, Cause
  _childIds : List _NodeId := []
  deriving Repr

instance : Coe IshikawaDiagram FCO where
  coe := IshikawaDiagram.toFCO

/-- Well-formedness scaffold: every node name non-empty (domain-local). -/
def AllNamesNonEmpty (nodes : List FCO) : Bool :=
  nodes.all fun n => n.name ≠ ""

end IshikawaDomain
