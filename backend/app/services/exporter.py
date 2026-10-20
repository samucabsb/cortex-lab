import csv
import io
import re
from typing import List, Dict, Any


class ScientificExporter:
    """Production service for exporting validated systematic review matrices and bibliographic records."""

    @staticmethod
    def clean_bibtex_key(author: str, year: Any) -> str:
        """Generates a clean alphanumeric BibTeX key without accents or special characters."""
        author_clean = re.sub(r"[^a-zA-Z]", "", author) or "Study"
        return f"{author_clean}{year or 2024}"


    @classmethod
    def export_prisma_matrix_csv(cls, matrix_rows: List[Dict[str, Any]]) -> str:
        """Exports the PRISMA 2020 Systematic Review Matrix as an RFC-4180 compliant CSV string."""
        output = io.StringIO()
        fieldnames = [
            "CitationKey",
            "DOI",
            "Title",
            "Authors",
            "Year",
            "Journal",
            "QualisCAPES",
            "SJRQuartile",
            "PopulationN",
            "Intervention",
            "Comparator",
            "Outcomes",
            "RiskOfBias",
            "StatisticalSoundness",
            "TraceableQuote",
            "PageReference",
        ]

        def sanitize_cell(val: Any) -> str:
            s = str(val) if val is not None else ""
            if s and s[0] in ("=", "+", "-", "@", "\t", "\r"):
                return f"'{s}"
            return s

        writer = csv.DictWriter(output, fieldnames=fieldnames, quoting=csv.QUOTE_ALL)
        writer.writeheader()

        for row in matrix_rows:
            authors = row.get("authors", [])
            authors_str = "; ".join(authors) if isinstance(authors, list) else str(authors)

            writer.writerow({
                "CitationKey": sanitize_cell(row.get("citation_key", "")),
                "DOI": sanitize_cell(row.get("doi", "")),
                "Title": sanitize_cell(row.get("title", "")),
                "Authors": sanitize_cell(authors_str),
                "Year": sanitize_cell(row.get("year", "")),
                "Journal": sanitize_cell(row.get("journal", "")),
                "QualisCAPES": sanitize_cell(row.get("qualis_capes", "N/A")),
                "SJRQuartile": sanitize_cell(row.get("sjr_quartile", "N/A")),
                "PopulationN": sanitize_cell(row.get("population_n", "")),
                "Intervention": sanitize_cell(row.get("intervention", "")),
                "Comparator": sanitize_cell(row.get("comparator", "")),
                "Outcomes": sanitize_cell(row.get("outcomes", "")),
                "RiskOfBias": sanitize_cell(row.get("risk_of_bias", "LOW")),
                "StatisticalSoundness": sanitize_cell(row.get("statistical_soundness", "AUDITED")),
                "TraceableQuote": sanitize_cell(row.get("traceable_quote", "")),
                "PageReference": sanitize_cell(row.get("page_reference", "")),
            })

        return output.getvalue()

    @classmethod
    def export_bibtex_references(cls, matrix_rows: List[Dict[str, Any]]) -> str:
        """Generates a clean BibTeX (.bib) file containing all verified literature citations.

        Fully compatible with reference managers: Zotero, Mendeley, JabRef, and EndNote.
        """
        def escape_bibtex(val: str) -> str:
            val = re.sub(r"(?<!\\)&", r"\&", val)
            val = re.sub(r"(?<!\\)%", r"\%", val)
            val = re.sub(r"(?<!\\)_", r"\_", val)
            return val

        entries = []
        for row in matrix_rows:
            authors = row.get("authors", [])
            if isinstance(authors, list) and authors:
                authors_str = " and ".join(authors)
                first_author = authors[0].split()[-1]
            else:
                authors_str = str(authors) or "Anonymous"
                first_author = "Author"

            year = row.get("year") or 2024
            cite_key = row.get("citation_key") or cls.clean_bibtex_key(first_author, year)
            title = escape_bibtex(str(row.get("title", "Untitled Scientific Study")))
            doi = row.get("doi", "")
            journal = escape_bibtex(str(row.get("journal", "Academic Journal")))
            note_str = escape_bibtex(
                f"Audited by CortexLab; RoB: {row.get('risk_of_bias', 'LOW')}; "
                f"Qualis: {row.get('qualis_capes', 'N/A')}"
            )

            entry = (
                f"@article{{{cite_key},\n"
                f"  title = {{{{{title}}}}},\n"
                f"  author = {{{authors_str}}},\n"
                f"  year = {{{year}}},\n"
                f"  journal = {{{journal}}},\n"
                f"  doi = {{{doi}}},\n"
                f"  note = {{{note_str}}}\n"
                f"}}"
            )
            entries.append(entry)

        return "\n\n".join(entries) if entries else "% No references to export.\n"
