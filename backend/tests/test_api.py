import asyncio
import importlib
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import httpx
import pytest
from fastapi.testclient import TestClient

from app.agents.nodes import pi_coordinator_node, synthesizer_node
from app.agents.nodes.methodologist_node import (
    _audit_paper_from_abstract,
    _enrich_with_llm,
)
from app.core.config import settings
from app.main import app
from app.models.evidence import quote_in_text
from app.models.schemas import Paper
from app.prompts import load_prompt
from app.services.events import EventBus
from app.services.exporter import ScientificExporter
from app.services.open_apis import (
    clean_doi,
    reconstruct_abstract_from_inverted_index,
    verify_doi_crossref,
)
from app.services.pdf_parser import ScientificPDFParser

# nodes/__init__ re-exports the function `miner_node`, shadowing the submodule for string-path patching
miner_module = importlib.import_module("app.agents.nodes.miner_node")

# ---------------------------------------------------------------------------
# Test fixtures (test data only - the product ships with NO built-in papers)
# ---------------------------------------------------------------------------
RCT_ABSTRACT = (
    "Background: Solid tumors respond poorly to current options. Methods: We randomized n = 128 patients "
    "to the intervention or placebo. Results: The objective response rate was 54% (p < 0.001) "
    "versus 12% in the placebo group."
)
PILOT_ABSTRACT = (
    "We evaluated 18 patients in an unblinded pilot study without an active comparator arm. "
    "Marginal regression was noted (p = 0.048)."
)

FAKE_PAPERS = [
    Paper(id="t:rct", doi="10.1000/rct", title="A randomized trial of the intervention",
          authors=["Alice Smith", "Bob Jones"], year=2023, journal="Test Journal",
          abstract=RCT_ABSTRACT, source_api="OpenAlex"),
    Paper(id="t:pilot", doi="10.1000/pilot", title="An unblinded pilot of the intervention",
          authors=["Carla Souza"], year=2022, journal="Pilot Journal",
          abstract=PILOT_ABSTRACT, source_api="Europe PMC"),
    Paper(id="t:noabs", doi="10.1000/ghost", title="A record without abstract",
          authors=[], year=None, journal=None, abstract="", source_api="OpenAlex"),
]

PROTOCOL = {
    "topic": "Efficacy of the intervention in solid tumors",
    "pico": {
        "population": "Adults with solid tumors",
        "intervention": "The intervention",
        "comparator": "Placebo or standard care",
        "outcome": "Objective response rate",
    },
    "boolean_queries": ['("intervention") AND ("solid tumors")'],
}


@pytest.fixture(autouse=True)
def no_server_llm_keys(monkeypatch):
    """Tests must never reach a real LLM, even if the developer has keys in the environment."""
    monkeypatch.setattr(settings, "GOOGLE_API_KEY", "")
    monkeypatch.setattr(settings, "GROQ_API_KEY", "")


@pytest.fixture
def client(tmp_path, monkeypatch):
    async def fake_search(query, limit_per_source=8, year_start=None, year_end=None, on_event=None):
        await on_event("api_call_started", "OpenAlex", "Consultando OpenAlex", query=query)
        await on_event("api_call_finished", "OpenAlex", "OpenAlex retornou 2", count=2, http_status=200)
        await on_event("api_call_started", "Europe PMC", "Consultando Europe PMC", query=query)
        await on_event("api_call_finished", "Europe PMC", "Europe PMC retornou 1", count=1, http_status=200)
        return [p.model_copy() for p in FAKE_PAPERS]

    async def fake_verify(doi, expected_title=None, client=None):
        status = "not_found" if doi == "10.1000/ghost" else "verified"
        return {"status": status, "doi": doi, "http_status": 404 if status == "not_found" else 200, "elapsed_ms": 3}

    monkeypatch.setattr(miner_module, "federated_literature_search", fake_search)
    monkeypatch.setattr(miner_module, "verify_doi_crossref", fake_verify)
    monkeypatch.setattr(settings, "DB_PATH", str(tmp_path / "test.db"))
    with TestClient(app) as c:
        yield c


def wait_for_status(client, review_id, status, timeout=10.0):
    deadline = time.time() + timeout
    body = {}
    while time.time() < deadline:
        body = client.get(f"/api/v1/reviews/{review_id}").json()
        if body.get("status") == status:
            return body
        time.sleep(0.05)
    raise AssertionError(f"timeout waiting for {status}; last body: {body}")


