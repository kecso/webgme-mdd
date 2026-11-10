-- Auto-generated from diagrams/requirement/metamodel/Language.json
-- Fashion: kecso/webgme-lean (META → Lean structures). Regenerate: npm run generate:lean -- requirement
-- DO NOT hand-edit permanent semantics here without updating Language.json.

namespace RequirementDomain

structure _NodeId where
  path : String
  deriving DecidableEq, Repr

class _Contained (parent child : Type) where
  children : parent → List child

inductive _Type where
  | _FCO
  | cDiagram
  | cRequirement
  | cElement
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
  -- containment allows: Requirement, Element, Relationship
  _childIds : List _NodeId := []
  deriving Repr

instance : Coe Diagram FCO where
  coe := Diagram.toFCO

-- META concept Requirement
structure Requirement extends FCO where
  reqId : String := ""
  text : String := ""
  risk : String := ""
  verifymethod : String := ""
  type : String := ""
  deriving Repr

instance : Coe Requirement FCO where
  coe := Requirement.toFCO

-- META concept Element
structure Element extends FCO where
  elementType : String := ""
  docRef : String := ""
  deriving Repr

instance : Coe Element FCO where
  coe := Element.toFCO

-- META concept Relationship
-- pointers: src, dst (stored as _NodeId; bind via Integrating/correspondences)
structure Relationship extends FCO where
  kind : String := ""
  src : _NodeId := ⟨""⟩
  dst : _NodeId := ⟨""⟩
  deriving Repr

instance : Coe Relationship FCO where
  coe := Relationship.toFCO

/-- Well-formedness scaffold: every node name non-empty (domain-local). -/
def AllNamesNonEmpty (nodes : List FCO) : Bool :=
  nodes.all fun n => n.name ≠ ""

end RequirementDomain
