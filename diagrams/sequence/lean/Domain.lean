-- Auto-generated from diagrams/sequence/metamodel/Language.json
-- Fashion: kecso/webgme-lean (META → Lean structures). Regenerate: npm run generate:lean -- sequence
-- DO NOT hand-edit permanent semantics here without updating Language.json.

namespace SequenceDomain

structure _NodeId where
  path : String
  deriving DecidableEq, Repr

class _Contained (parent child : Type) where
  children : parent → List child

inductive _Type where
  | _FCO
  | cDiagram
  | cParticipant
  | cMessage
  | cFragment
  | cNote
  deriving DecidableEq, BEq, Repr

structure FCO where
  _id : _NodeId
  _type : _Type
  name : String
  deriving Repr

-- META concept Diagram
structure Diagram extends FCO where
  autonumber : String := ""
  title : String := ""
  -- containment allows: Participant
  _childIds : List _NodeId := []
  deriving Repr

instance : Coe Diagram FCO where
  coe := Diagram.toFCO

-- META concept Participant
structure Participant extends FCO where
  alias : String := ""
  kind : String := ""
  deriving Repr

instance : Coe Participant FCO where
  coe := Participant.toFCO

-- META concept Message
-- pointers: from, to (stored as _NodeId; bind via Integrating/correspondences)
structure Message extends FCO where
  label : String := ""
  arrowType : String := ""
  activate : String := ""
  from : _NodeId := ⟨""⟩
  to : _NodeId := ⟨""⟩
  deriving Repr

instance : Coe Message FCO where
  coe := Message.toFCO

-- META concept Fragment
structure Fragment extends FCO where
  kind : String := ""
  label : String := ""
  -- containment allows: Message, Fragment, Note
  _childIds : List _NodeId := []
  deriving Repr

instance : Coe Fragment FCO where
  coe := Fragment.toFCO

-- META concept Note
-- pointers: overStart, overEnd (stored as _NodeId; bind via Integrating/correspondences)
structure Note extends FCO where
  text : String := ""
  placement : String := ""
  overStart : _NodeId := ⟨""⟩
  overEnd : _NodeId := ⟨""⟩
  deriving Repr

instance : Coe Note FCO where
  coe := Note.toFCO

/-- Well-formedness scaffold: every node name non-empty (domain-local). -/
def AllNamesNonEmpty (nodes : List FCO) : Bool :=
  nodes.all fun n => n.name ≠ ""

end SequenceDomain