def screening(include=("t:rct", "t:pilot"), exclude=(("t:noabs", "Sem abstract para triagem"),)):
    decisions = [{"paper_id": p, "decision": "include"} for p in include]
    decisions += [{"paper_id": p, "decision": "exclude", "reason": r} for p, r in exclude]
    return {"step_checkpoint": "screening", "screening": decisions}


def screening_only(*included):
    """Includes the given ids and excludes every other fixture paper with a justification."""
    excluded = tuple((p.id, "fora do escopo") for p in FAKE_PAPERS if p.id not in included)
    return screening(include=included, exclude=excluded)


# ---------------------------------------------------------------------------
# Pure helpers (kept from the previous suite)
# ---------------------------------------------------------------------------
def test_clean_doi():
    assert clean_doi("https://doi.org/10.1038/s41586-020-2649-2") == "10.1038/s41586-020-2649-2"
    assert clean_doi("doi:10.1016/j.cell.2021.05.001") == "10.1016/j.cell.2021.05.001"
    assert clean_doi("see 10.1000/abc.") == "10.1000/abc"
    assert clean_doi(None) is None


def test_reconstruct_abstract():
    inv = {"Randomized": [0], "trial": [1], "with": [2], "120": [3], "patients.": [4]}
    assert reconstruct_abstract_from_inverted_index(inv) == "Randomized trial with 120 patients."


def test_paper_schema():
    p = Paper(id="test:1", doi="10.1000/182", title="Test Scientific Paper",
              authors=["Alice Smith", "Bob Jones"], year=2024, source_api="OpenAlex", doi_verified=True)
    assert p.doi == "10.1000/182"
    assert p.is_screened_in is True
    assert Paper(id="x", title="t", source_api="OpenAlex").doi_verified is False


def test_scientific_pdf_parser_segmentation():
    sample_pages = [
        "Abstract\nThis study explores human augmentation in bioinformatics.\n\n"
        "Methods\nWe randomized 100 participants into two double-blind groups. P-values were evaluated.",
        "Results\nThe augmented group showed a 65% reduction in screening latency (p < 0.001).\n\n"
        "Limitations\nThe sample size was restricted to academic researchers.",
    ]
    segments = ScientificPDFParser.segment_document(sample_pages)
    assert {"ABSTRACT", "METHODS", "RESULTS", "LIMITATIONS"} <= set(segments)
    assert "65% reduction" in segments["RESULTS"]


def test_prompts_loader():
    for name in ["pi_coordinator", "miner", "methodologist", "synthesizer"]:
        prompt = load_prompt(name)
        assert len(prompt) > 50
        assert "System Prompt" in prompt


# ---------------------------------------------------------------------------
# Zero-Fake: provenance
# ---------------------------------------------------------------------------
def test_no_built_in_demo_data():
    """The old router shipped a preloaded review with invented papers. It must be gone."""
    from app.api.v1 import router

    assert not hasattr(router, "DEMO_REVIEW_ID")
    assert not hasattr(router, "REVIEWS_DATABASE")
    assert not hasattr(router, "get_demo_review_state")


def test_extraction_is_anchored_to_abstract_quotes():
    item = _audit_paper_from_abstract({"id": "t:rct", "doi": "10.1000/rct", "title": "T", "abstract": RCT_ABSTRACT}, 0)
    assert item["sample_size"]["status"] == "found"
    assert item["sample_size"]["value"] == "N = 128"
    assert quote_in_text(item["sample_size"]["quote"], RCT_ABSTRACT)
    assert [p["value"] for p in item["p_values"]] == ["p < 0.001"]
    assert all(quote_in_text(p["quote"], RCT_ABSTRACT) for p in item["p_values"])
    assert item["comparator"]["status"] == "found"
    assert quote_in_text(item["comparator"]["quote"], RCT_ABSTRACT)
    # Never claims a RoB 2 level from an abstract
    assert item["risk_of_bias"] == "needs_human_review"
    assert set(item["rob2_domains"].values()) == {"needs_human_review"}
    assert item["needs_bias_arbitration"] is False


def test_missing_evidence_is_explicit_not_fabricated():
    empty = _audit_paper_from_abstract({"id": "p", "title": "No abstract", "doi": None, "abstract": ""}, 0)
    assert empty["doi"] is None
    assert empty["sample_size"]["value"] == "not_found"
    assert empty["comparator"]["value"] == "not_found"
    assert empty["p_values"] == []
    assert empty["intervention"]["value"] == "needs_human_review"
    assert empty["authors"] == []  # no 'Autor Principal et al.' placeholder
    assert empty["year"] is None  # no default 2024


