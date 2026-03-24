/**
 * instagramMatcher.js — Instagram identity matching module.
 * 
 * Generates username variations from a person's name and available identity hints,
 * then scores candidate Instagram profiles against the searched identity.
 * 
 * This is a lightweight, login-free module that uses OSINT techniques
 * inspired by the "yesitsme" approach.
 */

/**
 * Generate potential Instagram username variations from a name.
 * @param {string} fullName - The person's full name
 * @param {Object} [hints] - Optional identity hints
 * @param {string} [hints.email] - Email address
 * @param {string} [hints.phone] - Phone number
 * @param {string} [hints.company] - Company name
 * @returns {string[]} Array of potential usernames
 */
export function generateUsernameVariations(fullName, hints = {}) {
    if (!fullName || typeof fullName !== 'string') return [];

    const parts = fullName.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return [];

    const first = parts[0];
    const last = parts[parts.length - 1];
    const middle = parts.length > 2 ? parts.slice(1, -1) : [];
    const firstInitial = first[0];
    const lastInitial = last[0];

    const variations = new Set();

    // Core patterns
    variations.add(`${first}${last}`);              // firstlast
    variations.add(`${first}.${last}`);             // first.last
    variations.add(`${first}_${last}`);             // first_last
    variations.add(`${last}${first}`);              // lastfirst
    variations.add(`${last}.${first}`);             // last.first
    variations.add(`${last}_${first}`);             // last_first
    variations.add(`${firstInitial}${last}`);       // flast
    variations.add(`${first}${lastInitial}`);       // firstl
    variations.add(`${firstInitial}.${last}`);      // f.last
    variations.add(`${firstInitial}_${last}`);      // f_last
    variations.add(`${first}`);                     // first (common for unique names)
    variations.add(`${last}`);                      // last

    // With middle name/initial
    if (middle.length > 0) {
        const mid = middle[0];
        const midInitial = mid[0];
        variations.add(`${first}${mid}${last}`);
        variations.add(`${first}.${mid}.${last}`);
        variations.add(`${first}${midInitial}${last}`);
    }

    // Common suffixes
    const suffixes = ['_official', 'official', '_real', 'real', '_ig', '_insta'];
    suffixes.forEach(suffix => {
        variations.add(`${first}${last}${suffix}`);
        variations.add(`${first}.${last}${suffix}`);
    });

    // Numeric patterns (year-based)
    for (let year = 90; year <= 99; year++) {
        variations.add(`${first}${last}${year}`);
        variations.add(`${first}_${last}${year}`);
    }
    for (let year = 0; year <= 5; year++) {
        variations.add(`${first}${last}0${year}`);
    }

    // Email-based hints
    if (hints.email) {
        const emailUser = hints.email.split('@')[0].toLowerCase();
        variations.add(emailUser);
        variations.add(emailUser.replace(/[._]/g, ''));
    }

    // Company-based hints
    if (hints.company) {
        const company = hints.company.toLowerCase().replace(/\s+/g, '');
        variations.add(`${first}_${company}`);
        variations.add(`${first}${company}`);
    }

    return [...variations];
}

/**
 * Calculate a weighted similarity score between a candidate profile and the searched identity.
 * @param {Object} candidate - The candidate Instagram profile
 * @param {string} candidate.username - Instagram username
 * @param {string} [candidate.fullName] - Display name on the profile
 * @param {string} [candidate.bio] - Profile bio text
 * @param {string} [candidate.url] - Profile URL
 * @param {Object} searchIdentity - The searched person's identity
 * @param {string} searchIdentity.name - Full name
 * @param {string[]} [searchIdentity.variations] - Pre-generated username variations
 * @param {string} [searchIdentity.company] - Company
 * @param {string} [searchIdentity.location] - Location
 * @param {string} [searchIdentity.email] - Email
 * @returns {Object} { score: number, confidence: string, breakdown: Object }
 */
