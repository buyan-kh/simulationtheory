"""Tests for similarity computation."""

import pytest

from sp26._core import similarity as _sim


def test_cosine_similarity_identical():
    result = _sim.cosine_similarity([1.0, 0.0, 0.0], [1.0, 0.0, 0.0])
    assert abs(result - 1.0) < 1e-10


def test_cosine_similarity_orthogonal():
    result = _sim.cosine_similarity([1.0, 0.0], [0.0, 1.0])
    assert abs(result) < 1e-10


def test_cosine_similarity_opposite():
    result = _sim.cosine_similarity([1.0, 0.0], [-1.0, 0.0])
    assert abs(result + 1.0) < 1e-10


def test_cosine_similarity_matrix():
    vectors = [[1.0, 0.0], [0.0, 1.0], [1.0, 1.0]]
    result = _sim.cosine_similarity_matrix(vectors)
    assert len(result) == 9  # 3x3
    # Diagonal should be 1.0
    assert abs(result[0] - 1.0) < 1e-10
    assert abs(result[4] - 1.0) < 1e-10
    assert abs(result[8] - 1.0) < 1e-10


def test_euclidean_distance():
    result = _sim.euclidean_distance([0.0, 0.0], [3.0, 4.0])
    assert abs(result - 5.0) < 1e-10


def test_euclidean_distance_same_point():
    result = _sim.euclidean_distance([1.0, 2.0, 3.0], [1.0, 2.0, 3.0])
    assert abs(result) < 1e-10


def test_kmeans_cluster():
    # Two clearly separated clusters
    vectors = [
        [0.0, 0.0],
        [0.1, 0.1],
        [10.0, 10.0],
        [10.1, 10.1],
    ]
    assignments = _sim.kmeans_cluster(vectors, 2, 100)
    assert len(assignments) == 4
    # First two should be in the same cluster
    assert assignments[0] == assignments[1]
    # Last two should be in the same cluster
    assert assignments[2] == assignments[3]
    # The two groups should be in different clusters
    assert assignments[0] != assignments[2]