def test_sample_size_regex_does_not_count_studies_and_flags_ambiguity():
    studies = _audit_paper_from_abstract({"id": "p", "title": "t", "abstract": "We pooled 12 studies and 3 trials."}, 0)
    assert studies["sample_size"]["value"] == "not_found"

    ambiguous = _audit_paper_from_abstract(
        {"id": "p", "title": "t", "abstract": "We enrolled n = 100 patients overall and n = 40 in the second phase."}, 0)
    assert ambiguous["sample_size"]["status"] == "needs_human_review"
    assert "100" in ambiguous["sample_size"]["note"] and "40" in ambiguous["sample_size"]["note"]


def test_bias_attention_cues_from_abstract():
    item = _audit_paper_from_abstract({"id": "t:pilot", "title": "t", "abstract": PILOT_ABSTRACT}, 0)
    assert item["needs_bias_arbitration"] is True
    assert {"unblinded", "pilot", "no_control"} <= set(item["bias_attention_cues"])
    assert item["comparator"]["status"] == "not_found"
    assert item["risk_of_bias"] == "needs_human_review"  # a cue is not a judgement


def test_llm_output_without_verbatim_quote_is_discarded():
    class FakeLLM:
        has_active_key = True

        async def invoke_json(self, prompt, system_message=""):
            return [{
                "paper_id": "t:rct",
                "sample_size": {"value": "N = 999", "quote": "We randomized 999 patients"},  # invented
                "comparator": {"value": "placebo", "quote": "or placebo. Results: The objective"},  # verbatim
                "intervention": {"value": "Drug X", "quote": "Drug X was administered daily"},  # invented
                "outcome": {"value": "ORR 54%", "quote": "objective response rate was 54% (p < 0.001)"},
            }]

    paper = {"id": "t:rct", "doi": "10.1000/rct", "title": "T", "abstract": RCT_ABSTRACT}
    audited = [_audit_paper_from_abstract(paper, 0)]
    asyncio.run(_enrich_with_llm(audited, [paper], FakeLLM(), "", None))
    item = audited[0]
    assert item["sample_size"]["value"] == "N = 128"  # deterministic value kept; invented N rejected
    assert item["intervention"]["value"] == "needs_human_review"
    assert item["comparator"]["method"] == "llm_verified"
    assert item["outcome"]["status"] == "found" and item["outcome"]["method"] == "llm_verified"


def test_doi_verification_checks_title_and_distinguishes_failures():
    def handler(request: httpx.Request) -> httpx.Response:
        path = request.url.path
        if path.endswith("10.1000/ok"):
            return httpx.Response(200, json={"message": {"title": ["A randomized trial of the intervention"]}})
        if path.endswith("10.1000/other"):
            return httpx.Response(200, json={"message": {"title": ["Completely unrelated cardiology paper"]}})
        if path.endswith("10.1000/gone"):
            return httpx.Response(404)
        return httpx.Response(503)

    async def run():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as c:
            title = "A randomized trial of the intervention"
            return [
                (await verify_doi_crossref(doi, title, c))["status"]
                for doi in ("10.1000/ok", "10.1000/other", "10.1000/gone", "10.1000/flaky")
            ] + [(await verify_doi_crossref("not-a-doi", title, c))["status"]]

    assert asyncio.run(run()) == ["verified", "title_mismatch", "not_found", "unreachable", "invalid"]


def test_synthesizer_no_template_gaps_and_unique_keys():
    papers = [
        {"id": f"t:{i}", "doi": f"10.1000/{i}", "title": f"Study {i}", "authors": ["Alice Smith"], "year": 2023,
         "abstract": RCT_ABSTRACT, "source_api": "OpenAlex", "doi_status": "verified"}
        for i in range(2)
    ] + [{"id": "t:x", "title": "Orphan", "authors": [], "abstract": "", "source_api": "OpenAlex"}]
    state = {"query": "q", "audited_papers": [_audit_paper_from_abstract(p, i) for i, p in enumerate(papers)],
             "screened_papers": papers}

    out = asyncio.run(synthesizer_node(state))
    assert out["knowledge_gaps"] == []  # no key -> no invented gaps
    rows = out["prisma_matrix"]
    keys = [r["citation_key"] for r in rows]
    assert len(set(keys)) == 3 and keys[0] == "Smith2023" and keys[2] == "Anonnd"
    orphan = rows[2]
    assert orphan["year"] is None and orphan["authors"] == []
    assert orphan["population_n"] == "not_found" and orphan["qualis_capes"] == "not_found"
    assert orphan["traceable_quote"] == "not_found"
    assert rows[0]["statistical_soundness"] != "AUDITADO (VIA ABSTRACT)"


