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
  | cParticipant
  | cMessage
  | cFragment
  | cNote
  | cSequenceDiagram
  deriving DecidableEq, BEq, Repr

structure FCO where
  _id : _NodeId
  _type : _Type
  name : String
  deriving Repr

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

-- META concept SequenceDiagram
structure SequenceDiagram extends FCO where
  autonumber : String := ""
  title : String := ""
  -- containment allows: Participant, Message, Fragment, Note
  _childIds : List _NodeId := []
  deriving Repr

instance : Coe SequenceDiagram FCO where
  coe := SequenceDiagram.toFCO

/-- Well-formedness scaffold: every node name non-empty (domain-local). -/
def AllNamesNonEmpty (nodes : List FCO) : Bool :=
  nodes.all fun n => n.name ≠ ""

end SequenceDomain
