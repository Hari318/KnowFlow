from __future__ import annotations


def reciprocal_rank_fusion(rankings: list[list[tuple]], k: int = 60) -> list[tuple]:
    """Merge several ranked lists of (chunk, distance) into one.

    A chunk scores 1/(k + position) in every list it appears in; scores add up.
    """
    scores: dict = {}
    items: dict = {}
    for ranking in rankings:
        for position, (chunk, distance) in enumerate(ranking):
            scores[chunk.id] = scores.get(chunk.id, 0.0) + 1.0 / (k + position + 1)
            items.setdefault(chunk.id, (chunk, distance))
    order = sorted(scores, key=scores.get, reverse=True)
    return [items[chunk_id] for chunk_id in order]