def test_coordinator_refuses_incomplete_protocol():
    out = asyncio.run(pi_coordinator_node({"topic": "x", "pico": {"population": "adults"}, "boolean_queries": []}))
    assert out["current_step"] == "ERROR"
    assert len(out["errors"]) >= 4  # 3 missing PICO fields + missing query
    assert "pico" not in out  # nothing invented


def test_exporter_never_invents_values():
    row = {"paper_id": "p1", "doi": "10.1016/j.cell.2024.01.001", "citation_key": "Silva2024",
           "title": "Deep Learning for Oncology", "authors": ["Silva, A.", "Santos, M."], "year": 2024,
           "journal": "Cell Research", "qualis_capes": "not_found", "population_n": "N = 120",
           "traceable_quote": "Quote", "risk_of_bias": "needs_human_review"}
    csv_data = ScientificExporter.export_prisma_matrix_csv([row])
    assert "CitationKey" in csv_data and "Silva2024" in csv_data and "10.1016/j.cell.2024.01.001" in csv_data
    assert '"not_found"' in csv_data  # absent columns are explicit

    bib = ScientificExporter.export_bibtex_references([row])
    assert "@article{Silva2024" in bib and "doi = {10.1016/j.cell.2024.01.001}" in bib

    bare = ScientificExporter.export_bibtex_references([{"citation_key": "Anonnd", "title": "Only title"}])
    assert "year" not in bare and "journal" not in bare and "2024" not in bare and "Academic Journal" not in bare


# ---------------------------------------------------------------------------
# Telemetry bus
# ---------------------------------------------------------------------------
def test_event_bus_replays_by_seq_and_follows_live():
    async def run():
        bus = EventBus()
        await bus.start(None)
        for i in range(3):
            await bus.emit("t1", "searcher", "api_call_started", f"e{i}")
        replay = [e["seq"] async for e in _take(bus.stream("t1", after=1), 2)]

        gen = bus.stream("t1", after=3, heartbeat=0.05)
        heartbeat = await gen.__anext__()
        emitter = asyncio.create_task(_emit_later(bus))
        live = await gen.__anext__()
        while live is None:  # skip extra heartbeats while waiting
            live = await gen.__anext__()
        await emitter
        return replay, heartbeat, live["message"]

    async def _take(gen, n):
        async for item in gen:
            yield item
            n -= 1
            if n == 0:
                return

    async def _emit_later(bus):
        await asyncio.sleep(0.12)
        await bus.emit("t1", "validator", "doi_check", "live")

    replay, heartbeat, live_message = asyncio.run(run())
    assert replay == [2, 3]
    assert heartbeat is None
    assert live_message == "live"


# ---------------------------------------------------------------------------
# End to end through the REAL compiled graph (checkpointed, interrupt/resume)
# ---------------------------------------------------------------------------
def test_create_review_returns_thread_id_immediately_and_validates_protocol(client):
    resp = client.post("/api/v1/reviews", json=PROTOCOL)
    assert resp.status_code == 202
    body = resp.json()
    assert body["thread_id"] == body["review_id"] and body["status"] == "RUNNING"

    bad = dict(PROTOCOL, pico={**PROTOCOL["pico"], "population": " "})
    assert client.post("/api/v1/reviews", json=bad).status_code == 422
    assert client.post("/api/v1/reviews", json={"topic": "no protocol at all"}).status_code == 422
    assert client.get("/api/v1/reviews/does-not-exist").status_code == 404


