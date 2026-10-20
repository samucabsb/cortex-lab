import csv
import io
import re
from typing import List, Dict, Any

NOT_FOUND = "not_found"


class ScientificExporter:
    """Production service for exporting validated systematic review matrices and bibliographic records."""

    @staticmethod
    def clean_bibtex_key(author: str, year: Any) -> str:
        """Generates a clean alphanumeric BibTeX key without accents or special characters."""
        author_clean = re.sub(r"[^a-zA-Z]", "", author) or "Anon"
        return f"{author_clean}{year or 'nd'}"

    @classmethod
    def export_prisma_matrix_csv(cls, matrix_rows: List[Dict[str, Any]]) -> str:
        """Exports the PRISMA 2020 Systematic Review Matrix as an RFC-4180 compliant CSV string.

        Missing values are written as ``not_found`` - never as an invented default.
        """
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
            s = str(val) if val not in (None, "", []) else NOT_FOUND
            if s and s[0] in ("=", "+", "-", "@", "\t", "\r"):
                return f"'{s}"
            return s

        writer = csv.DictWriter(output, fieldnames=fieldnames, quoting=csv.QUOTE_ALL)
        writer.writeheader()

        for row in matrix_rows:
            authors = row.get("authors") or []
            authors_str = "; ".join(authors) if isinstance(authors, list) else str(authors)

            writer.writerow({
                "CitationKey": sanitize_cell(row.get("citation_key")),
                "DOI": sanitize_cell(row.get("doi")),
                "Title": sanitize_cell(row.get("title")),
                "Authors": sanitize_cell(authors_str),
                "Year": sanitize_cell(row.get("year")),
                "Journal": sanitize_cell(row.get("journal")),
                "QualisCAPES": sanitize_cell(row.get("qualis_capes")),
                "SJRQuartile": sanitize_cell(row.get("sjr_quartile")),
                "PopulationN": sanitize_cell(row.get("population_n")),
                "Intervention": sanitize_cell(row.get("intervention")),
                "Comparator": sanitize_cell(row.get("comparator")),
                "Outcomes": sanitize_cell(row.get("outcomes")),
                "RiskOfBias": sanitize_cell(row.get("risk_of_bias")),
                "StatisticalSoundness": sanitize_cell(row.get("statistical_soundness")),
                "TraceableQuote": sanitize_cell(row.get("traceable_quote")),
                "PageReference": sanitize_cell(row.get("page_reference")),
            })

        return output.getvalue()

    @classmethod
    def export_bibtex_references(cls, matrix_rows: List[Dict[str, Any]]) -> str:
        """Generates a clean BibTeX (.bib) file containing all verified literature citations.

        Fully compatible with reference managers: Zotero, Mendeley, JabRef, and EndNote.
        Fields the source did not provide are omitted rather than filled with placeholders.
        """
        def escape_bibtex(val: str) -> str:
            val = re.sub(r"(?<!\\)&", r"\&", val)
            val = re.sub(r"(?<!\\)%", r"\%", val)
            val = re.sub(r"(?<!\\)_", r"\_", val)
            return val

        entries = []
        for row in matrix_rows:
            authors = row.get("authors") or []
            first_author = authors[0].split()[-1] if authors else "Anon"
            year = row.get("year")
            cite_key = row.get("citation_key") or cls.clean_bibtex_key(first_author, year)

            fields = []
            if row.get("title"):
                fields.append(f"  title = {{{{{escape_bibtex(str(row['title']))}}}}}")
            if authors:
                fields.append(f"  author = {{{escape_bibtex(' and '.join(authors))}}}")
            if year:
                fields.append(f"  year = {{{year}}}")
            if row.get("journal"):
                fields.append(f"  journal = {{{escape_bibtex(str(row['journal']))}}}")
            if row.get("doi"):
                fields.append(f"  doi = {{{row['doi']}}}")
            note_str = escape_bibtex(f"Extracted by CortexLab from the abstract; RoB: {row.get('risk_of_bias', NOT_FOUND)}")
            fields.append(f"  note = {{{note_str}}}")

            entries.append(f"@article{{{cite_key},\n" + ",\n".join(fields) + "\n}")

        return "\n\n".join(entries) if entries else "% No references to export.\n"
