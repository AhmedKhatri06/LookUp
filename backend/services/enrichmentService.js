import { generateEmailPatterns } from '../utils/emailPatterns.js';
import { validateEmail } from './emailValidator.js';
import { searchPublicSignals } from './osintService.js';
import { enrichWithSnov } from '../providers/snov.js';
import { enrichWithApollo } from '../providers/apollo.js';

import { performSearch } from '../routes/multiSearch.js';

/**
 * Attempt to find a corporate domain from a company name.
 */
async function findDomain(company) {
    if (!company || company.length < 2) return null;
    
    // Check if company already looks like a domain
    if (company.includes('.') && !company.includes(' ')) return company;

    console.log(`[Enrich] Discovering domain for: ${company.slice(0, 100)}...`);
    const cleanCompany = company.split(/[(),|]/)[0].trim().slice(0, 64);
    const results = await performSearch(`${cleanCompany} official website`, true).catch(() => []);
    if (results && results.length > 0) {
        // Look for the first clean corporate link
        for (const res of results) {
            const url = res.url || res.link || "";
            if (url.includes('linkedin.com') || url.includes('facebook.com') || url.includes('instagram.com')) continue;
            try {
                const domain = new URL(url).hostname.replace('www.', '');
                if (domain && domain.includes('.')) return domain;
            } catch (e) {}
        }
    }
    return null;
}

/**
 * Main enrichment orchestration engine.
 */
export async function enrichContact(name, company, domain = null) {
    let activeDomain = domain;
    if (!activeDomain && company) {
        activeDomain = await findDomain(company);
    }

    if (!activeDomain) {
        console.warn(`[Enrich] No domain found for ${name} at ${company}. Domain-dependent steps will be skipped.`);
    }

    const cacheKey = `${name}:${company}:${activeDomain || 'no-domain'}`.toLowerCase();
    
    let bestResult = null;
    let maxScore = 0;

    // 2. Free Layer: Pattern Matching & MX Check (Cost: 0) — requires domain
    if (activeDomain) {
        console.log(`[Enrich] Starting Pattern Discovery for ${name} @ ${activeDomain}...`);
        const patterns = generateEmailPatterns(name, activeDomain);
        const validations = await Promise.all(patterns.map(p => validateEmail(p)));
        
        for (let i = 0; i < validations.length; i++) {
            const v = validations[i];
            if (v.valid && v.mx) {
                const score = 40; // Base score for MX valid pattern
                if (score > maxScore) {
                    maxScore = score;
                    bestResult = {
                        email: patterns[i],
                        source: 'Pattern Discovery (MX Verified)',
                        confidence: score,
                        verificationStatus: 'verified'
                    };
                }
            }
        }
    }

    // 3. Free Layer: OSINT / Public Signals (Cost: 0) — runs REGARDLESS of domain
    // This is the critical path for individuals without corporate domains.
    if (maxScore < 70) {
        console.log(`[Enrich] Searching public signals for ${name}...`);
        const publicEmails = await searchPublicSignals(name, company, activeDomain);
        for (const email of publicEmails) {
            const v = await validateEmail(email);
            if (v.valid) {
                const score = v.mx ? 70 : 50;
                if (score > maxScore) {
                    maxScore = score;
                    bestResult = {
                        email,
                        source: 'Public Documents / OSINT',
                        confidence: score,
                        verificationStatus: v.mx ? 'verified' : 'found'
                    };
                }
            }
        }
    }

    // 4. Provider Waterfall (Cost: API Credits - Only if free layer is weak AND domain exists)
    if (maxScore < 70 && activeDomain) {
        console.log(`[Enrich] Free layers insufficient. Starting provider waterfall...`);
        
        const providers = [
            { name: 'Snov', fn: enrichWithSnov },
            { name: 'Apollo', fn: enrichWithApollo }
        ];

        for (const provider of providers) {
            console.log(`[Enrich] Trying ${provider.name}...`);
            const res = await provider.fn(name, activeDomain);
            if (res && res.email) {
                // Verify provider result if not already verified
                const v = await validateEmail(res.email);
                const score = (res.confidence || 70) + (v.mx ? 10 : 0);
                
                if (score > maxScore) {
                    maxScore = score;
                    bestResult = {
                        ...res,
                        confidence: score,
                        verificationStatus: v.mx ? 'verified' : res.verificationStatus
                    };
                }
                
                if (maxScore >= 80) break; // Stop waterfall if we have high confidence
            }
        }
    } else if (maxScore < 70 && !activeDomain) {
        console.log(`[Enrich] No domain available for provider waterfall. Relying on OSINT results.`);
    }

    if (bestResult && (bestResult.verificationStatus === 'verified' || (bestResult.confidence >= 70))) {
        return bestResult;
    }

    return {
        email: null,
        source: 'Not Found',
        confidence: 0,
        verificationStatus: 'not_found'
    };
}

export default { enrichContact };
