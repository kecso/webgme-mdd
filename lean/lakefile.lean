import Lake
open Lake DSL

package «webgme-mdd-lean» where
  -- Self-contained examples; no external mathlib dependency.

@[default_target]
lean_lib «WebGMEMDD» where
  roots := #[`Integrating.Domain]
  globs := #[.submodules `Integrating]
