-- Auto-generated from diagrams/architecture/metamodel/Language.json
-- Fashion: kecso/webgme-lean (META → Lean structures). Regenerate: npm run generate:lean -- architecture
-- DO NOT hand-edit permanent semantics here without updating Language.json.

namespace ArchitectureDomain

structure _NodeId where
  path : String
  deriving DecidableEq, Repr

class _Contained (parent child : Type) where
  children : parent → List child

inductive _Type where
  | _FCO
  | cGroup
  | cService
  | cEdge
  | cArchitectureDiagram
  deriving DecidableEq, BEq, Repr

structure FCO where
  _id : _NodeId
  _type : _Type
  name : String
  deriving Repr

-- META concept Group
structure Group extends FCO where
  icon : String := ""
  -- containment allows: Service, Group
  _childIds : List _NodeId := []
  deriving Repr

instance : Coe Group FCO where
  coe := Group.toFCO

-- META concept Service
structure Service extends FCO where
  icon : String := ""
  inGroup : String := ""
  deriving Repr

instance : Coe Service FCO where
  coe := Service.toFCO

-- META concept Edge
-- pointers: src, dst (stored as _NodeId; bind via Integrating/correspondences)
structure Edge extends FCO where
  srcSide : String := ""
  dstSide : String := ""
  src : _NodeId := ⟨""⟩
  dst : _NodeId := ⟨""⟩
  deriving Repr

instance : Coe Edge FCO where
  coe := Edge.toFCO

-- META concept ArchitectureDiagram
structure ArchitectureDiagram extends FCO where
  title : String := ""
  -- containment allows: Edge, Group, Service
  _childIds : List _NodeId := []
  deriving Repr

instance : Coe ArchitectureDiagram FCO where
  coe := ArchitectureDiagram.toFCO

/-- Well-formedness scaffold: every node name non-empty (domain-local). -/
def AllNamesNonEmpty (nodes : List FCO) : Bool :=
  nodes.all fun n => n.name ≠ ""

end ArchitectureDomain
