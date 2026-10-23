"""Live catalogue: real occupations/tasks from O*NET plus live job demand.

The demo catalogue in :mod:`app.seed_data` is synthetic. This package builds the
``live`` dataset instead, from public sources with no API key:

- O*NET 31.0 (U.S. Department of Labor, CC BY 4.0) for occupations, tasks,
  skills and reported job titles.
- Arbeitnow's public job board for current openings, used as the demand signal.

Only :mod:`app.live.importer` writes to the database; everything else is pure
and unit-testable.
"""
