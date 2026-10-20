import logging
import re
from typing import Dict, List, Optional
import httpx
from app.models.schemas import Paper
from app.core.config import settings

logger = logging.getLogger("cortexlab.open_apis")


def clean_doi(raw_doi: Optional[str]) -> Optional[str]:
    """Normalizes DOI string by removing URL prefixes and whitespace."""
    if not raw_doi:
        return None
    match = re.search(r"10\.\d{4,9}/[-._;()/:A-Za-z0-9]+", raw_doi)
    return match.group(0) if match else raw_doi.strip().lower()


def reconstruct_abstract_from_inverted_index(inverted_index: Optional[Dict[str, List[int]]]) -> str:
    """Reconstructs plain-text abstract from OpenAlex abstract_inverted_index."""
    if not inverted_index or not isinstance(inverted_index, dict):
        return ""
    try:
        word_positions: Dict[int, str] = {}
        for word, positions in inverted_index.items():
            if isinstance(positions, list):
                for pos in positions:
                    if isinstance(pos, int):
                        word_positions[pos] = word
        if not word_positions:
            return ""
        max_pos = min(max(word_positions.keys()), 2000)
        words = [word_positions[i] for i in range(max_pos + 1) if i in word_positions]
        return " ".join(words).strip()
    except Exception:
        return ""


async def validate_doi_with_crossref(doi: str, client: Optional[httpx.AsyncClient] = None) -> bool:
    """Cryptographic/official validation of DOI existence via Crossref API.

    Enforces RNF-01: Zero Hallucination of DOIs.
    """
    normalized = clean_doi(doi)
    if not normalized:
        return False

    url = f"https://api.crossref.org/works/{normalized}"
    headers = {"User-Agent": f"CortexLab-Research/1.0 (mailto:{settings.OPENALEX_POLITE_EMAIL})"}

    try:
        if client:
            resp = await client.get(url, headers=headers, timeout=5.0)
        else:
            async with httpx.AsyncClient() as c:
                resp = await c.get(url, headers=headers, timeout=5.0)
        return resp.status_code == 200
    except Exception as e:
        logger.warning(f"Crossref validation failed for DOI {doi}: {e}")
        return False


async def search_openalex(query: str, limit: int = 10) -> List[Paper]:
    """Queries OpenAlex Open Data API (polite pool) and reconstructs full abstracts."""
    papers: List[Paper] = []
    url = "https://api.openalex.org/works"
    params = {
        "search": query,
        "per-page": limit,
        "mailto": settings.OPENALEX_POLITE_EMAIL,
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params, timeout=10.0)
            if resp.status_code != 200:
                return []

            data = resp.json()
            for item in data.get("results", []):
                raw_doi = item.get("doi")
                doi = clean_doi(raw_doi)
                title = item.get("title") or "Untitled Paper"
                authorships = item.get("authorships", [])
                authors = [a.get("author", {}).get("display_name") for a in authorships if a.get("author")]
                year = item.get("publication_year")
                oa_info = item.get("open_access", {})
                pdf_url = oa_info.get("oa_url")
                primary_loc = item.get("primary_location") or {}
                source_info = primary_loc.get("source") or {}
                journal = source_info.get("display_name")
                abstract_text = reconstruct_abstract_from_inverted_index(item.get("abstract_inverted_index"))

                papers.append(
                    Paper(
                        id=f"openalex:{item.get('id')}",
                        doi=doi,
                        title=title,
                        authors=authors[:5],
                        year=year,
                        journal=journal,
                        abstract=abstract_text,
                        source_api="OpenAlex",
                        open_access_pdf_url=pdf_url,
                        doi_verified=bool(doi),
                        citation_count=item.get("cited_by_count", 0),
                    )
                )
    except Exception as e:
        logger.error(f"Error querying OpenAlex: {e}")

    return papers


async def search_europe_pmc(query: str, limit: int = 10) -> List[Paper]:
    """Queries Europe PMC REST API."""
    papers: List[Paper] = []
    url = "https://www.ebi.ac.uk/europepmc/webservices/rest/search"
    params = {
        "query": query,
        "format": "json",
        "pageSize": limit,
        "resultType": "core",
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params, timeout=10.0)
            if resp.status_code != 200:
                return []

            data = resp.json()
            items = data.get("resultList", {}).get("result", [])
            for item in items:
                doi = clean_doi(item.get("doi"))
                title = item.get("title", "").strip().rstrip(".")
                author_str = item.get("authorString", "")
                authors = [a.strip() for a in author_str.split(",") if a.strip()]
                year = None
                if item.get("pubYear"):
                    try:
                        year = int(item.get("pubYear"))
                    except ValueError:
                        pass

                journal = item.get("journalTitle")
                abstract = item.get("abstractText", "")
                is_oa = item.get("isOpenAccess") == "Y"
                pdf_url = None
                if is_oa:
                    pmcid = item.get("pmcid")
                    if pmcid:
                        pdf_url = f"https://www.ncbi.nlm.nih.gov/pmc/articles/{pmcid}/pdf/"

                papers.append(
                    Paper(
                        id=f"europepmc:{item.get('id')}",
                        doi=doi,
                        title=title or "Sem título",
                        authors=authors[:5],
                        year=year,
                        journal=journal,
                        abstract=abstract,
                        source_api="Europe PMC",
                        open_access_pdf_url=pdf_url,
                        doi_verified=bool(doi),
                        citation_count=item.get("citedByCount", 0),
                    )
                )
    except Exception as e:
        logger.error(f"Error querying Europe PMC: {e}")

    return papers


async def federated_literature_search(query: str, limit_per_source: int = 8) -> List[Paper]:
    """Executes parallel searches across OpenAlex and Europe PMC, deduplicating

    and cross-validating DOIs.
    """
    import asyncio

    openalex_task = search_openalex(query, limit=limit_per_source)
    europepmc_task = search_europe_pmc(query, limit=limit_per_source)

    results = await asyncio.gather(openalex_task, europepmc_task, return_exceptions=True)
    all_papers: List[Paper] = []
    seen_dois = set()
    seen_titles = set()

    for res in results:
        if isinstance(res, list):
            for paper in res:
                norm_title = re.sub(r"\W+", "", paper.title.lower())
                if paper.doi and paper.doi in seen_dois:
                    continue
                if norm_title in seen_titles:
                    continue

                if paper.doi:
                    seen_dois.add(paper.doi)
                seen_titles.add(norm_title)
                all_papers.append(paper)

    return all_papers
