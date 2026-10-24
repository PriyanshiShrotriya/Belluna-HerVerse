import type { TranslatorSource } from '../../src/features/translator/types';

interface TrustedSource extends TranslatorSource {
  retrieved: string;
  reviewedBy: string;
  reviewedOn: string;
}

const trustedSources = [
  {
    id: 'who-menstrual-health',
    title: 'Menstrual health',
    publisher: 'World Health Organization',
    url: 'https://www.who.int/news-room/fact-sheets/detail/menstrual-health',
    retrieved: '2026-10-24',
    reviewedBy: 'Belluna healthcare-intelligence review',
    reviewedOn: '2026-10-24',
  },
  {
    id: 'who-endometriosis',
    title: 'Endometriosis',
    publisher: 'World Health Organization',
    url: 'https://www.who.int/news-room/fact-sheets/detail/endometriosis',
    retrieved: '2026-10-24',
    reviewedBy: 'Belluna healthcare-intelligence review',
    reviewedOn: '2026-10-24',
  },
  {
    id: 'who-polycystic-ovary-syndrome',
    title: 'Polycystic ovary syndrome',
    publisher: 'World Health Organization',
    url: 'https://www.who.int/news-room/fact-sheets/detail/polycystic-ovary-syndrome/',
    retrieved: '2026-10-24',
    reviewedBy: 'Belluna healthcare-intelligence review',
    reviewedOn: '2026-10-24',
  },
  {
    id: 'who-womens-health',
    title: "Women's health",
    publisher: 'World Health Organization',
    url: 'https://www.who.int/health-topics/women-s-health',
    retrieved: '2026-10-24',
    reviewedBy: 'Belluna healthcare-intelligence review',
    reviewedOn: '2026-10-24',
  },
  {
    id: 'medlineplus-health-topics',
    title: 'Health topics',
    publisher: 'MedlinePlus',
    url: 'https://www.medlineplus.gov/healthtopics.html',
    retrieved: '2026-10-24',
    reviewedBy: 'Belluna healthcare-intelligence review',
    reviewedOn: '2026-10-24',
  },
] satisfies readonly TrustedSource[];

const trustedSourceById = new Map(trustedSources.map((source) => [source.id, source]));

export const approvedSourceIds = trustedSources.map(({ id }) => id);

export function mapTrustedSources(sourceIds: readonly string[]): TranslatorSource[] {
  return [...new Set(sourceIds)]
    .map((id) => trustedSourceById.get(id))
    .filter((source): source is TrustedSource => source !== undefined)
    .map(({ id, title, publisher, url }) => ({ id, title, publisher, url }));
}