def test_full_workflow_screening_bias_arbitration_and_provenance(client):
    secret = "AIzaSy_SUPER_SECRET_KEY"
    review_id = client.post("/api/v1/reviews", json={**PROTOCOL, "byok_gemini_key": secret}).json()["review_id"]

    # --- Pause 1: human screening, persisted under thread_id
    state = wait_for_status(client, review_id, "AWAITING_HUMAN")
    assert state["hitl"]["checkpoint"] == "screening"
    assert state["current_step"] == "SCREENING_CHECKPOINT"
    assert {p["id"]: p["doi_status"] for p in state["raw_papers"]} == {
        "t:rct": "verified", "t:pilot": "verified", "t:noabs": "not_found"}
    assert not any(p["doi_verified"] for p in state["raw_papers"] if p["id"] == "t:noabs")
    assert secret not in str(state)

    # Decisions are validated against what the graph is waiting for
    assert client.post(f"/api/v1/reviews/{review_id}/hitl",
                       json={"step_checkpoint": "bias_arbitration", "bias": []}).status_code == 409
    assert client.post(f"/api/v1/reviews/{review_id}/hitl", json=screening(exclude=())).status_code == 422  # undecided
    no_reason = {"step_checkpoint": "screening", "screening": [
        {"paper_id": "t:rct", "decision": "include"}, {"paper_id": "t:pilot", "decision": "include"},
        {"paper_id": "t:noabs", "decision": "exclude"}]}
    assert client.post(f"/api/v1/reviews/{review_id}/hitl", json=no_reason).status_code == 422  # no justification

    assert client.post(f"/api/v1/reviews/{review_id}/hitl", json=screening()).status_code == 202

    # --- Pause 2: bias arbitration (only the flagged study)
    state = wait_for_status(client, review_id, "AWAITING_HUMAN")
    assert state["hitl"]["checkpoint"] == "bias_arbitration"
    assert [f["paper_id"] for f in state["hitl"]["flagged"]] == ["t:pilot"]
    assert state["screening_log"][2] == {"paper_id": "t:noabs", "doi": "10.1000/ghost", "decision": "exclude",
                                         "reason": "Sem abstract para triagem", "decided_by": "human"}

    assert client.post(f"/api/v1/reviews/{review_id}/export/csv").status_code == 405
    assert client.get(f"/api/v1/reviews/{review_id}/export/csv").status_code == 409  # not ready yet

    bias = {"step_checkpoint": "bias_arbitration",
            "bias": [{"paper_id": "t:pilot", "risk_of_bias": "HIGH", "justification": "Braço único e aberto"}]}
    assert client.post(f"/api/v1/reviews/{review_id}/hitl", json=bias).status_code == 202

    # --- Completed
    state = wait_for_status(client, review_id, "COMPLETED")
    matrix = {r["paper_id"]: r for r in state["prisma_matrix"]}
    assert set(matrix) == {"t:rct", "t:pilot"}
    rct, pilot = matrix["t:rct"], matrix["t:pilot"]
    assert rct["population_n"] == "N = 128"
    assert quote_in_text(rct["evidence"]["population_n"]["quote"], RCT_ABSTRACT)
    assert rct["risk_of_bias"] == "needs_human_review"
    assert pilot["risk_of_bias"] == "HIGH"
    assert pilot["evidence"]["risk_of_bias"]["assessed_by"] == "human"
    assert pilot["comparator"] == "not_found"
    assert rct["qualis_capes"] == "not_found" and rct["sjr_quartile"] == "not_found"
    assert state["knowledge_gaps"] == []
    assert secret not in str(state)

    # --- Real telemetry: granular, ordered, replayable
    events = [e for e in client.get(f"/api/v1/reviews/{review_id}/events?follow=false").text.split("\n\n") if e]
    assert events and all(chunk.startswith("id: ") for chunk in events)
    history = asyncio.run(_history(review_id))
    kinds = [e["kind"] for e in history]
    assert [e["seq"] for e in history] == list(range(1, len(history) + 1))
    for expected in ("run_started", "protocol_registered", "api_call_started", "api_call_finished", "doi_check",
                     "run_paused", "human_decision", "paper_extracted", "bias_signal", "run_completed"):
        assert expected in kinds, f"missing event kind {expected}: {kinds}"
    assert {e["source"] for e in history if e["kind"] == "api_call_started"} == {"OpenAlex", "Europe PMC"}
    assert [e["data"]["doi_status"] for e in history if e["kind"] == "doi_check"].count("not_found") == 1
    assert secret not in str(history)

    # --- Export reflects the same grounded matrix
    csv_text = client.get(f"/api/v1/reviews/{review_id}/export/csv").text
    assert "N = 128" in csv_text and "not_found" in csv_text
    assert "@article{Smith2023" in client.get(f"/api/v1/reviews/{review_id}/export/bibtex").text


