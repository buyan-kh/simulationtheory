"""Tests for chart construction."""

import pytest

from sp26._core import chart as _chart
from sp26.config import SP26Config
from sp26.chart.builder import ChartBuilder
from sp26.types import DataPoint, EmbedResult, EmbeddedSeries


@pytest.fixture
def chart_builder(config: SP26Config) -> ChartBuilder:
    return ChartBuilder(config)


@pytest.fixture
def embed_result() -> EmbedResult:
    return EmbedResult(
        series=[
            EmbeddedSeries(
                name="price",
                points=[
                    DataPoint(index=0.0, value=100.0),
                    DataPoint(index=1.0, value=105.0),
                    DataPoint(index=2.0, value=110.0),
                ],
                embedding=[1.0, 0.0, 0.0, 0.0],
            ),
            EmbeddedSeries(
                name="volume",
                points=[
                    DataPoint(index=0.0, value=1000.0),
                    DataPoint(index=1.0, value=1200.0),
                ],
                embedding=[0.0, 1.0, 0.0, 0.0],
            ),
            EmbeddedSeries(
                name="sentiment",
                points=[
                    DataPoint(index=0.0, value=0.8),
                ],
                embedding=[0.0, 0.0, 1.0, 0.0],
            ),
        ],
        dimension=4,
    )


def test_build_chart(chart_builder: ChartBuilder, embed_result: EmbedResult):
    result = chart_builder.build(embed_result)
    assert result.series_count == 3
    assert result.total_points == 6
    assert result.chart_id > 0
    _chart.drop_chart(result.chart_id)


def test_chart_series_names(chart_builder: ChartBuilder, embed_result: EmbedResult):
    result = chart_builder.build(embed_result)
    names = _chart.get_series_names(result.chart_id)
    assert set(names) == {"price", "volume", "sentiment"}
    _chart.drop_chart(result.chart_id)


def test_chart_series_values(chart_builder: ChartBuilder, embed_result: EmbedResult):
    result = chart_builder.build(embed_result)
    values = _chart.get_series_values(result.chart_id, "price")
    assert len(values) == 3
    assert values[0] == (0.0, 100.0)
    assert values[2] == (2.0, 110.0)
    _chart.drop_chart(result.chart_id)


def test_chart_series_window(chart_builder: ChartBuilder, embed_result: EmbedResult):
    result = chart_builder.build(embed_result)
    values = _chart.get_series_window(result.chart_id, "price", 0.5, 1.5)
    assert len(values) == 1
    assert values[0] == (1.0, 105.0)
    _chart.drop_chart(result.chart_id)
