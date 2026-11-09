# S4 — Event-driven ticketing / commerce platform

## Pitch

A product org builds a concert/ticketing (or checkout) platform with **Event Storming / event modeling**, **C4 containers**, **bounded-context data**, and **async integration**. Delivery boards track features while UX journeys describe purchase. Bugs appear when events, schemas, and container boundaries disagree.

## Literature & industrial anchors

| Source | What we borrow |
|--------|----------------|
| Event-sourcing on production workshop (concert reservation example) | Bounded contexts (Reservation, Cart, Finance, Tickets…); commands/events; cross-module sequence including Stripe/Mailgun |
| Modular monolith with DDD (Kamil Grzybek et al.) | Event Storming process boards → C4 context/container/component as architecture handoff |
| Modular monolith Node case studies | Event Storming discovery → C4 → event-driven module sync |
| “Architecture artifacts in order” handoff essays | Explicit pipeline: requirements → domain events → aggregates → C4 → APIs/data |
| Enterprise e-commerce strangler/C4 examples | Catalog/Recommendations extracted; Orders in modular monolith; `OrderConfirmed` via broker |

## Domains combined

| Concern | Diagram(s) | Example content |
|---------|------------|-----------------|
| Discovery / behavioral timeline | `eventmodeling`, `timeline` | ReserveTickets → ReservationCreated → AddToCart → Pay → TicketIssued |
| Architecture | `c4`, `architecture` | Web UI, API, Reservation svc, Payments, Broker, Mail |
| Domain structure | `class`, `er` | Reservation, Seat, Order, Payment, Ticket |
| Runtime conversations | `sequence` | UI↔Reservation↔Finance↔Stripe; events on broker |
| Aggregate lifecycle | `state` | Reservation: Held → Confirmed → Expired |
| Customer experience | `journey` | Browse → Hold seat → Pay → Receive ticket |
| Delivery | `kanban`, `gantt` | “Extract Payments” vs “Fix oversell” |
| Analytics (optional) | `sankey`, `funnel via xychart` | Drop-off Browse→Pay |

## Integrated validation story

1. **Event vocabulary unity**  
   Every event on the event-model swimlane is published/consumed by a C4 container and appears in ≥1 sequence.  
   *Failure:* `PaymentSucceeded` in event model, but Finance container never emits it.

2. **Aggregate ↔ ER ↔ state**  
   ER entity `Reservation` fields support state machine; illegal ER updates that skip states are flagged.

3. **Journey ↔ events**  
   Journey tasks map to commands/events; a journey step without a command is “UI fiction.”

4. **Bounded context edges**  
   Sequence calls that cross containers must be either sync API edges in C4 or async broker edges — not both silently.

5. **Oversell invariant**  
   Requirement/policy “never sell same seat twice” checked against event flows (Reserve + Confirm) and state exclusivity.

6. **Delivery trace**  
   Kanban “Prevent oversell” must link to the invariant requirement and the sequences that demonstrate it.

## Seed focus

Happy-path reserve→pay→issue with intentional oversell inconsistency planted for the validator to find.

## Distinctive WebGME value

Mermaid’s `eventmodeling` is still beta; WebGME can become the **system of record** that binds event discovery to C4/ER/sequence long before the text syntax stabilizes.
