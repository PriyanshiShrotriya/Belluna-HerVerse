const ANONYMOUS_NOUNS = [
    'Moon', 'Bloom', 'River', 'Star', 'Cloud', 'Willow', 'Dawn', 'Rose',
    'Fern', 'Sky', 'Pearl', 'Wave', 'Clover', 'Rain', 'Sparrow', 'Iris',
];

function stableHash(value: string): number {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

export function anonymousAlias(authorHandle: string): string {
    const hash = stableHash(authorHandle);
    const noun = ANONYMOUS_NOUNS[hash % ANONYMOUS_NOUNS.length];
    return `Anonymous ${noun} ${hash.toString(36).slice(-4)}`;
}
