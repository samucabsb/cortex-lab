import asyncio
import difflib
import itertools
import logging
import re
import time
from typing import Any, Awaitable, Callable, Dict, List, Optional
from urllib.parse import quote as url_quote
import httpx
from app.models.schemas import Paper
from app.core.config import settings

logger = logging.getLogger("cortexlab.open_apis")

# Optional telemetry callback: ``await on_event(kind, source, message, **data)``.
EventCallback = Optional[Callable[..., Awaitable[None]]]

OPENALEX_URL = "https://api.openalex.org/works"
EUROPE_PMC_URL = "https://www.ebi.ac.uk/europepmc/webservices/rest/search"
CROSSREF_URL = "https://api.crossref.org/works"
EUROPE_PMC_LABEL = "Europe PMC"

TITLE_MATCH_THRESHOLD = 0.7


async def _notify(on_event: EventCallback, kind: str, source: str, message: str, **data: Any) -> None:
    if on_event is None:
        return
    try:
        await on_event(kind, source, message, **data)
    except Exception as exc:  # telemetry must never break a search
        logger.warning(f"Telemetry callback failed: {exc}")


def clean_doi(raw_doi: Optional[str]) -> Optional[str]:
    """Normalizes DOI string by removing URL prefixes and whitespace."""
    if not raw_doi:
        return None
    match = re.search(r"10\.\d{4,9}/[-._;()/:A-Za-z0-9]+", raw_doi)
    if match:
        return match.group(0).rstrip(".,;")
    return raw_doi.strip().lower()


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


def _strip_markup(text: Optional[str]) -> str:
    """Europe PMC abstracts embed HTML (<h4>Background</h4>); quotes must match plain text."""
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def title_similarity(a: Optional[str], b: Optional[str]) -> float:
    """Similarity in [0, 1] between two titles, tolerant to subtitles and punctuation."""
    na = re.sub(r"[^a-z0-9]+", " ", (a or "").lower()).strip()
    nb = re.sub(r"[^a-z0-9]+", " ", (b or "").lower()).strip()
    if not na or not nb:
        return 0.0
    shorter, longer = sorted((na, nb), key=len)
    if len(shorter) >= 20 and shorter in longer:
        return 1.0
    return difflib.SequenceMatcher(None, na, nb).ratio()


async def verify_doi_crossref(
    doi: str,
    expected_title: Optional[str] = None,
    client: Optional[httpx.AsyncClient] = None,
) -> Dict[str, Any]:
    """Verifies a DOI against Crossref and (when given) that it resolves to the expected title.

    Enforces RNF-01: Zero Hallucination of DOIs. Statuses:
    ``verified`` | ``title_mismatch`` | ``not_found`` | ``unreachable`` | ``invalid``.
    A transient Crossref failure is ``unreachable`` - never reported as a fake DOI.
    """
    normalized = clean_doi(doi)
    if not normalized or not normalized.startswith("10."):
        return {"status": "invalid", "doi": doi, "http_status": None, "elapsed_ms": 0}

    url = f"{CROSSREF_URL}/{url_quote(normalized, safe='/')}"
    headers = {"User-Agent": f"CortexLab-Research/1.0 (mailto:{settings.OPENALEX_POLITE_EMAIL})"}
    started = time.perf_counter()
    result: Dict[str, Any] = {"doi": normalized, "http_status": None}

    try:
        if client:
            resp = await client.get(url, headers=headers, timeout=8.0)
        else:
            async with httpx.AsyncClient() as c:
                resp = await c.get(url, headers=headers, timeout=8.0)
        result["http_status"] = resp.status_code
        if resp.status_code == 404:
            result["status"] = "not_found"
        elif resp.status_code != 200:
            result["status"] = "unreachable"
        else:
            titles = (resp.json().get("message") or {}).get("title") or []
            crossref_title = titles[0] if titles else None
            result["crossref_title"] = crossref_title
            if expected_title and crossref_title:
                similarity = round(title_similarity(expected_title, crossref_title), 3)
                result["similarity"] = similarity
                result["status"] = "verified" if similarity >= TITLE_MATCH_THRESHOLD else "title_mismatch"
            else:
                result["status"] = "verified"
    except Exception as e:
        logger.warning(f"Crossref validation failed for DOI {doi}: {e}")
        result["status"] = "unreachable"
        result["error"] = type(e).__name__

    result["elapsed_ms"] = int((time.perf_counter() - started) * 1000)
    return result


