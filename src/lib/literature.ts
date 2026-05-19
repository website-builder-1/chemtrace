/**
 * Literature search via CrossRef REST API (no key required).
 * https://api.crossref.org/swagger-ui/index.html
 */

export interface Citation {
  doi: string;
  title: string;
  authors: string;
  journal: string;
  year: number | null;
  url: string;
}

interface CrossRefItem {
  DOI: string;
  title?: string[];
  author?: { given?: string; family?: string }[];
  'container-title'?: string[];
  issued?: { 'date-parts'?: number[][] };
  URL?: string;
}

export async function searchLiterature(query: string, rows = 5): Promise<Citation[]> {
  try {
    const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=${rows}&select=DOI,title,author,container-title,issued,URL&filter=type:journal-article`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return [];
    const data = await res.json();
    const items: CrossRefItem[] = data?.message?.items || [];
    return items.map(it => {
      const authors = (it.author || [])
        .slice(0, 3)
        .map(a => [a.given, a.family].filter(Boolean).join(' '))
        .join(', ') + ((it.author?.length ?? 0) > 3 ? ', et al.' : '');
      const year = it.issued?.['date-parts']?.[0]?.[0] ?? null;
      return {
        doi: it.DOI,
        title: it.title?.[0] || '(untitled)',
        authors: authors || 'Unknown authors',
        journal: it['container-title']?.[0] || '',
        year,
        url: it.URL || `https://doi.org/${it.DOI}`,
      };
    });
  } catch {
    return [];
  }
}

/** Build a focused query string for a molecule + route. */
export function buildQuery(moleculeName: string, routeName: string): string {
  // Strip route prefixes that confuse CrossRef
  const cleanRoute = routeName.replace(/\s*\([^)]*\)\s*/g, '').trim();
  return `${moleculeName} synthesis ${cleanRoute}`;
}