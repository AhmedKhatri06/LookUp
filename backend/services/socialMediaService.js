// Social Media Discovery Service
const platformPriority = {
    'linkedin': 1,
    'github': 2,
    'twitter': 3,
    'x': 3,
    'instagram': 4,
    'facebook': 5
};

const profilePatterns = {
    // Exact profile matches or with query params
    instagram: /^https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9._-]+\/?(\?.*)?$/,
    // LinkedIn profiles - support regional subdomains (in.linkedin.com, uk.linkedin.com)
    linkedin: /^https?:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?(\?.*)?$/,
    github: /^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9_-]+\/?$/,
    // Twitter/X profiles
    twitter: /^https?:\/\/(www\.)?(twitter|x)\.com\/[a-zA-Z0-9_]+\/?(\?.*)?$/,
    // Facebook profiles/pages (support query params)
    facebook: /^https?:\/\/(www\.)?facebook\.com\/[a-zA-Z0-9._-]+\/?(\?.*)?$/
};

const disqualifyingPatterns = [
    'posted', 'shared', 'mentioned', 'tagged', 'commented', 'liked',
    'reposted', 'retweeted', 'photo by', 'video by', 'post by',
    'see photos', 'view profile of people named', 'search results',
    '/p/', '/posts/', '/status/', '/photos/', '/videos/', '/reel/', '/stories/',
    '/groups/', '/marketplace/', '/watch/', '/search/', '/events/'
];

function calculateIdentityScore(result, personName, keywords = [], location = '', targetEmails = [], targetPhones = []) {
    let score = 0;
    const title = (result.title || '').toLowerCase();
    const snippet = (result.snippet || result.text || '').toLowerCase();
    const link = (result.url || result.link || '').toLowerCase();
    const combinedText = `${title} ${snippet}`.toLowerCase();

    // ID ANCHORING: If we find a known email or phone, it's a guaranteed match (+100)
    const hasEmailMatch = targetEmails.some(email =>
        combinedText.includes(email.toLowerCase()) || link.includes(email.toLowerCase())
    );
    const hasPhoneMatch = targetPhones.some(phone => {
        const clean = phone.replace(/\D/g, '');
        return clean.length > 5 && (combinedText.includes(clean) || link.includes(clean));
    });

    if (hasEmailMatch || hasPhoneMatch) {
        console.log(`    [Identity Anchor] MATCH FOUND: ${hasEmailMatch ? 'Email' : 'Phone'} -> ${link}`);
        return 100;
    }

    // 1. Strict Name Matching (0-40 points)
    // We require at least TWO name parts to match for any non-anchored social profile
    const nameParts = personName.toLowerCase().split(/\s+/).filter(p => p.length > 2);
    if (nameParts.length < 2) return 0; // Prevent collisions on single common names

    let nameMatches = 0;
    nameParts.forEach(part => {
        if (title.includes(part) || link.includes(part)) nameMatches++;
    });

    if (nameMatches < 2) return 0; // Reject if only one name part matches (e.g., "Mihir" matches but not "Doshi")
    score += (nameMatches / nameParts.length) * 40;

    // 2. Company/Identity Core Match (0-50 points) - CRITICAL for Bug 3
    // Enforce matching for Company + Designation if markers are provided
    if (keywords && keywords.length > 0) {
        let keywordMatches = 0;
        const kwList = Array.isArray(keywords) ? keywords : [keywords];

        // Split markers into high-weight (Company) and medium-weight (Designation) if possible
        kwList.forEach(kw => {
            const lowerKw = kw.toLowerCase().trim();
            if (combinedText.includes(lowerKw)) {
                // Massive boost if company name matches perfectly in a social bio
                keywordMatches += 2;
            }
        });

        score += Math.min(keywordMatches * 25, 50);
    }

    // 3. Location Matching (0-10 points)
    if (location && (combinedText.includes(location.toLowerCase()) || link.includes(location.toLowerCase()))) {
        score += 10;
    }

    // 4. Business Page Penalty - CRITICAL for Bug 3 (The Commerce Team Global)
    const businessPatterns = ["global", "solutions", "team", "services", "corporate", "agency", "consulting"];
    const isLikelyBusiness = businessPatterns.some(p => link.includes(p) || title.includes(p));

    // Check if the title looks like a person's name or a company name
    const titleIsPersonal = title.includes(personName.toLowerCase());

    if (isLikelyBusiness && !titleIsPersonal && !combinedText.includes("founder") && !combinedText.includes("ceo")) {
        score -= 60; // Heavier penalty to ensure business pages are disqualified
    }

    return Math.round(score);
}