async def validate_doi_with_crossref(doi: str, client: Optional[httpx.AsyncClient] = None) -> bool:
    """Boolean convenience wrapper: True only when Crossref confirms the DOI exists."""
    return (await verify_doi_crossref(doi, None, client))["status"] == "verified"


async def search_openalex(
    query: str,
    limit: int = 10,
    year_start: Optional[int] = None,
    year_end: Optional[int] = None,
    on_event: EventCallback = None,
) -> List[Paper]:
    """Queries OpenAlex Open Data API (polite pool) and reconstructs full abstracts."""
    papers: List[Paper] = []
    params: Dict[str, Any] = {
        "search": query,
        "per-page": limit,
        "mailto": settings.OPENALEX_POLITE_EMAIL,
    }
    if year_start or year_end:
        params["filter"] = f"publication_year:{year_start or ''}-{year_end or ''}"

    source = "OpenAlex"
    await _notify(on_event, "api_call_started", source, f"Consultando OpenAlex: {query}",
                  url=OPENALEX_URL, query=query, limit=limit)
    started = time.perf_counter()

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(OPENALEX_URL, params=params, timeout=15.0)
            elapsed = int((time.perf_counter() - started) * 1000)
            if resp.status_code != 200:
                await _notify(on_event, "api_call_failed", source,
                              f"OpenAlex respondeu HTTP {resp.status_code}",
                              http_status=resp.status_code, elapsed_ms=elapsed)
                return []

            data = resp.json()
            for item in data.get("results", []):
                title = (item.get("title") or "").strip()
                if not title:
                    continue  # untitled records cannot be screened or cited
                doi = clean_doi(item.get("doi"))
                authorships = item.get("authorships", [])
                authors = [
                    a["author"]["display_name"]
                    for a in authorships
                    if a.get("author") and a["author"].get("display_name")
                ]
                oa_info = item.get("open_access") or {}
                primary_loc = item.get("primary_location") or {}
                source_info = primary_loc.get("source") or {}
                abstract_text = reconstruct_abstract_from_inverted_index(item.get("abstract_inverted_index"))

                papers.append(
                    Paper(
                        id=f"openalex:{item.get('id')}",
                        doi=doi,
                        title=title,
                        authors=authors[:5],
                        year=item.get("publication_year"),
                        journal=source_info.get("display_name"),
                        abstract=abstract_text,
                        source_api="OpenAlex",
                        open_access_pdf_url=oa_info.get("oa_url"),
                        doi_verified=False,  # only Crossref can set this
                        citation_count=item.get("cited_by_count", 0),
                    )
                )
            await _notify(on_event, "api_call_finished", source,
                          f"OpenAlex retornou {len(papers)} registros",
                          count=len(papers), with_abstract=sum(1 for p in papers if p.abstract),
                          total_available=(data.get("meta") or {}).get("count"),
                          http_status=200, elapsed_ms=elapsed)
    except Exception as e:
        logger.error(f"Error querying OpenAlex: {e}")
        await _notify(on_event, "api_call_failed", source, f"Falha ao consultar OpenAlex: {type(e).__name__}",
                      error=str(e)[:200], elapsed_ms=int((time.perf_counter() - started) * 1000))

    return papers


