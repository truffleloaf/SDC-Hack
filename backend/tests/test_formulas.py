"""Unit tests for the deterministic scoring formulas."""

from __future__ import annotations

from datetime import date, timedelta

import pytest

from app.schemas import Selection
from app.services.exposure import (
    classify,
    clamp,
    normalize_shares,
    recency,
    task_exposure,
)
from app.services.matching import learning_weeks, role_fit, route_score


def test_recency_halves_every_180_days():
    as_of = date(2026, 10, 1)
    assert recency(as_of, as_of) == 1.0
    assert recency(as_of - timedelta(days=180), as_of) == 0.5
    assert recency(as_of - timedelta(days=360), as_of) == 0.25
    # Future dates never produce a negative age.
    assert recency(as_of + timedelta(days=10), as_of) == 1.0


def test_signal_adjustment_is_clamped():
    # The DB-backed clamp is exercised through task_exposure bounds here.
    assert clamp(1.5, -0.2, 0.2) == 0.2
    assert clamp(-1.5, -0.2, 0.2) == -0.2


def test_task_exposure_applies_multiplier_then_adjustment():
    assert task_exposure(0.5, 1.25, 0.1) == 0.725
    assert task_exposure(0.9, 1.25, 0.2) == 1.0
    assert task_exposure(0.05, 1.0, -0.2) == 0.0


def test_classification_thresholds():
    assert classify(0.70, 0.30) == "Automate"
    assert classify(0.70, 0.70) == "Protect"
    assert classify(0.50, 0.50) == "Augment"
    assert classify(0.65, 0.40) == "Augment"


def test_normalize_shares_sums_to_one():
    shares = normalize_shares(
        [
            Selection(taskId="a", share=40),
            Selection(taskId="b", share=30),
            Selection(taskId="c", share=30),
        ]
    )
    assert sum(item.share for item in shares) == 1.0
    assert [item.share for item in shares] == [0.4, 0.3, 0.3]

    equal = normalize_shares(
        [Selection(taskId="a", share=0), Selection(taskId="b", share=0)]
    )
    assert [item.share for item in equal] == [0.5, 0.5]
    assert normalize_shares([]) == []


def test_learning_weeks_round_up_and_handle_zero():
    assert learning_weeks(90, 6) == 15
    assert learning_weeks(90, 8) == 12
    assert learning_weeks(90, 12) == 8
    assert learning_weeks(61, 6) == 11
    assert learning_weeks(0, 6) == 0


def test_fit_and_route_score():
    assert role_fit(0.5, None) == 50.0
    assert role_fit(0.5, 1.0) == pytest.approx(60.0)
    assert round(route_score(56.035354, 0.4576), 1) == 55.5