function containsDisqualifyingPattern(result) {
    const title = (result.title || '').toLowerCase();
    const snippet = (result.snippet || result.text || '').toLowerCase();
    const link = (result.url || result.link || '').toLowerCase();
    const combinedText = `${title} ${snippet} ${link}`;

    return disqualifyingPatterns.find(pattern => combinedText.includes(pattern));
}

function isValidProfileUrl(url, platform) {
    const pattern = profilePatterns[platform];
    if (!pattern) return false;
    return pattern.test(url);
}

export function extractSocialAccounts(internetResults, personName, keywords = [], location = '', targetEmails = [], targetPhones = []) {
    const socialAccounts = [];
    const seenUrls = new Set();

    console.log(`[Social Discovery] Analyzing ${internetResults.length} results for: ${personName}`);
    if (targetEmails.length > 0) console.log(`  Anchors: ${targetEmails.join(', ')}`);

    internetResults.forEach(result => {
        const link = result.url || result.link || '';
        if (!link) return;

        // Detect platform
        let platform = null;
        if (link.includes('linkedin.com')) platform = 'linkedin';
        else if (link.includes('github.com')) platform = 'github';
        else if (link.includes('twitter.com') || link.includes('x.com')) platform = 'twitter';
        else if (link.includes('instagram.com')) platform = 'instagram';
        else if (link.includes('facebook.com')) platform = 'facebook';

        if (!platform) return;

        // Validate profile URL
        if (!isValidProfileUrl(link, platform)) {
            console.log(`  [Skip] ${platform}: URL pattern mismatch -> ${link}`);
            return;
        }

        // Check for disqualifying patterns
        const disqualifier = containsDisqualifyingPattern(result);
        if (disqualifier) {
            console.log(`  [Skip] ${platform}: Found disqualifier "${disqualifier}" -> ${link}`);
            return;
        }

        // Calculate identity score with anchoring support
        const identityScore = calculateIdentityScore(result, personName, keywords, location, targetEmails, targetPhones);

        // Reject low confidence matches
        // SOFTENED: Lowered to 10 for better recall, relying on deduplication for accuracy
        if (identityScore < 10) {
            console.log(`  [Skip] ${platform}: Score too low (${identityScore}) -> ${link}`);
            return;
        }

        // Avoid duplicates
        if (seenUrls.has(link.split('?')[0].replace(/\/$/, ''))) return;
        seenUrls.add(link.split('?')[0].replace(/\/$/, ''));

        // Extract username
        let username = link.split('?')[0].split('/').filter(Boolean).pop();
        if (platform === 'linkedin' && (username === 'in' || username === 'pub')) {
            username = link.split('?')[0].split('/').filter(Boolean).slice(-2, -1)[0] || username;
        }

        console.log(`  [Found] ${platform}: ${username} [Score: ${identityScore}]`);

        socialAccounts.push({
            platform: platform.charAt(0).toUpperCase() + platform.slice(1),
            username,
            url: link,
            confidence: identityScore >= 65 ? 'high' : identityScore >= 45 ? 'medium' : 'low',
            identityScore,
            priority: platformPriority[platform] || 99
        });
    });

    // Sort by identity score (desc) then platform priority (asc)
    socialAccounts.sort((a, b) => {
        if (b.identityScore !== a.identityScore) {
            return b.identityScore - a.identityScore;
        }
        return a.priority - b.priority;
    });

    // Per-Platform Deduplication: Keep only the best match per platform
    const platformToBestAccount = new Map();
    socialAccounts.forEach(acc => {
        const platformKey = acc.platform.toLowerCase();
        if (!platformToBestAccount.has(platformKey)) {
            platformToBestAccount.set(platformKey, acc);
        }
    });

    const dedupedAccounts = Array.from(platformToBestAccount.values());

    console.log(`[Social Discovery] Final count (deduped): ${dedupedAccounts.length}`);
    return dedupedAccounts;
}

export { calculateIdentityScore };
