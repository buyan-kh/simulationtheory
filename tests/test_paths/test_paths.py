"""Tests for path exploration."""

import json

import pytest

from sp26._core import paths as _paths


def test_bfs_paths():
    adj = {"a": ["b", "c"], "b": ["d"], "c": [], "d": []}
    result = _paths.bfs_paths(json.dumps(adj), "a", 3)
    assert len(result) > 0
    for path in result:
        assert path[0] == "a"


def test_dfs_paths():
    adj = {"a": ["b", "c"], "b": ["d"], "c": [], "d": []}
    result = _paths.dfs_paths(json.dumps(adj), "a", 3)
    assert len(result) > 0
    for path in result:
        assert path[0] == "a"


def test_bfs_respects_max_depth():
    adj = {"a": ["b"], "b": ["c"], "c": ["d"], "d": ["e"], "e": []}
    result = _paths.bfs_paths(json.dumps(adj), "a", 2)
    for path in result:
        assert len(path) <= 2


def test_mcts_search():
    adj = {"a": ["b", "c"], "b": ["d"], "c": [], "d": []}
    values = {"a": 0.0, "b": 1.0, "c": 0.5, "d": 2.0}
    result = _paths.mcts_search(json.dumps(adj), json.dumps(values), "a", 10, 3)
    assert len(result) > 0
    node_ids = [r[0] for r in result]
    assert "a" in node_ids


def test_create_game_tree():
    tree = {
        "id": "root",
        "label": "Start",
        "value": 0.0,
        "children": [
            {"id": "c1", "label": "Left", "value": 1.0, "children": []},
            {"id": "c2", "label": "Right", "value": 2.0, "children": []},
        ],
    }
    result = _paths.create_game_tree(json.dumps(tree))
    assert len(result) == 3
    assert result[0][0] == "root"
    assert result[0][1] == ""  # no parent