async def _history(review_id):
    from app.services.events import get_event_bus
    return await get_event_bus().history(review_id)


def test_sse_stream_follows_run_until_terminal_event(client):
    review_id = client.post("/api/v1/reviews", json=PROTOCOL).json()["review_id"]
    wait_for_status(client, review_id, "AWAITING_HUMAN")
    client.post(f"/api/v1/reviews/{review_id}/hitl", json=screening_only("t:rct"))

    # no-bias path: run finishes without a second pause, and the stream ends on its own
    with client.stream("GET", f"/api/v1/reviews/{review_id}/events") as resp:
        assert resp.headers["content-type"].startswith("text/event-stream")
        text = "".join(resp.iter_text())
    assert "event: agent_event" in text and '"kind": "run_completed"' in text
    wait_for_status(client, review_id, "COMPLETED")

    # Reconnect with Last-Event-ID: only newer events are replayed
    last = max(int(line[4:]) for line in text.splitlines() if line.startswith("id: "))
    replay = client.get(f"/api/v1/reviews/{review_id}/events?follow=false", headers={"Last-Event-ID": str(last)}).text
    assert replay == ""


def test_no_results_and_no_included_studies_end_cleanly(client, monkeypatch):
    review_id = client.post("/api/v1/reviews", json=PROTOCOL).json()["review_id"]
    wait_for_status(client, review_id, "AWAITING_HUMAN")
    exclude_all = screening(include=(), exclude=(("t:rct", "fora do escopo"), ("t:pilot", "fora do escopo"),
                                                  ("t:noabs", "sem abstract")))
    assert client.post(f"/api/v1/reviews/{review_id}/hitl", json=exclude_all).status_code == 202
    state = wait_for_status(client, review_id, "COMPLETED")
    assert state["current_step"] == "NO_INCLUDED_STUDIES"
    assert not state.get("prisma_matrix")

    async def empty_search(*args, **kwargs):
        return []
    monkeypatch.setattr(miner_module, "federated_literature_search", empty_search)
    empty_id = client.post("/api/v1/reviews", json=PROTOCOL).json()["review_id"]
    assert wait_for_status(client, empty_id, "COMPLETED")["current_step"] == "NO_RESULTS"


def test_checkpoint_survives_restart_and_keys_are_never_persisted(tmp_path, monkeypatch):
    """SQLite checkpoint: a run paused for human screening is resumable after the server restarts."""
    secret = "gsk_SUPER_SECRET_GROQ_KEY"
    db_file = tmp_path / "restart.db"
    monkeypatch.setattr(settings, "DB_PATH", str(db_file))

    async def fake_search(query, limit_per_source=8, year_start=None, year_end=None, on_event=None):
        return [p.model_copy() for p in FAKE_PAPERS]

    async def fake_verify(doi, expected_title=None, client=None):
        return {"status": "verified", "doi": doi, "http_status": 200, "elapsed_ms": 1}

    monkeypatch.setattr(miner_module, "federated_literature_search", fake_search)
    monkeypatch.setattr(miner_module, "verify_doi_crossref", fake_verify)

    with TestClient(app) as first:
        review_id = first.post("/api/v1/reviews", json={**PROTOCOL, "byok_groq_key": secret}).json()["review_id"]
        wait_for_status(first, review_id, "AWAITING_HUMAN")
    # server stopped here (lifespan closed the SQLite connections)

    with TestClient(app) as second:
        state = wait_for_status(second, review_id, "AWAITING_HUMAN")
        assert state["hitl"]["checkpoint"] == "screening" and len(state["raw_papers"]) == 3
        history = asyncio.run(_history(review_id))
        assert any(e["kind"] == "run_paused" for e in history)  # event log persisted too

        assert second.post(f"/api/v1/reviews/{review_id}/hitl", json=screening_only("t:rct")).status_code == 202
        done = wait_for_status(second, review_id, "COMPLETED")
        assert [r["paper_id"] for r in done["prisma_matrix"]] == ["t:rct"]

    raw = b"".join(f.read_bytes() for f in tmp_path.glob("restart.db*"))
    assert len(raw) > 0 and secret.encode() not in raw


def test_ai_protocol_suggestion_requires_byok_key(client):
    resp = client.post("/api/v1/protocol/suggest", json={"topic": "CAR-T cells in solid tumors"})
    assert resp.status_code == 422
    assert "manual" in resp.json()["detail"]


if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__, "-v"]))