async def search_europe_pmc(
    query: str,
    limit: int = 10,
    year_start: Optional[int] = None,
    year_end: Optional[int] = None,
    on_event: EventCallback = None,
) -> List[Paper]:
    """Queries Europe PMC REST API (indexes PubMed/MEDLINE, PMC and preprints)."""
    papers: List[Paper] = []
    effective_query = query
    if year_start or year_end:
        effective_query = f"({query}) AND (PUB_YEAR:[{year_start or 1900} TO {year_end or 2100}])"
    params = {
        "query": effective_query,
        "format": "json",
        "pageSize": limit,
        "resultType": "core",
    }

    source = EUROPE_PMC_LABEL
    await _notify(on_event, "api_call_started", source,
                  f"Consultando Europe PMC (PubMed/MEDLINE + PMC): {effective_query}",
                  url=EUROPE_PMC_URL, query=effective_query, limit=limit)
    started = time.perf_counter()

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(EUROPE_PMC_URL, params=params, timeout=15.0)
            elapsed = int((time.perf_counter() - started) * 1000)
            if resp.status_code != 200:
                await _notify(on_event, "api_call_failed", source,
                              f"Europe PMC respondeu HTTP {resp.status_code}",
                              http_status=resp.status_code, elapsed_ms=elapsed)
                return []

            data = resp.json()
            items = data.get("resultList", {}).get("result", [])
            for item in items:
                title = _strip_markup(item.get("title")).rstrip(".")
                if not title:
                    continue
                doi = clean_doi(item.get("doi"))
                author_str = item.get("authorString", "")
                authors = [a.strip() for a in author_str.split(",") if a.strip()]
                year = None
                if item.get("pubYear"):
                    try:
                        year = int(item.get("pubYear"))
                    except ValueError:
                        pass

                pdf_url = None
                if item.get("isOpenAccess") == "Y" and item.get("pmcid"):
                    pdf_url = f"https://www.ncbi.nlm.nih.gov/pmc/articles/{item.get('pmcid')}/pdf/"

                papers.append(
                    Paper(
                        id=f"europepmc:{item.get('id')}",
                        doi=doi,
                        title=title,
                        authors=authors[:5],
                        year=year,
                        journal=item.get("journalTitle"),
                        abstract=_strip_markup(item.get("abstractText")),
                        source_api="Europe PMC",
                        open_access_pdf_url=pdf_url,
                        doi_verified=False,  # only Crossref can set this
                        citation_count=item.get("citedByCount", 0),
                    )
                )
            await _notify(on_event, "api_call_finished", source,
                          f"Europe PMC retornou {len(papers)} registros",
                          count=len(papers), with_abstract=sum(1 for p in papers if p.abstract),
                          total_available=data.get("hitCount"),
                          http_status=200, elapsed_ms=elapsed)
    except Exception as e:
        logger.error(f"Error querying Europe PMC: {e}")
        await _notify(on_event, "api_call_failed", source, f"Falha ao consultar Europe PMC: {type(e).__name__}",
                      error=str(e)[:200], elapsed_ms=int((time.perf_counter() - started) * 1000))

    return papers


async def federated_literature_search(
    query: str,
    limit_per_source: int = 8,
    year_start: Optional[int] = None,
    year_end: Optional[int] = None,
    on_event: EventCallback = None,
) -> List[Paper]:
    """Executes parallel searches across OpenAlex and Europe PMC, deduplicating

    and cross-validating DOIs. Sources are interleaved so that truncating the result
    does not favour a single database.
    """
    results = await asyncio.gather(
        search_openalex(query, limit_per_source, year_start, year_end, on_event),
        search_europe_pmc(query, limit_per_source, year_start, year_end, on_event),
        return_exceptions=True,
    )
    source_lists = [res for res in results if isinstance(res, list)]

    all_papers: List[Paper] = []
    seen_dois = set()
    seen_titles = set()

    for paper in (p for group in itertools.zip_longest(*source_lists) for p in group if p is not None):
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
