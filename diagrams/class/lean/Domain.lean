-- Auto-generated from diagrams/class/metamodel/Language.json
-- Fashion: kecso/webgme-lean (META → Lean structures). Regenerate: npm run generate:lean -- class
-- DO NOT hand-edit permanent semantics here without updating Language.json.

namespace ClassDomain

structure _NodeId where
  path : String
  deriving DecidableEq, Repr

class _Contained (parent child : Type) where
  children : parent → List child

inductive _Type where
  | _FCO
  | cDiagram
  | cClass
  | cMember
  | cMethod
  | cRelationship
  | cNamespace
  deriving DecidableEq, BEq, Repr

structure FCO where
  _id : _NodeId
  _type : _Type
  name : String
  deriving Repr

-- META concept Diagram
structure Diagram extends FCO where
  title : String := ""
  -- containment allows: Member, Method, Relationship
  _childIds : List _NodeId := []
  deriving Repr

instance : Coe Diagram FCO where
  coe := Diagram.toFCO

-- META concept Class
structure Class extends FCO where
  stereotype : String := ""
  isInterface : String := ""
  isAbstract : String := ""
  deriving Repr

instance : Coe Class FCO where
  coe := Class.toFCO

-- META concept Member
structure Member extends FCO where
  visibility : String := ""
  type : String := ""
  classifier : String := ""
  deriving Repr

instance : Coe Member FCO where
  coe := Member.toFCO

-- META concept Method
structure Method extends FCO where
  visibility : String := ""
  returnType : String := ""
  parameters : String := ""
  classifier : String := ""
  deriving Repr

instance : Coe Method FCO where
  coe := Method.toFCO

-- META concept Relationship
-- pointers: src, dst (stored as _NodeId; bind via Integrating/correspondences)
structure Relationship extends FCO where
  kind : String := ""
  label : String := ""
  srcCard : String := ""
  dstCard : String := ""
  src : _NodeId := ⟨""⟩
  dst : _NodeId := ⟨""⟩
  deriving Repr

instance : Coe Relationship FCO where
  coe := Relationship.toFCO

-- META concept Namespace
structure Namespace extends FCO where
  -- containment allows: Class, Namespace
  _childIds : List _NodeId := []
  deriving Repr

instance : Coe Namespace FCO where
  coe := Namespace.toFCO

/-- Well-formedness scaffold: every node name non-empty (domain-local). -/
def AllNamesNonEmpty (nodes : List FCO) : Bool :=
  nodes.all fun n => n.name ≠ ""

end ClassDomain
