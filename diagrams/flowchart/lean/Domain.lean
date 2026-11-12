-- Auto-generated from diagrams/flowchart/metamodel/Language.json
-- Fashion: kecso/webgme-lean (META → Lean structures). Regenerate: npm run generate:lean -- flowchart
-- DO NOT hand-edit permanent semantics here without updating Language.json.

namespace FlowchartDomain

structure _NodeId where
  path : String
  deriving DecidableEq, Repr

class _Contained (parent child : Type) where
  children : parent → List child

inductive _Type where
  | _FCO
  | cNode
  | cEdge
  | cSubgraph
  | cFlowChart
  deriving DecidableEq, BEq, Repr

structure FCO where
  _id : _NodeId
  _type : _Type
  name : String
  deriving Repr

-- META concept Node
structure Node extends FCO where
  label : String := ""
  shape : String := ""
  styleClass : String := ""
  deriving Repr

instance : Coe Node FCO where
  coe := Node.toFCO

-- META concept Edge
-- pointers: src, dst (stored as _NodeId; bind via Integrating/correspondences)
structure Edge extends FCO where
  label : String := ""
  lineStyle : String := ""
  arrowStyle : String := ""
  src : _NodeId := ⟨""⟩
  dst : _NodeId := ⟨""⟩
  deriving Repr

instance : Coe Edge FCO where
  coe := Edge.toFCO

-- META concept Subgraph
structure Subgraph extends FCO where
  label : String := ""
  direction : String := ""
  -- containment allows: Node, Edge, Subgraph
  _childIds : List _NodeId := []
  deriving Repr

instance : Coe Subgraph FCO where
  coe := Subgraph.toFCO

-- META concept FlowChart
structure FlowChart extends FCO where
  direction : String := ""
  title : String := ""
  -- containment allows: Node, Edge, Subgraph
  _childIds : List _NodeId := []
  deriving Repr

instance : Coe FlowChart FCO where
  coe := FlowChart.toFCO

/-- Well-formedness scaffold: every node name non-empty (domain-local). -/
def AllNamesNonEmpty (nodes : List FCO) : Bool :=
  nodes.all fun n => n.name ≠ ""

end FlowchartDomain
