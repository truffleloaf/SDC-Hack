"""Deprecated admin router.

The demo contract no longer has ``/api/admin/*``:

- add a signal            -> ``POST /api/signals``
- recompute with a diff   -> ``POST /api/analysis/recompute``
- reset the demo dataset  -> ``POST /api/seed``

This module is intentionally empty so old imports fail loudly instead of
serving the pre-demo contract.
"""
