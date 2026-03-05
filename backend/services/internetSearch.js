import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export async function searchInternet(query) {
    try {
        const data = JSON.stringify({
            "q": query,
            "num": 20
        });

        const config = {
            method: 'post',
            url: 'https://google.serper.dev/search',
            headers: {
                'X-API-KEY': process.env.SERPER_API_KEY,
                'Content-Type': 'application/json'
            },
            data: data
        };

        const response = await axios(config);
        const results = response.data?.organic || [];

        return results.map((item, index) => ({
            id: `google-${index}`,
            title: item.title,
            snippet: item.snippet,
            link: item.link,
            thumbnail: item.imageUrl, // Serper uses imageUrl
            source: 'Google'
        }));
    } catch (error) {
        console.error('Internet search failed:', error.response?.data || error.message);
        return [];
    }
}

/**
 * Standalone helper to rank an image based on metadata
 */
export function calculateImageScore(item, targetName = "", contextKeywords = []) {
    const title = (item.title || "").toLowerCase();
    const link = (item.link || item.url || "").toLowerCase();
    const imageUrl = (item.imageUrl || "").toLowerCase();
    const targetLower = targetName.toLowerCase();

    let score = 0;

    // 1. Name Match Scoring (Check title, source URL, and filename)
    if (targetName) {
        const nameParts = targetLower.split(' ').filter(p => p.length > 2);
        const matches = nameParts.filter(part => {
            // Regex to ensure it's a standalone word or part of a path (common for names in URLs)
            const regex = new RegExp(`\\b${part}\\b`, 'i');
            return regex.test(title) || link.includes(part) || imageUrl.includes(part);
        }).length;

        if (matches === nameParts.length) {
            score += 60; // Perfect name match (all parts)
        } else if (matches > 0) {
            score += (matches / nameParts.length) * 40;
        } else {
            score -= 30; // No name parts match at all
        }
    }

    // 2. Context-Aware Scoring (CRITICAL for resolving Name Collisions)
    if (contextKeywords && contextKeywords.length > 0) {
        const contextMatches = contextKeywords.filter(keyword => {
            const kw = keyword.toLowerCase();
            return title.includes(kw) || link.includes(kw);
        }).length;

        if (contextMatches > 0) {
            score += 30; // Boost for context match
        }
    }

    // 3. Platform Trust & Penalty
    // High Trust - likely person profiles
    if (link.includes("linkedin.com/in/")) score += 40;
    else if (link.includes("instagram.com") || link.includes("facebook.com")) score += 20;
    else if (link.includes("twitter.com") || link.includes("x.com") || link.includes("crunchbase.com")) score += 20;

    // Document Penalties - likely unrelated scans/PDFs
    const docSites = ["archive.org", "scribd.com", "academia.edu", "researchgate.net", "slideshare.net", "issuu.com", "pdf", "book", "memo", "census"];
    if (docSites.some(site => link.includes(site))) {
        score -= 70;
    }

    // 4. Aspect Ratio Filter (Optimized for Square/Profile Portraits)
    const width = item.imageWidth || 0;
    const height = item.imageHeight || 0;
    if (width > 0 && height > 0) {
        const ratio = width / height;
        if (ratio > 1.5) score -= 80; // Banner/Landscape (highly unlikely to be a profile shot)
        else if (ratio < 0.4) score -= 60; // Too narrow
        else if (ratio >= 0.8 && ratio <= 1.25) {
            // Square/Portrait - Good for faces
            score += 20;
            if (title.includes("profile") || title.includes("headshot") || title.includes("photo")) {
                score += 20;
            }
        }
    }

    // 5. Junk Keywords & Document Filtering
    const junkKeywords = [
        "profiles", "members", "team", "group", "directory", "staff", "faculty", "associates", "class of",
        "stock photo", "generic", "everyone", "people named", "community", "banner", "logo", "icon",
        "placeholder", "avatar", "default", "screenshot", "presentation", "slide", "event", "summit", "conference",
        "pdf", "census", "record", "memo", "document", "report", "manual", "publication", "article", "gazette",
        "town directory", "register", "graduate", "story", "rules", "film", "quarterly"
    ];

    const combinedLower = `${title} ${link} ${imageUrl}`.toLowerCase();
    if (junkKeywords.some(kw => combinedLower.includes(kw))) {
        score -= 60;
    }

    // 6. Face/Profile Boost
    const profileBoosters = ["profile", "face", "headshot", "portrait", "biography", "identity"];
    if (profileBoosters.some(kw => combinedLower.includes(kw))) {
        score += 15;
    }

    return score;
}

/**
 * Specialized Image Search using Serper.dev
 */
export async function searchImages(query, targetName = "", contextKeywords = []) {
    try {
        // SIMPLIFIED: Serper /images endpoint often rejects highly complex OR queries
        const data = JSON.stringify({
            "q": query,
            "num": 20
        });

        const config = {
            method: 'post',
            url: 'https://google.serper.dev/images',
            headers: {
                'X-API-KEY': process.env.SERPER_API_KEY,
                'Content-Type': 'application/json'
            },
            data: data
        };

        const response = await axios(config);
        const results = response.data?.images || [];

        // Apply scoring with context
        const scored = results.map(item => ({
            ...item,
            score: calculateImageScore(item, targetName, contextKeywords)
        }));

        // Filter and Sort by Confidence
        // SOFTENED: Lowered threshold to 10 to allow more results in while still filtering junk
        const filtered = scored
            .filter(item => item.score >= 10)
            .sort((a, b) => b.score - a.score);

        // FALLBACK: If we filtered too aggressively, take only the best ones that AT LEAST match the name
        if (filtered.length === 0 && results.length > 0) {
            const fallbackResults = scored
                .filter(item => item.score > -20) // Don't take absolute junk
                .slice(0, 3);

            if (fallbackResults.length > 0) {
                console.log(`[Image Discovery] Using limited fallback for: ${targetName}`);
                return fallbackResults.map((item, index) => ({
                    id: `image-fb-${index}`,
                    title: item.title,
                    imageUrl: item.imageUrl,
                    thumbnailUrl: item.thumbnailUrl,
                    sourceUrl: item.link,
                    source: 'Google Images (Selective Fallback)',
                    confidence: item.score
                }));
            }
            return []; // Better to show nothing than wrong documents
        }

        return filtered.map((item, index) => ({
            id: `image-${index}`,
            title: item.title,
            imageUrl: item.imageUrl,
            thumbnailUrl: item.thumbnailUrl,
            sourceUrl: item.link,
            source: 'Google Images',
            confidence: item.score
        }));
    } catch (error) {
        console.error('Image search failed:', error.response?.data || error.message);
        return [];
    }
}
