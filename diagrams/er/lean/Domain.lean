-- Auto-generated from diagrams/er/metamodel/Language.json
-- Fashion: kecso/webgme-lean (META → Lean structures). Regenerate: npm run generate:lean -- er
-- DO NOT hand-edit permanent semantics here without updating Language.json.

namespace ErDomain

structure _NodeId where
  path : String
  deriving DecidableEq, Repr

class _Contained (parent child : Type) where
  children : parent → List child

inductive _Type where
  | _FCO
  | cDiagram
  | cEntity
  | cAttribute
  | cRelationship
  deriving DecidableEq, BEq, Repr

structure FCO where
  _id : _NodeId
  _type : _Type
  name : String
  deriving Repr

-- META concept Diagram
structure Diagram extends FCO where
  title : String := ""
  -- containment allows: Entity, Attribute, Relationship
  _childIds : List _NodeId := []
  deriving Repr

instance : Coe Diagram FCO where
  coe := Diagram.toFCO

-- META concept Entity
structure Entity extends FCO where
  deriving Repr

instance : Coe Entity FCO where
  coe := Entity.toFCO

-- META concept Attribute
structure Attribute extends FCO where
  dataType : String := ""
  key : String := ""
  comment : String := ""
  deriving Repr

instance : Coe Attribute FCO where
  coe := Attribute.toFCO

-- META concept Relationship
-- pointers: src, dst (stored as _NodeId; bind via Integrating/correspondences)
structure Relationship extends FCO where
  label : String := ""
  srcCard : String := ""
  dstCard : String := ""
  src : _NodeId := ⟨""⟩
  dst : _NodeId := ⟨""⟩
  deriving Repr

instance : Coe Relationship FCO where
  coe := Relationship.toFCO

/-- Well-formedness scaffold: every node name non-empty (domain-local). -/
def AllNamesNonEmpty (nodes : List FCO) : Bool :=
  nodes.all fun n => n.name ≠ ""

end ErDomain
