import os
import sys
import asyncio

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    import pytest
except ImportError:
    pytest = None

from app.services.open_apis import clean_doi, reconstruct_abstract_from_inverted_index
from app.services.pdf_parser import ScientificPDFParser
from app.services.exporter import ScientificExporter
from app.models.schemas import Paper, RiskOfBiasLevel
from app.prompts import load_prompt
from app.agents.state import LabGraphState
from app.agents.nodes import (
    pi_coordinator_node,
    methodologist_node,
    synthesizer_node,
)


def test_clean_doi():
    assert clean_doi("https://doi.org/10.1038/s41586-020-2649-2") == "10.1038/s41586-020-2649-2"
    assert clean_doi("doi:10.1016/j.cell.2021.05.001") == "10.1016/j.cell.2021.05.001"
    assert clean_doi(None) is None


def test_reconstruct_abstract():
    inv = {"Randomized": [0], "trial": [1], "with": [2], "120": [3], "patients.": [4]}
    text = reconstruct_abstract_from_inverted_index(inv)
    assert text == "Randomized trial with 120 patients."


def test_paper_schema():
    p = Paper(
        id="test:1",
        doi="10.1000/182",
        title="Test Scientific Paper",
        authors=["Alice Smith", "Bob Jones"],
        year=2024,
        source_api="OpenAlex",
        doi_verified=True,
    )
    assert p.doi == "10.1000/182"
    assert p.is_screened_in is True
    assert p.authors[0] == "Alice Smith"


def test_scientific_pdf_parser_segmentation():
    sample_pages = [
        "Abstract\nThis study explores human augmentation in bioinformatics.\n\n"
        "Methods\nWe randomized 100 participants into two double-blind groups. P-values were evaluated.",
        "Results\nThe augmented group showed a 65% reduction in screening latency (p < 0.001).\n\n"
        "Limitations\nThe sample size was restricted to academic researchers."
    ]

    segments = ScientificPDFParser.segment_document(sample_pages)
    assert "ABSTRACT" in segments
    assert "METHODS" in segments
    assert "RESULTS" in segments
    assert "LIMITATIONS" in segments
    assert "65% reduction" in segments["RESULTS"]


def test_prompts_loader():
    for name in ["pi_coordinator", "miner", "methodologist", "synthesizer"]:
        prompt = load_prompt(name)
        assert len(prompt) > 50
        assert "System Prompt" in prompt


def test_scientific_exporter():
    sample_matrix = [
        {
            "paper_id": "p1",
            "doi": "10.1016/j.cell.2024.01.001",
            "citation_key": "Silva2024",
            "title": "Deep Learning for Oncology",
            "authors": ["Silva, A.", "Santos, M."],
            "year": 2024,
            "journal": "Cell Research",
            "qualis_capes": "A1",
            "sjr_quartile": "Q1",
            "population_n": "N = 120",
            "intervention": "AI Screening",
            "comparator": "Standard Clinical Review",
            "outcomes": "Sensitivity 98% (p < 0.001)",
            "risk_of_bias": "LOW",
            "statistical_soundness": "AUDITED",
            "traceable_quote": "Parágrafo verificado na página 4.",
            "page_reference": 4,
        }
    ]

    csv_data = ScientificExporter.export_prisma_matrix_csv(sample_matrix)
    assert "CitationKey" in csv_data
    assert "Silva2024" in csv_data
    assert "QualisCAPES" in csv_data
    assert "10.1016/j.cell.2024.01.001" in csv_data

    bib_data = ScientificExporter.export_bibtex_references(sample_matrix)
    assert "@article{Silva2024" in bib_data
    assert "Deep Learning for Oncology" in bib_data
    assert "doi = {10.1016/j.cell.2024.01.001}" in bib_data


def test_modular_agent_nodes():
    state: LabGraphState = {
        "review_id": "test_rev",
        "query": "CRISPR-Cas9 Gene Editing",
        "topic": "CRISPR-Cas9 Gene Editing",
    }

    # 1. PI Coordinator
    coord_out = asyncio.run(pi_coordinator_node(state))
    assert "pico" in coord_out
    assert "boolean_queries" in coord_out
    assert coord_out["active_agent"] == "coordinator"
    state.update(coord_out)

    # Fake screened papers for methodologist
    state["screened_papers"] = [
        {
            "id": "paper_1",
            "doi": "10.1038/nature12345",
            "title": "CRISPR in vivo trials",
            "authors": ["Doudna, J."],
            "year": 2024,
            "journal": "Nature",
        }
    ]

    # 2. Methodologist
    meth_out = asyncio.run(methodologist_node(state))
    assert "audited_papers" in meth_out
    assert len(meth_out["audited_papers"]) == 1
    assert "qualis_capes" in meth_out["audited_papers"][0]
    state.update(meth_out)

    # 3. Synthesizer
    synth_out = asyncio.run(synthesizer_node(state))
    assert "prisma_matrix" in synth_out
    assert len(synth_out["prisma_matrix"]) == 1
    assert "knowledge_gaps" in synth_out
    assert len(synth_out["knowledge_gaps"]) >= 1


if __name__ == "__main__":
    test_clean_doi()
    test_paper_schema()
    test_scientific_pdf_parser_segmentation()
    test_prompts_loader()
    test_scientific_exporter()
    test_modular_agent_nodes()
    print("ALL TESTS (INCLUDING EXPANDED MODULES) PASSED SUCCESSFULLY!")
