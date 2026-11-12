-- Auto-generated from diagrams/packet/metamodel/Language.json
-- Fashion: kecso/webgme-lean (META → Lean structures). Regenerate: npm run generate:lean -- packet
-- DO NOT hand-edit permanent semantics here without updating Language.json.

namespace PacketDomain

structure _NodeId where
  path : String
  deriving DecidableEq, Repr

class _Contained (parent child : Type) where
  children : parent → List child

inductive _Type where
  | _FCO
  | cField
  | cPacketDiagram
  deriving DecidableEq, BEq, Repr

structure FCO where
  _id : _NodeId
  _type : _Type
  name : String
  deriving Repr

-- META concept Field
structure Field extends FCO where
  startBit : String := ""
  endBit : String := ""
  label : String := ""
  deriving Repr

instance : Coe Field FCO where
  coe := Field.toFCO

-- META concept PacketDiagram
structure PacketDiagram extends FCO where
  title : String := ""
  -- containment allows: Field
  _childIds : List _NodeId := []
  deriving Repr

instance : Coe PacketDiagram FCO where
  coe := PacketDiagram.toFCO

/-- Well-formedness scaffold: every node name non-empty (domain-local). -/
def AllNamesNonEmpty (nodes : List FCO) : Bool :=
  nodes.all fun n => n.name ≠ ""

end PacketDomain
