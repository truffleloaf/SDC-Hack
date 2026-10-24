Historical log. Not maintained.

# P0-1: Data catalogue and seed

This archived work package defined the first backend schema and reproducible demo seed.

## Scope

- Model skills, roles, requirements, tasks, task-skill links, resources, signals, scenarios, and SDGs.
- Preserve display order and relational constraints.
- Provide an idempotent demo seeder and a reset path for controlled environments.
- Match the frontend demo catalogue and document provenance.

## Acceptance

The seed can recreate a clean demo database, a second run is idempotent, invalid foreign keys fail, and catalogue counts match the generated fixture. Current details are in [data-model.md](../../data-model.md).