export function scoreCandidate(candidate, searchIdentity) {
    let score = 0;
    const breakdown = {
        nameSimilarity: 0,
        usernameAlignment: 0,
        contextualAlignment: 0,
        identityHints: 0
    };

    const searchName = (searchIdentity.name || '').toLowerCase().trim();
    const candidateUsername = (candidate.username || '').toLowerCase().trim();
    const candidateFullName = (candidate.fullName || '').toLowerCase().trim();
    const candidateBio = (candidate.bio || '').toLowerCase().trim();

    // --- 1. Name Similarity (Max 40 pts) ---
    if (candidateFullName && searchName) {
        // Exact match
        if (candidateFullName === searchName) {
            breakdown.nameSimilarity = 40;
        }
        // Contains full name
        else if (candidateFullName.includes(searchName) || searchName.includes(candidateFullName)) {
            breakdown.nameSimilarity = 35;
        }
        // Both first and last name appear
        else {
            const searchParts = searchName.split(/\s+/);
            const matchedParts = searchParts.filter(part =>
                candidateFullName.includes(part) || candidateBio.includes(part)
            );
            const ratio = matchedParts.length / searchParts.length;
            breakdown.nameSimilarity = Math.round(ratio * 30);
        }
    }
    // Check bio for name if no display name
    else if (candidateBio && searchName) {
        const searchParts = searchName.split(/\s+/);
        const matchedParts = searchParts.filter(part => candidateBio.includes(part));
        const ratio = matchedParts.length / searchParts.length;
        breakdown.nameSimilarity = Math.round(ratio * 25);
    }

    // --- 2. Username Alignment (Max 20 pts) ---
    const variations = searchIdentity.variations || generateUsernameVariations(searchName);

    if (variations.includes(candidateUsername)) {
        breakdown.usernameAlignment = 20;
    } else {
        // Partial match — check if username contains key name parts
        const nameParts = searchName.split(/\s+/);
        const matchingParts = nameParts.filter(part =>
            candidateUsername.includes(part.replace(/[^a-z0-9]/g, ''))
        );
        if (matchingParts.length > 0) {
            breakdown.usernameAlignment = Math.round((matchingParts.length / nameParts.length) * 15);
        }
    }

    // --- 3. Contextual Alignment (Max 30 pts) ---
    if (searchIdentity.company && candidateBio) {
        const company = searchIdentity.company.toLowerCase();
        if (candidateBio.includes(company)) {
            breakdown.contextualAlignment += 15;
        }
    }
    if (searchIdentity.location && candidateBio) {
        const location = searchIdentity.location.toLowerCase();
        const locationParts = location.split(/[,\s]+/).filter(p => p.length > 2);
        const locMatches = locationParts.filter(part => candidateBio.includes(part));
        if (locMatches.length > 0) {
            breakdown.contextualAlignment += 10;
        }
    }
    // Professional keyword markers
    const professionalMarkers = ['ceo', 'founder', 'engineer', 'developer', 'designer', 'manager', 'director', 'analyst', 'consultant'];
    if (candidateBio) {
        const hasMarker = professionalMarkers.some(marker => candidateBio.includes(marker));
        if (hasMarker) {
            breakdown.contextualAlignment += 5;
        }
    }

    // --- 4. Identity Hints (Max 10 pts) ---
    if (searchIdentity.email && candidateBio) {
        const emailUser = searchIdentity.email.split('@')[0].toLowerCase();
        if (candidateBio.includes(emailUser) || candidateUsername.includes(emailUser.replace(/[._]/g, ''))) {
            breakdown.identityHints = 10;
        }
    }

    // Total score
    score = breakdown.nameSimilarity + breakdown.usernameAlignment
        + breakdown.contextualAlignment + breakdown.identityHints;

    // Confidence classification
    let confidence;
    if (score >= 70) confidence = 'High';
    else if (score >= 40) confidence = 'Medium';
    else confidence = 'Low';

    return { score, confidence, breakdown };
}

/**
 * Match scored Instagram profiles from search results against a searched identity.
 * @param {Array} searchResults - Raw search results that may contain Instagram URLs
 * @param {Object} identity - Searched person identity
 * @param {string} identity.name - Full name
 * @param {string} [identity.company] - Company
 * @param {string} [identity.location] - Location
 * @param {string} [identity.email] - Email
 * @returns {Array} Ranked Instagram candidates with scores
 */
export function matchInstagramProfiles(searchResults, identity) {
    if (!searchResults || !identity || !identity.name) return [];

    const variations = generateUsernameVariations(identity.name, {
        email: identity.email,
        company: identity.company
    });

    const igPattern = /instagram\.com\/([^/?#\s]+)/i;
    const candidates = [];
    const seenUsernames = new Set();

    searchResults.forEach(result => {
        const url = result.url || result.link || '';
        const match = url.match(igPattern);

        if (match && match[1]) {
            const username = match[1].toLowerCase();
            // Skip common non-profile paths
            if (['p', 'explore', 'reels', 'stories', 'accounts', 'about', 'developer'].includes(username)) return;
            if (seenUsernames.has(username)) return;
            seenUsernames.add(username);

            const candidate = {
                username,
                fullName: result.title || '',
                bio: result.snippet || result.text || '',
                url: `https://www.instagram.com/${username}/`,
                thumbnail: result.thumbnail || null
            };

            const { score, confidence, breakdown } = scoreCandidate(candidate, {
                ...identity,
                variations
            });

            candidates.push({
                ...candidate,
                score,
                confidence,
                breakdown,
                platform: 'Instagram'
            });
        }
    });

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    return candidates;
}
