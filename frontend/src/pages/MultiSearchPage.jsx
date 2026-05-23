import { useEffect, useState, useRef, useCallback, useContext } from "react";
import "../index.css";
import LivePreviewViewer from "../components/LivePreviewViewer";
import AuthModal from "../components/AuthModal";
import { AuthContext } from "../context/AuthContext";
import ReactMarkdown from 'react-markdown';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Helper: Identify synthetic/placeholder data patterns that should NEVER be used for merging or displayed as 'Verified'
const isPlaceholder = (value) => {
    if (!value) return true;
    const v = value.toLowerCase().trim();
    return v.includes('noemail.com') ||
        v.includes('example.com') ||
        v.includes('test.com') ||
        v.startsWith('+00') ||
        v === 'not found' ||
        v === 'unknown' ||
        v === '****@****';
};

const getPlatformEmoji = (platform) => {
    if (!platform) return '🔗';
    const p = platform.toLowerCase();
    if (p.includes('linkedin')) return '💼';
    if (p.includes('github')) return '💻';
    if (p.includes('twitter') || p.includes('x')) return '🐦';
    if (p.includes('instagram')) return '📸';
    if (p.includes('facebook')) return '👥';
    if (p.includes('telegram') || p.includes('t.me')) return '🛡️';
    if (p.includes('tiktok')) return '🎵';
    if (p.includes('pinterest')) return '📌';
    if (p.includes('youtube')) return '📺';
    if (p.includes('snapchat')) return '👻';
    if (p.includes('reddit')) return '👽';
    if (p.includes('wikipedia')) return '📚';
    if (p.includes('britannica')) return '🏛️';
    if (p.includes('crunchbase')) return '🏢';
    if (p.includes('medium')) return '📝';
    if (p.includes('stack')) return '🏗️';
    if (p.includes('behance')) return '🎨';
    if (p.includes('dribbble')) return '🏀';
    if (p.includes('linktr')) return '🌳';
    if (p.includes('aboutme')) return '👤';
    return '🔗';
};

const LoadingChecklist = ({ stage, STAGES, progress, currentStep, onCancel, query, personaName }) => {
    let title = "Processing Intelligence...";
    let loadingMessages = [
        "Initializing scan",
        "Searching records",
        "Analyzing signals",
        "Extracting deep intelligence",
        "Generating report"
    ];

    if (stage === STAGES.IDENTIFYING) {
        title = "Discovering Identities...";
    } else if (stage === STAGES.REFINING) {
        title = "Refining Selection...";
        loadingMessages = [
            "Analyzing choice",
            "Pivoting search",
            "Refining metadata",
            "Improving matches",
            "Updating results"
        ];
    } else if (stage === STAGES.DEEP_LOADING) {
        title = "Acquiring Deep Intel...";
        loadingMessages = [
            "Handshaking socials",
            "Querying archives",
            "Dorking documents",
            "Aggregating data",
            "Finalizing dossier"
        ];
    }

    const clampedProgress = Math.min(Math.floor(progress), 100);

    return (
        <div className="workflow-loading-screen modern-glass-mode">
            <div className="ambient-glow-bg"></div>
            <div className="ambient-glow-bg glow-secondary"></div>

            <button className="cancel-pill" onClick={onCancel} title="Cancel Search">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Cancel</span>
            </button>

            <div className="floating-intelligence-pill">
                {/* Header with Stage Info */}
                <div className="pill-header">
                    <span className="pill-badge">{title}</span>
                </div>

                {/* Scan Ring + Orb */}
                <div className="scan-ring-container">
                    <svg className="scan-ring-svg" viewBox="0 0 120 120">
                        <circle className="scan-ring-track" cx="60" cy="60" r="54" />
                        <circle
                            className="scan-ring-fill"
                            cx="60" cy="60" r="54"
                            strokeDasharray={`${clampedProgress * 3.39} ${339.29 - clampedProgress * 3.39}`}
                            strokeDashoffset="84.82"
                        />
                    </svg>
                    <div className="scan-orb">
                        <div className="scan-orb-pulse"></div>
                        <div className="scan-orb-core"></div>
                    </div>
                </div>

                {/* Target Identity */}
                <div className="pill-identity-block">
                    <h2 className="pill-target-name">{personaName || query}</h2>
                </div>

                {/* Progress Bar */}
                <div className="pill-progress-section">
                    <div className="liquid-progress-container">
                        <div className="liquid-progress-fill" style={{ width: `${clampedProgress}%` }}>
                            <div className="progress-shimmer"></div>
                        </div>
                    </div>

                    <div className="pill-meta-row">
                        <div className="pill-status-message">
                            <span className="status-dot"></span>
                            <span className="status-text">{loadingMessages[currentStep] || "Processing..."}</span>
                        </div>
                        <div className="pill-percentage-bubble">
                            {clampedProgress}%
                        </div>
                    </div>
                </div>

                {/* Step Indicators */}
                <div className="pill-steps-row">
                    {loadingMessages.map((msg, idx) => (
                        <div key={idx} className={`step-pip ${idx < currentStep ? 'completed' : ''} ${idx === currentStep ? 'active' : ''}`}>
                            <div className="pip-dot"></div>
                            {idx < loadingMessages.length - 1 && <div className="pip-connector"></div>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const MultiSearchPage = () => {
    // Workflow Stages
    const STAGES = {
        ENTRY: "ENTRY",
        IDENTIFYING: "IDENTIFYING",
        SELECTING: "SELECTING",
        REFINING: "REFINING",
        CONFIRMING: "CONFIRMING",
        ENRICHING: "ENRICHING",
        DEEP_LOADING: "DEEP_LOADING",
        DASHBOARD: "DASHBOARD"
    };

    const SEARCH_MODES = {
        GENERAL: "GENERAL",
        PHONE: "PHONE"
    };

    const COUNTRIES = [
        { code: 'US', name: 'United States', flag: '🇺🇸', prefix: '+1' },
        { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', prefix: '+44' },
        { code: 'IN', name: 'India', flag: '🇮🇳', prefix: '+91' },
        { code: 'CA', name: 'Canada', flag: '🇨🇦', prefix: '+1' },
        { code: 'AU', name: 'Australia', flag: '🇦🇺', prefix: '+61' },
        { code: 'DE', name: 'Germany', flag: '🇩🇪', prefix: '+49' },
        { code: 'FR', name: 'France', flag: '🇫🇷', prefix: '+33' },
        { code: 'IT', name: 'Italy', flag: '🇮🇹', prefix: '+39' },
        { code: 'ES', name: 'Spain', flag: '🇪🇸', prefix: '+34' },
        { code: 'BR', name: 'Brazil', flag: '🇧🇷', prefix: '+55' },
        { code: 'MX', name: 'Mexico', flag: '🇲🇽', prefix: '+52' },
        { code: 'CN', name: 'China', flag: '🇨🇳', prefix: '+86' },
        { code: 'JP', name: 'Japan', flag: '🇯🇵', prefix: '+81' },
        { code: 'KR', name: 'South Korea', flag: '🇰🇷', prefix: '+82' },
        { code: 'RU', name: 'Russia', flag: '🇷🇺', prefix: '+7' },
        { code: 'ZA', name: 'South Africa', flag: '🇿🇦', prefix: '+27' },
        { code: 'NG', name: 'Nigeria', flag: '🇳🇬', prefix: '+234' },
        { code: 'EG', name: 'Egypt', flag: '🇪🇬', prefix: '+20' },
        { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', prefix: '+966' },
        { code: 'AE', name: 'UAE', flag: '🇦🇪', prefix: '+971' },
        { code: 'SG', name: 'Singapore', flag: '🇸🇬', prefix: '+65' },
        { code: 'MY', name: 'Malaysia', flag: '🇲🇾', prefix: '+60' },
        { code: 'ID', name: 'Indonesia', flag: '🇮🇩', prefix: '+62' },
        { code: 'TH', name: 'Thailand', flag: '🇹🇭', prefix: '+66' },
        { code: 'VN', name: 'Vietnam', flag: '🇻🇳', prefix: '+84' },
        { code: 'PH', name: 'Philippines', flag: '🇵🇭', prefix: '+63' },
        { code: 'PK', name: 'Pakistan', flag: '🇵🇰', prefix: '+92' },
        { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', prefix: '+880' },
        { code: 'TR', name: 'Turkey', flag: '🇹🇷', prefix: '+90' },
        { code: 'NL', name: 'Netherlands', flag: '🇳🇱', prefix: '+31' },
        { code: 'BE', name: 'Belgium', flag: '🇧🇪', prefix: '+32' },
        { code: 'CH', name: 'Switzerland', flag: '🇨🇭', prefix: '+41' },
        { code: 'AT', name: 'Austria', flag: '🇦🇹', prefix: '+43' },
        { code: 'SE', name: 'Sweden', flag: '🇸🇪', prefix: '+46' },
        { code: 'NO', name: 'Norway', flag: '🇳🇴', prefix: '+47' },
        { code: 'DK', name: 'Denmark', flag: '🇩🇰', prefix: '+45' },
        { code: 'FI', name: 'Finland', flag: '🇫🇮', prefix: '+358' },
        { code: 'IE', name: 'Ireland', flag: '🇮🇪', prefix: '+353' },
        { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', prefix: '+64' },
        { code: 'AR', name: 'Argentina', flag: '🇦🇷', prefix: '+54' },
        { code: 'CL', name: 'Chile', flag: '🇨🇱', prefix: '+56' },
        { code: 'CO', name: 'Colombia', flag: '🇨🇴', prefix: '+57' },
        { code: 'PE', name: 'Peru', flag: '🇵🇪', prefix: '+51' },
        { code: 'PT', name: 'Portugal', flag: '🇵🇹', prefix: '+351' },
        { code: 'GR', name: 'Greece', flag: '🇬🇷', prefix: '+30' },
        { code: 'PL', name: 'Poland', flag: '🇵🇱', prefix: '+48' },
        { code: 'RO', name: 'Romania', flag: '🇷🇴', prefix: '+40' },
        { code: 'HU', name: 'Hungary', flag: '🇭🇺', prefix: '+36' },
        { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿', prefix: '+420' },
        { code: 'UA', name: 'Ukraine', flag: '🇺🇦', prefix: '+380' }
    ].sort((a, b) => b.prefix.length - a.prefix.length); // Match longest prefix first

    const [stage, setStage] = useState(() => localStorage.getItem("lookup-stage") || STAGES.ENTRY);
    const [searchMode, setSearchMode] = useState(SEARCH_MODES.GENERAL);
    const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
    const [showCountryDropdown, setShowCountryDropdown] = useState(false);
    const [query, setQuery] = useState(() => localStorage.getItem("search-query") || "");
    const [globalKeyword, setGlobalKeyword] = useState(() => localStorage.getItem("search-keyword") || "");
    const [data, setData] = useState(null);
    const [candidates, setCandidates] = useState(() => {
        const saved = localStorage.getItem("nexa-candidates");
        return saved ? JSON.parse(saved) : [];
    });
    const [loading, setLoading] = useState(false);
    const [deepData, setDeepData] = useState(() => {
        const saved = localStorage.getItem("nexa-deep-data");
        return saved ? JSON.parse(saved) : null;
    });
    const [recent, setRecent] = useState([]);
    const [showAllDocuments, setShowAllDocuments] = useState(false);
    const countryDropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target)) {
                setShowCountryDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const [manualCountry, setManualCountry] = useState(false);

    // Auto-Country Detection & Auto-Switch to Phone Mode
    useEffect(() => {
        if (manualCountry) return; // Stop auto-detect if user manually selected

        if (searchMode === SEARCH_MODES.GENERAL) {
            // Auto switch to phone mode if they type a plus followed by numbers
            if (query.startsWith('+') && query.length > 2 && /^\+\d+/.test(query.replace(/\s/g, ''))) {
                setSearchMode(SEARCH_MODES.PHONE);

                // Try to detect country
                const matched = COUNTRIES.find(c => query.startsWith(c.prefix));
                if (matched) setSelectedCountry(matched);
            }
        }
    }, [query, searchMode, COUNTRIES, manualCountry]);


    // Stage 6: Preview Modal
    const [previewUrl, setPreviewUrl] = useState(null);
    const [previewPlatform, setPreviewPlatform] = useState("");
    const [previewIsSocial, setPreviewIsSocial] = useState(false);
    const [isLiveView, setIsLiveView] = useState(false);

    // Feedback Form State
    const [showFeedbackForm, setShowFeedbackForm] = useState(false);
    const [feedbackData, setFeedbackData] = useState({ name: "", keyword: "", location: "" });
    const [savingFeedback, setSavingFeedback] = useState(false);

    // Progress Simulation State
    const [loadProgress, setLoadProgress] = useState(0);
    const [currentStep, setCurrentStep] = useState(0);
    const [revealedNumbers, setRevealedNumbers] = useState(new Set());
    const [expandedCards, setExpandedCards] = useState(new Set());
    const [overflowingCards, setOverflowingCards] = useState(new Set());

    const { user, logout } = useContext(AuthContext);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const abortControllerRef = useRef(null);

    // B-001: Extract Search Parameters Automatically=
    const cardRefs = useRef({});

    const checkCardOverflows = useCallback(() => {
        const newOverflowing = new Set();
        Object.entries(cardRefs.current).forEach(([idx, el]) => {
            if (el && el.scrollHeight > 200) {
                newOverflowing.add(Number(idx));
            }
        });
        setOverflowingCards(newOverflowing);
    }, []);

    useEffect(() => {
        if (candidates.length > 0) {
            // Small delay to let DOM render
            const timer = setTimeout(checkCardOverflows, 100);
            return () => clearTimeout(timer);
        }
    }, [candidates, checkCardOverflows]);

    const toggleReveal = (phone) => {
        setRevealedNumbers(prev => {
            const next = new Set(prev);
            if (next.has(phone)) next.delete(phone);
            else next.add(phone);
            return next;
        });
    };

    const maskPhone = (phone) => {
        if (!phone || isPlaceholder(phone)) return "";
        const clean = phone.replace(/\D/g, "");
        if (clean.length <= 4) return "****";
        return `+${clean.slice(0, 2)} ******${clean.slice(-4)}`;
    };

    const maskEmail = (email) => {
        if (!email || isPlaceholder(email)) return "";
        const [user, domain] = email.split("@");
        if (!domain) return "****@****";
        return user.slice(0, 2) + "******@" + domain;
    };

    // Unified Progress & Step Logic
    useEffect(() => {
        let interval;
        if (stage === STAGES.IDENTIFYING || stage === STAGES.REFINING || stage === STAGES.DEEP_LOADING) {
            interval = setInterval(() => {
                setLoadProgress(prev => {
                    const target = stage === STAGES.IDENTIFYING ? 48.5 : (stage === STAGES.REFINING ? 78.5 : 99.2);
                    if (prev < target) {
                        const remaining = target - prev;
                        // Move 5% of the remaining distance or at least a tiny random amount
                        const step = Math.max(remaining * 0.05, Math.random() * 0.1);
                        return Math.min(prev + step, 99.9);
                    }
                    // If somehow at or past target, move by tiny micro-increments
                    return Math.min(prev + 0.01, 99.9);
                });
            }, 200);
        } else {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [stage]);

    // Update currentStep based on progress
    useEffect(() => {
        if (loadProgress < 20) setCurrentStep(0);
        else if (loadProgress < 40) setCurrentStep(1);
        else if (loadProgress < 60) setCurrentStep(2);
        else if (loadProgress < 80) setCurrentStep(3);
        else setCurrentStep(4);
    }, [loadProgress]);

    // History Synchronization & Mount Setup
    useEffect(() => {
        // Initialize base history state on mount
        if (!window.history.state || !window.history.state.stage) {
            window.history.replaceState({ stage: STAGES.ENTRY }, "", window.location.pathname);
        }

        const handlePopState = (event) => {
            if (event.state && event.state.stage) {
                setStage(event.state.stage);
            } else {
                setStage(STAGES.ENTRY);
            }
            if (!event.state || !event.state.stage || event.state.stage === STAGES.ENTRY) {
                setQuery("");
                localStorage.removeItem("search-query");
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    // Push history for stable stages only (skipping IDENTIFYING / DEEP_LOADING)
    useEffect(() => {
        const currentPath = window.location.pathname;
        const currentHistoryStage = window.history.state?.stage;

        if (currentHistoryStage !== stage) {
            if (stage === STAGES.SELECTING || stage === STAGES.DASHBOARD) {
                window.history.pushState({ stage }, "", currentPath);
            } else if (stage === STAGES.ENTRY && currentHistoryStage !== STAGES.ENTRY) {
                // Ensure the 'Home' state is reconciled if we manually set back to entry
                window.history.replaceState({ stage: STAGES.ENTRY }, "", currentPath);
            }
        }
    }, [stage]);

    useEffect(() => {
        if (data) {
            console.log("FULL DATA:", data);
        }
    }, [data]);

    // Persistence Sync
    useEffect(() => {
        localStorage.setItem("lookup-stage", stage);
    }, [stage]);

    useEffect(() => {
        localStorage.setItem("search-query", query);
    }, [query]);

    useEffect(() => {
        localStorage.setItem("search-keyword", globalKeyword);
    }, [globalKeyword]);

    useEffect(() => {
        localStorage.setItem("nexa-candidates", JSON.stringify(candidates));
    }, [candidates]);

    useEffect(() => {
        localStorage.setItem("nexa-deep-data", JSON.stringify(deepData));
    }, [deepData]);

    // Load recent searches on refresh
    useEffect(() => {
        const saved = JSON.parse(localStorage.getItem("recent-searches")) || [];
        setRecent(saved);
    }, []);

    const INTEL_LOGS = [
        "Initializing global intelligence handshake...",
        "Querying distributed social nodes...",
        "Analyzing career metadata footprints...",
        "Cross-referencing location signal data...",
        "Decrypting public API clusters...",
        "Heuristic analysis in progress...",
        "Mapping digital associations...",
        "Verifying identity consistency...",
        "Finalizing intelligence bundle..."
    ];



    const getPlatformFromUrl = (url) => {
        if (!url) return "Internet";
        const lowerUrl = url.toLowerCase();
        if (lowerUrl.includes('linkedin.com')) return "LinkedIn";
        if (lowerUrl.includes('github.com')) return "GitHub";
        if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) return "Twitter/X";
        if (lowerUrl.includes('instagram.com')) return "Instagram";
        if (lowerUrl.includes('facebook.com')) return "Facebook";
        return "Internet";
    };

    const groupCandidates = (list) => {
        if (!list || !Array.isArray(list)) return [];
        return list.map((item, index) => ({
            id: `cand-${index}-${Date.now()}`,
            name: item.title || item.name || "Unknown Identity",
            description: item.subtitle || item.description || "No description available",
            source: item.source || getPlatformFromUrl(item.url),
            url: item.url || ""
        }));
    };

    const cancelSearch = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            console.log("[Search] Cancellation Signal Sent");
        }
    };

    const handleIdentify = async (precisionData = null, isRefinement = false) => {
        cancelSearch();
        abortControllerRef.current = new AbortController();

        let searchName = precisionData ? precisionData.name : query;
        const searchKeyword = precisionData ? precisionData.keyword : "";
        const searchNumber = precisionData ? precisionData.number : "";

        // If it's a phone search from the modal, prioritize the number
        if (searchMode === SEARCH_MODES.PHONE && searchNumber) {
            searchName = searchNumber;
        }

        if (!searchName || !searchName.trim()) return;

        setCandidates([]);
        setShowFeedbackForm(false);
        setData(null);
        setDeepData(null);
        setLoadProgress(10);
        setStage(isRefinement ? STAGES.REFINING : STAGES.IDENTIFYING);
        setQuery(searchName);
        setGlobalKeyword(searchKeyword);

        const VITE_API_URL = API_URL || "http://localhost:5000";

        try {
            const res = await fetch(`${VITE_API_URL}/api/multi-search/identify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: searchName,
                    keywords: searchKeyword,
                    location: precisionData?.location || "",
                    searchMode: searchMode // Pass mode for backend disambiguation
                }),
                signal: abortControllerRef.current?.signal
            });

            if (!res.ok) throw new Error("Identify failed");

            const result = await res.json();

            if (result.candidates && result.candidates.length > 0) {
                const grouped = groupCandidates(result.candidates);
                setCandidates(grouped);
                setLoadProgress(50);
                setStage(STAGES.SELECTING);
            } else {
                console.log("[Search] No candidates found.");
                setStage(STAGES.ENTRY);
                setShowFeedbackForm(true);
            }
        } catch (err) {
            console.error("Identification failed:", err);
            setLoadProgress(0);
            setStage(STAGES.ENTRY);
        }
    };

    const handleCandidateSelect = async (candidate) => {
        setStage(STAGES.DEEP_LOADING);
        setLoadProgress(60);
        setData(prev => ({ ...prev, personaName: candidate.name }));

        const VITE_API_URL = API_URL || "http://localhost:5000";

        try {
            const res = await fetch(`${VITE_API_URL}/api/multi-search/enrichment`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ person: candidate }),
                signal: abortControllerRef.current?.signal
            });

            if (!res.ok) throw new Error("Enrichment failed");

            const result = await res.json();

            // Map the result to match the dashboard structure
            const enrichedData = {
                person: {
                    ...result.confirmedIdentity,
                    name: result.confirmedIdentity.name,
                    description: result.confirmedIdentity.description,
                    emails: result.emails || [],
                    phoneNumbers: result.phoneNumbers || [],
                    aiSummary: result.aiSummary || "Analysis complete. Dossier finalized."
                },
                socials: result.profiles || [],
                documents: result.documents || [],
                externalDocuments: result.documents || [], // Map for compatibility
                images: (result.images || []).map(img => ({
                    original: img,
                    thumbnail: img,
                    title: "Evidence Discovery"
                }))
            };

            setDeepData(enrichedData);
            setLoadProgress(100);
            setStage(STAGES.DASHBOARD);
        } catch (err) {
            console.error("Enrichment failed:", err);
            setStage(STAGES.SELECTING);
        }
    };



    const handleFeedbackSubmit = async (e) => {
        e.preventDefault();
        if (!feedbackData.name) return;

        setShowFeedbackForm(false);
        handleIdentify(feedbackData, true); // Pass true for isRefinement
    };

    const handleReset = () => {
        setStage(STAGES.ENTRY);
        setQuery("");
        setGlobalKeyword("");
        setLoadProgress(0);
        setCurrentStep(0);
        setDeepData(null);
        setCandidates([]);
        setShowFeedbackForm(false);
        // Clear all persistent states
        localStorage.removeItem("lookup-stage");
        localStorage.removeItem("search-query");
        localStorage.removeItem("search-keyword");
        localStorage.removeItem("nexa-candidates");
        localStorage.removeItem("nexa-deep-data");
        localStorage.removeItem("recent-searches");

        // Reset history to clean state
        window.history.replaceState({ stage: STAGES.ENTRY }, "", "/");
    };

    const handleGoBack = () => {
        setQuery("");
        localStorage.removeItem("search-query");
        window.history.back();
    };

    const handleCancel = () => {
        cancelSearch();
        handleReset();
    };

    const openPreview = (url, platform, isSocial = false) => {
        if (platform && (platform.toLowerCase() === 'wikipedia' || platform.toLowerCase() === 'britannica')) {
            window.open(url, '_blank', 'noopener,noreferrer');
            return;
        }
        setPreviewUrl(url);
        setPreviewPlatform(platform);
        setPreviewIsSocial(isSocial);
        setIsLiveView(isSocial); // Default to live for social, normal for others
    };

    const renderPlatformMirror = (platform, url) => {
        const p = platform.toLowerCase();
        const personaName = deepData?.person?.name || "Target Profile";

        if (p.includes('linkedin')) {
            return (
                <div className="linkedin-shell animate-fade-up">
                    <div className="linkedin-cover-placeholder">
                        <div className="linkedin-profile-abs">
                            <div className="linkedin-photo-circle">👤</div>
                        </div>
                    </div>
                    <div className="linkedin-body">
                        <div className="linkedin-identity">
                            <h2>{personaName}</h2>
                            <p className="linkedin-headline">{deepData?.person?.description || "Professional Profile on LinkedIn"}</p>
                            <p className="linkedin-subline">{deepData?.person?.location || "Global Network"}</p>
                        </div>
                        <div className="linkedin-actions">
                            <a href={url} target="_blank" rel="noreferrer" className="ln-btn-primary">View Full Profile</a>
                            <a href={url} target="_blank" rel="noreferrer" className="ln-btn-secondary">Message</a>
                        </div>
                    </div>
                </div>
            );
        }

        if (p.includes('facebook')) {
            return (
                <div className="facebook-shell">
                    <div className="fb-header-strip">
                        <div className="fb-logo-mock">f</div>
                    </div>
                    <div className="fb-profile-section animate-fade-up">
                        <div className="fb-cover-photo"></div>
                        <div className="fb-profile-info-row">
                            <div className="fb-profile-pic">👤</div>
                            <div className="fb-name-stack">
                                <h1>{personaName}</h1>
                                <span className="fb-friends-count">Profile Details</span>
                            </div>
                        </div>
                    </div>
                    <div style={{ padding: '2rem', textAlign: 'center' }}>
                        <a href={url} target="_blank" rel="noreferrer" className="premium-action-btn" style={{ maxWidth: '300px', margin: '0 auto' }}>
                            Continue to Facebook
                        </a>
                    </div>
                </div>
            );
        }

        if (p.includes('instagram')) {
            return (
                <div className="instagram-shell animate-fade-up">
                    <div className="ig-profile-header">
                        <div className="ig-avatar-outer">
                            <div className="ig-avatar-inner">👤</div>
                        </div>
                        <div className="ig-info-column">
                            <div className="ig-username-row">
                                <span className="ig-username">{personaName.toLowerCase().replace(/\s/g, '_')}</span>
                                <button className="ig-follow-btn">Follow</button>
                            </div>
                            <div className="ig-stats-row">
                                <div className="ig-stat"><span>1,204</span> posts</div>
                                <div className="ig-stat"><span>852</span> followers</div>
                                <div className="ig-stat"><span>921</span> following</div>
                            </div>
                            <div className="ig-bio">
                                <h1>{personaName}</h1>
                                <p>{deepData?.person?.location}</p>
                            </div>
                        </div>
                    </div>
                    <div className="ig-grid-placeholder">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => <div key={i} className="ig-grid-item">📸</div>)}
                    </div>
                    <div className="ig-see-full-cta">
                        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1rem' }}>See the actual profile live?</p>
                        <a href={url} target="_blank" rel="noreferrer" className="premium-action-btn" style={{ background: 'var(--instagram-gradient)', border: 'none' }}>
                            Open in App
                        </a>
                    </div>
                </div>
            );
        }

        // Default Fallback for other platforms
        return (
            <div className="iframe-fallback-overlay">
                <div className="fallback-card">
                    <div className="fallback-security-badge">
                        <div className="security-icon-wrapper">🛡️</div>
                        <span>Security Verified Preview</span>
                    </div>
                    <div className="fallback-body">
                        <div className="platform-branding-large">
                            <span className="platform-emoji-large">{getPlatformEmoji(platform)}</span>
                            <h4>{platform} Protected Profile</h4>
                        </div>
                        <p className="fallback-explanation">
                            This platform restricts embedded views. You can securely view the profile in a new window.
                        </p>
                        <div className="fallback-actions">
                            <a href={url} target="_blank" rel="noreferrer" className="premium-action-btn">
                                Open {platform} Profile
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className={`saas-layout ${stage === STAGES.ENTRY ? 'stage-entry' : ''}`} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflowX: 'hidden', overflowY: 'auto' }}>
            {/* Top Navigation: Professional SaaS Header */}
            <nav className="navbar">
                <div className="nav-left">
                    {stage !== STAGES.ENTRY && (
                        <button className="nav-back-btn" onClick={handleGoBack} title="Go Back">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 12H5M12 19l-7-7 7-7" />
                            </svg>
                        </button>
                    )}
                </div>

                <div className="nav-center" style={{ visibility: stage === STAGES.ENTRY ? 'hidden' : 'visible' }}>
                    <div className="nav-logo" onClick={handleReset} style={{ cursor: 'pointer' }}>
                        <img src="/logo.png" alt="LookUp Logo" />
                    </div>
                </div>

                <div className="nav-right">
                    <div className="nav-actions">
                        <button className="nav-btn secondary desktop-only">Support</button>
                        {user ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <span style={{ color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: '600' }}>
                                    Hi, {user.name.split(' ')[0]}
                                </span>
                                <button className="nav-btn primary" onClick={logout}>Account</button>
                            </div>
                        ) : (
                            <button className="nav-btn primary" onClick={() => setIsAuthModalOpen(true)}>Log In / Sign Up</button>
                        )}
                    </div>
                </div>
            </nav>

            {/* Global Loading Overlay */}
            {(stage === STAGES.IDENTIFYING || stage === STAGES.DEEP_LOADING) && (
                <LoadingChecklist
                    stage={stage}
                    STAGES={STAGES}
                    progress={loadProgress}
                    currentStep={currentStep}
                    onCancel={handleCancel}
                    query={query}
                    personaName={data?.personaName}
                />
            )}

            {stage === STAGES.ENTRY ? (
                <div className="landing-container animate-fade-up">
                    {/* SECTION 1: HERO & SEARCH */}
                    <section className="landing-hero">
                        <span className="landing-slogan">Unified Intelligence Platform</span>
                        <h1 className="landing-title">
                            Real-time search and intelligence<br />for all your data sources.
                        </h1>

                        {/* Redesigned Search Box */}
                        <div className={`landing-search-box ${searchMode === SEARCH_MODES.PHONE ? 'phone-mode' : ''}`}>
                            {/* Mode switcher integrated inside the search bar */}
                            <div className="mode-switcher">
                                <button
                                    className={`mode-btn ${searchMode === SEARCH_MODES.GENERAL ? 'active' : ''}`}
                                    onClick={() => setSearchMode(SEARCH_MODES.GENERAL)}
                                    title="Identity Search"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="11" cy="11" r="8"></circle>
                                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                    </svg>
                                </button>
                                <button
                                    className={`mode-btn ${searchMode === SEARCH_MODES.PHONE ? 'active' : ''}`}
                                    onClick={() => setSearchMode(SEARCH_MODES.PHONE)}
                                    title="Phone Intelligence"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="5" y="2" width="14" height="20" rx="3" ry="3"></rect>
                                        <path d="M12 18h.01"></path>
                                    </svg>
                                </button>
                            </div>

                            {/* Divider if switcher is shown */}
                            <div className="landing-search-divider"></div>

                            {/* Magnifying Glass Search Icon (only in General Mode) */}
                            {searchMode === SEARCH_MODES.GENERAL && (
                                <div className="landing-search-icon">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="11" cy="11" r="8"></circle>
                                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                    </svg>
                                </div>
                            )}

                            {/* Country dropdown in phone mode */}
                            {searchMode === SEARCH_MODES.PHONE && (
                                <>
                                    <div className="country-selector-pill" ref={countryDropdownRef}>
                                        <div className="phone-prefix-v2" onClick={() => setShowCountryDropdown(!showCountryDropdown)}>
                                            <span className="flag">{selectedCountry.flag}</span>
                                            <span className="prefix">{selectedCountry.prefix}</span>
                                            <svg className={`chevron ${showCountryDropdown ? 'open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="6 9 12 15 18 9"></polyline>
                                            </svg>
                                        </div>
                                        {showCountryDropdown && (
                                            <div className="country-dropdown-v2">
                                                {COUNTRIES.map((c) => (
                                                    <div key={c.code} className="country-option-v2" onClick={() => {
                                                        setSelectedCountry(c);
                                                        setShowCountryDropdown(false);
                                                        setManualCountry(true);
                                                    }}>
                                                        <span className="option-flag">{c.flag}</span>
                                                        <span className="option-name">{c.name}</span>
                                                        <span className="option-prefix">{c.prefix}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="landing-search-divider"></div>
                                </>
                            )}

                            {/* Main Input Text Field */}
                            <input
                                className="landing-search-input-field"
                                type={searchMode === SEARCH_MODES.PHONE ? "tel" : "text"}
                                inputMode={searchMode === SEARCH_MODES.PHONE ? "numeric" : "text"}
                                pattern={searchMode === SEARCH_MODES.PHONE ? "[0-9]*" : undefined}
                                placeholder={searchMode === SEARCH_MODES.PHONE ? "Enter mobile number..." : "Enter your Name "}
                                value={query}
                                maxLength={30}
                                onChange={(e) => {
                                    if (searchMode === SEARCH_MODES.PHONE) {
                                        setQuery(e.target.value.replace(/\D/g, ''));
                                    } else {
                                        setQuery(e.target.value);
                                    }
                                }}
                                onKeyDown={(e) => e.key === 'Enter' && handleIdentify()}
                                autoFocus
                            />

                            {/* Run Intelligence CTA Pill */}
                            <button className="landing-search-submit-btn" onClick={() => handleIdentify()}>
                                Run Intelligence
                            </button>
                        </div>

                        {/* Hero Bullet Indicators */}
                        <div className="landing-bullets">
                            <div className="landing-bullet-item">
                                <span style={{ fontSize: '0.8rem', color: '#2563eb' }}>●</span>
                                <span>Multi-source intelligence</span>
                            </div>
                            <div className="landing-bullet-item">
                                <span style={{ fontSize: '0.8rem', color: '#2563eb' }}>●</span>
                                <span>AI-powered insights</span>
                            </div>
                            <div className="landing-bullet-item">
                                <span style={{ fontSize: '0.8rem', color: '#2563eb' }}>●</span>
                                <span>Real-time results</span>
                            </div>
                        </div>
                    </section>

                    {/* SECTION 2: HOW IT WORKS */}
                    <section className="landing-section">
                        <div className="landing-section-header">
                            <h2 className="landing-section-title">How it works</h2>
                            <p className="landing-section-subtitle">
                                Experience the power of unified intelligence in three simple steps.
                            </p>
                        </div>

                        <div className="landing-how-grid">
                            <div className="landing-how-card">
                                <div className="landing-how-icon-box">
                                    {/* Icon Step 1: Connect */}
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                                    </svg>
                                </div>
                                <h3 className="landing-how-card-title">Step 1: Connect</h3>
                                <p className="landing-how-card-desc">
                                    Connect your data sources including SaaS apps, databases, and files in minutes.
                                </p>
                            </div>

                            <div className="landing-how-card">
                                <div className="landing-how-icon-box">
                                    {/* Icon Step 2: Analyze */}
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <path d="M12 16v-4M12 8h.01"></path>
                                    </svg>
                                </div>
                                <h3 className="landing-how-card-title">Step 2: Analyze</h3>
                                <p className="landing-how-card-desc">
                                    Run unified intelligence with AI-powered analysis and cross-platform search.
                                </p>
                            </div>

                            <div className="landing-how-card">
                                <div className="landing-how-icon-box">
                                    {/* Icon Step 3: Solve */}
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                                    </svg>
                                </div>
                                <h3 className="landing-how-card-title">Step 3: Solve</h3>
                                <p className="landing-how-card-desc">
                                    Get real-time answers and instant insights across all your connected platforms.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* SECTION 3: FEATURES */}
                    <section className="landing-section landing-section-bg-gray">
                        <div className="landing-section-header">
                            <h2 className="landing-section-title">Powerful features for modern teams</h2>
                            <p className="landing-section-subtitle">
                                Everything you need to unify your data and unlock insights.
                            </p>
                        </div>

                        <div className="landing-features-grid">
                            <div className="landing-feature-card">
                                <div className="landing-feature-icon-wrapper">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <circle cx="11" cy="11" r="8"></circle>
                                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                    </svg>
                                </div>
                                <div className="landing-feature-text-block">
                                    <h3 className="landing-feature-card-title">Universal Search</h3>
                                    <p className="landing-feature-card-desc">
                                        Search across every database, cloud app, and file system from a single interface.
                                    </p>
                                </div>
                            </div>

                            <div className="landing-feature-card">
                                <div className="landing-feature-icon-wrapper">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path>
                                    </svg>
                                </div>
                                <div className="landing-feature-text-block">
                                    <h3 className="landing-feature-card-title">AI-Powered Insights</h3>
                                    <p className="landing-feature-card-desc">
                                        Leverage large language models to summarize findings and answer complex questions.
                                    </p>
                                </div>
                            </div>

                            <div className="landing-feature-card">
                                <div className="landing-feature-icon-wrapper">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
                                    </svg>
                                </div>
                                <div className="landing-feature-text-block">
                                    <h3 className="landing-feature-card-title">Real-time Sync</h3>
                                    <p className="landing-feature-card-desc">
                                        Data stays fresh with continuous, low-latency indexing of all your connected sources.
                                    </p>
                                </div>
                            </div>

                            <div className="landing-feature-card">
                                <div className="landing-feature-icon-wrapper">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                                    </svg>
                                </div>
                                <div className="landing-feature-text-block">
                                    <h3 className="landing-feature-card-title">Enterprise Security</h3>
                                    <p className="landing-feature-card-desc">
                                        Built with SOC2 compliance and granular access controls to keep your data safe.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* SECTION 4: TESTIMONIALS */}
                    <section className="landing-section">
                        <div className="landing-section-header">
                            <h2 className="landing-section-title">Trusted by innovative teams</h2>
                            <p className="landing-section-subtitle">
                                Join thousands of data-driven professionals who have transformed their intelligence workflow.
                            </p>
                        </div>

                        <div className="landing-testimonials-grid">
                            <div className="landing-testimonial-card">
                                <div>
                                    <div className="landing-stars">★★★★★</div>
                                    <p className="landing-testimonial-text">
                                        "LookUp has completely changed how we handle cross-platform discovery. What used to take hours of manual searching now happens in seconds with unified intelligence."
                                    </p>
                                </div>
                                <div className="landing-testimonial-author">
                                    <div className="landing-testimonial-avatar">SC</div>
                                    <div>
                                        <div className="landing-testimonial-author-name">Sarah Chen</div>
                                        <div className="landing-testimonial-author-role">Head of Data at TechFlow</div>
                                    </div>
                                </div>
                            </div>

                            <div className="landing-testimonial-card">
                                <div>
                                    <div className="landing-stars">★★★★★</div>
                                    <p className="landing-testimonial-text">
                                        "The AI-powered insights are remarkably accurate. It's like having a senior data analyst working across all our databases 24/7. Highly recommended for any scaling team."
                                    </p>
                                </div>
                                <div className="landing-testimonial-author">
                                    <div className="landing-testimonial-avatar">MR</div>
                                    <div>
                                        <div className="landing-testimonial-author-name">Marcus Rodriguez</div>
                                        <div className="landing-testimonial-author-role">CTO at Streamline AI</div>
                                    </div>
                                </div>
                            </div>

                            <div className="landing-testimonial-card">
                                <div>
                                    <div className="landing-stars">★★★★★</div>
                                    <p className="landing-testimonial-text">
                                        "Enterprise security was our biggest concern, but LookUp's SOC2 compliance and granular controls gave us the confidence we needed to integrate our most sensitive data."
                                    </p>
                                </div>
                                <div className="landing-testimonial-author">
                                    <div className="landing-testimonial-avatar">EK</div>
                                    <div>
                                        <div className="landing-testimonial-author-name">Elena Kostas</div>
                                        <div className="landing-testimonial-author-role">Director of Operations at Nexus</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* SECTION 5: PRICING */}
                    <section className="landing-section landing-section-bg-gray">
                        <div className="landing-section-header">
                            <h2 className="landing-section-title">Simple, transparent pricing</h2>
                            <p className="landing-section-subtitle">
                                Choose the plan that's right for your team's intelligence needs.
                            </p>
                        </div>

                        <div className="landing-pricing-grid">
                            {/* Starter */}
                            <div className="landing-pricing-card">
                                <h3 className="landing-pricing-title">Starter</h3>
                                <p className="landing-pricing-subtitle">
                                    Perfect for individuals and small projects.
                                </p>
                                <div className="landing-pricing-price-box">
                                    <span className="landing-pricing-price">$0</span>
                                    <span className="landing-pricing-period">/mo</span>
                                </div>
                                <ul className="landing-pricing-features-list">
                                    <li className="landing-pricing-feature-item">
                                        <div className="landing-pricing-check-icon">✓</div>
                                        <span>3 data sources</span>
                                    </li>
                                    <li className="landing-pricing-feature-item">
                                        <div className="landing-pricing-check-icon">✓</div>
                                        <span>Basic AI insights</span>
                                    </li>
                                    <li className="landing-pricing-feature-item">
                                        <div className="landing-pricing-check-icon">✓</div>
                                        <span>24h sync latency</span>
                                    </li>
                                </ul>
                                <button className="landing-pricing-btn landing-pricing-btn-outline" onClick={() => setIsAuthModalOpen(true)}>
                                    Get Started
                                </button>
                            </div>

                            {/* Professional */}
                            <div className="landing-pricing-card landing-pricing-card-highlight">
                                <div className="landing-pricing-badge">Most Popular</div>
                                <h3 className="landing-pricing-title">Professional</h3>
                                <p className="landing-pricing-subtitle">
                                    For growing teams that need more power.
                                </p>
                                <div className="landing-pricing-price-box">
                                    <span className="landing-pricing-price">$49</span>
                                    <span className="landing-pricing-period">/mo</span>
                                </div>
                                <ul className="landing-pricing-features-list">
                                    <li className="landing-pricing-feature-item">
                                        <div className="landing-pricing-check-icon">✓</div>
                                        <span>Unlimited data sources</span>
                                    </li>
                                    <li className="landing-pricing-feature-item">
                                        <div className="landing-pricing-check-icon">✓</div>
                                        <span>Advanced AI intelligence</span>
                                    </li>
                                    <li className="landing-pricing-feature-item">
                                        <div className="landing-pricing-check-icon">✓</div>
                                        <span>Real-time sync</span>
                                    </li>
                                    <li className="landing-pricing-feature-item">
                                        <div className="landing-pricing-check-icon">✓</div>
                                        <span>Priority support</span>
                                    </li>
                                </ul>
                                <button className="landing-pricing-btn landing-pricing-btn-solid" onClick={() => setIsAuthModalOpen(true)}>
                                    Get Started
                                </button>
                            </div>

                            {/* Enterprise */}
                            <div className="landing-pricing-card">
                                <h3 className="landing-pricing-title">Enterprise</h3>
                                <p className="landing-pricing-subtitle">
                                    Scalable solutions for large organizations.
                                </p>
                                <div className="landing-pricing-price-box">
                                    <span className="landing-pricing-price" style={{ fontSize: '2.5rem' }}>Custom</span>
                                </div>
                                <ul className="landing-pricing-features-list">
                                    <li className="landing-pricing-feature-item">
                                        <div className="landing-pricing-check-icon">✓</div>
                                        <span>Everything in Pro</span>
                                    </li>
                                    <li className="landing-pricing-feature-item">
                                        <div className="landing-pricing-check-icon">✓</div>
                                        <span>SOC2 compliance</span>
                                    </li>
                                    <li className="landing-pricing-feature-item">
                                        <div className="landing-pricing-check-icon">✓</div>
                                        <span>Custom integrations</span>
                                    </li>
                                    <li className="landing-pricing-feature-item">
                                        <div className="landing-pricing-check-icon">✓</div>
                                        <span>Dedicated account manager</span>
                                    </li>
                                </ul>
                                <button className="landing-pricing-btn landing-pricing-btn-gray" onClick={() => setIsAuthModalOpen(true)}>
                                    Contact Sales
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* SECTION 6: FAQ */}
                    <section className="landing-section">
                        <div className="landing-section-header">
                            <h2 className="landing-section-title">Frequently Asked Questions</h2>
                            <p className="landing-section-subtitle">
                                Everything you need to know about LookUp intelligence platform.
                            </p>
                        </div>

                        <div className="landing-faq-grid">
                            <div className="landing-faq-item">
                                <div className="landing-faq-icon-wrapper">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                    </svg>
                                </div>
                                <div className="landing-faq-content">
                                    <h3 className="landing-faq-question">How many data sources can I connect?</h3>
                                    <p className="landing-faq-answer">
                                        The number of data sources depends on your plan. Starter includes up to 3, while Professional and Enterprise offer unlimited connections to your favorite SaaS apps, databases, and file systems.
                                    </p>
                                </div>
                            </div>

                            <div className="landing-faq-item">
                                <div className="landing-faq-icon-wrapper">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                                    </svg>
                                </div>
                                <div className="landing-faq-content">
                                    <h3 className="landing-faq-question">Is my data secure with LookUp?</h3>
                                    <p className="landing-faq-answer">
                                        Absolutely. We use enterprise-grade encryption and are SOC2 Type II compliant. We never store your raw data; we only index it to provide real-time intelligence.
                                    </p>
                                </div>
                            </div>

                            <div className="landing-faq-item">
                                <div className="landing-faq-icon-wrapper">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                        <line x1="16" y1="2" x2="16" y2="6"></line>
                                        <line x1="8" y1="2" x2="8" y2="6"></line>
                                        <line x1="3" y1="10" x2="21" y2="10"></line>
                                    </svg>
                                </div>
                                <div className="landing-faq-content">
                                    <h3 className="landing-faq-question">Do you offer a free trial?</h3>
                                    <p className="landing-faq-answer">
                                        Yes! You can start with our Starter plan for free to explore basic features. For teams, we offer a 14-day free trial of the Professional plan to experience full AI-powered insights.
                                    </p>
                                </div>
                            </div>

                            <div className="landing-faq-item">
                                <div className="landing-faq-icon-wrapper">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <polyline points="17 1 21 5 17 9"></polyline>
                                        <path d="M3 11V9a4 4 0 0 1 4-4h14M7 23 3 19 7 15"></path>
                                        <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                                    </svg>
                                </div>
                                <div className="landing-faq-content">
                                    <h3 className="landing-faq-question">Can I change my plan later?</h3>
                                    <p className="landing-faq-answer">
                                        Of course. You can upgrade or downgrade your plan at any time from your account settings. Changes will be reflected in your next billing cycle.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* SECTION 7: FOOTER */}
                    <footer className="landing-footer">
                        <div className="landing-footer-grid">
                            <div className="landing-footer-brand-col">
                                <a href="/" className="landing-footer-logo">
                                    <div className="landing-footer-logo-icon">Q</div>
                                    <span>LookUp</span>
                                </a>
                                <p className="landing-footer-desc">
                                    The unified intelligence platform that connects your data sources for real-time search and AI-powered insights.
                                </p>
                            </div>

                            <div>
                                <h4 className="landing-footer-title-col">Product</h4>
                                <ul className="landing-footer-links">
                                    <li className="landing-footer-link-item"><a href="/">Features</a></li>
                                    <li className="landing-footer-link-item"><a href="/">Pricing</a></li>
                                    <li className="landing-footer-link-item"><a href="/">Documentation</a></li>
                                    <li className="landing-footer-link-item"><a href="/">API Reference</a></li>
                                </ul>
                            </div>

                            <div>
                                <h4 className="landing-footer-title-col">Company</h4>
                                <ul className="landing-footer-links">
                                    <li className="landing-footer-link-item"><a href="/">About Us</a></li>
                                    <li className="landing-footer-link-item"><a href="/">Blog</a></li>
                                    <li className="landing-footer-link-item"><a href="/">Careers</a></li>
                                    <li className="landing-footer-link-item"><a href="/">Contact</a></li>
                                </ul>
                            </div>

                            <div>
                                <h4 className="landing-footer-title-col">Legal</h4>
                                <ul className="landing-footer-links">
                                    <li className="landing-footer-link-item"><a href="/">Privacy Policy</a></li>
                                    <li className="landing-footer-link-item"><a href="/">Terms of Service</a></li>
                                    <li className="landing-footer-link-item"><a href="/">Security</a></li>
                                </ul>
                            </div>
                        </div>

                        <div className="landing-footer-divider"></div>

                        <div className="landing-footer-bottom">
                            <span className="landing-footer-copy">
                                &copy; 2024 LookUp. All rights reserved.
                            </span>

                            <div className="landing-footer-socials">
                                <a href="https://twitter.com" target="_blank" rel="noreferrer" className="landing-footer-social-link">
                                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                                    </svg>
                                </a>
                                <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="landing-footer-social-link">
                                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"></path>
                                    </svg>
                                </a>
                                <a href="https://github.com" target="_blank" rel="noreferrer" className="landing-footer-social-link">
                                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                                        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z"></path>
                                    </svg>
                                </a>
                            </div>
                        </div>
                    </footer>
                </div>
            ) : (
                <main className="container">
                    {/* 2. Selecting View (Structured Candidates) */}
                    {(stage === STAGES.SELECTING) && (
                        <div className="selecting-view animate-fade-up">
                            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>
                                        Potential Intel Matches
                                    </h2>
                                    <p style={{ color: 'var(--text-soft)', margin: '0.5rem 0 0' }}>
                                        Select the correct identity to trigger deep intelligence acquisition.
                                    </p>
                                </div>
                            </div>

                            <div className="candidates-grid">
                                {candidates.map((person, idx) => (
                                    <div
                                        key={person.id}
                                        className="saas-card animate-scale-in"
                                        style={{ cursor: 'pointer', border: stage === STAGES.CONFIRMING ? '2px solid var(--accent)' : '1px solid var(--border-light)' }}
                                    >
                                        <div className="card-icon" style={{ marginTop: '0.25rem' }}>👤</div>
                                        <div className="card-body">
                                            <div className="card-meta">
                                                {person.source === 'local' ? 'Verified Archive' : `Source: ${person.source}`}
                                            </div>
                                            <h3 className="card-title">{person.name}</h3>
                                            <p className="card-desc" style={{ fontSize: '0.9rem', color: 'var(--text-main)', opacity: 0.9 }}>
                                                {person.description}
                                            </p>

                                            <div className="card-actions-row" style={{ marginTop: '1.25rem' }}>
                                                <button
                                                    className="nav-btn primary"
                                                    style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', width: '100%', background: 'var(--accent)' }}
                                                    onClick={() => handleCandidateSelect(person)}
                                                >
                                                    Select and Initialize Deep Search
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {stage === STAGES.SELECTING && (
                                <div className="animate-fade-up" style={{ marginTop: '3rem', textAlign: 'center' }}>
                                    <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Don't see who you're looking for?</p>
                                    <button className="nav-btn secondary" onClick={() => {
                                        setFeedbackData({ name: query, keyword: globalKeyword, location: '', number: '' });
                                        setShowFeedbackForm(true);
                                    }} style={{ border: '1px solid var(--accent)', color: 'var(--accent)' }}>
                                        Person Not Found
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </main>
            )}

            {/* 3. Dashboard View — Full-Width (outside .container) */}
            {stage === STAGES.DASHBOARD && deepData && (
                <div className="dashboard-container">

                    <div className="results-container">
                        {/* Profile Summary Card */}
                        <section className="profile-hero animate-fade-up">
                            <div className="profile-hero-content">
                                <div className="profile-avatar-container">
                                    <img
                                        src={deepData.person.primaryImageObj?.isBlocked ? deepData.person.primaryImageObj.thumbnail : (deepData.person.primaryImage || "https://ui-avatars.com/api/?name=" + encodeURIComponent(deepData.person.name) + "&background=0D8ABC&color=fff")}
                                        alt={deepData.person.name}
                                        className="profile-avatar"
                                        onError={(e) => {
                                            // Fallback chain: original -> thumbnail -> ui-avatar
                                            if (e.target.src !== deepData.person.primaryImageObj?.thumbnail && deepData.person.primaryImageObj?.thumbnail) {
                                                e.target.src = deepData.person.primaryImageObj.thumbnail;
                                            } else {
                                                e.target.src = "https://ui-avatars.com/api/?name=" + encodeURIComponent(deepData.person.name) + "&background=0D8ABC&color=fff";
                                            }
                                        }}
                                    />
                                    <div className="avatar-status-ring"></div>
                                </div>
                                <div className="profile-info">
                                    <div className="profile-tags">
                                        {deepData.person.location && <span className="location-pill">📍 {deepData.person.location}</span>}
                                    </div>
                                    <h1 className="profile-name">{deepData.person.name}</h1>

                                    <div className="profile-quick-links">
                                        {deepData.person.phoneNumbers?.length > 0 && (
                                            <div className="social-pill-link" style={{ cursor: 'pointer' }} onClick={() => toggleReveal(deepData.person.phoneNumbers[0])}>
                                                <span className="platform-icon">📞</span>
                                                <span className="platform-name">
                                                    {revealedNumbers.has(deepData.person.phoneNumbers[0])
                                                        ? deepData.person.phoneNumbers[0]
                                                        : maskPhone(deepData.person.phoneNumbers[0])}
                                                </span>
                                            </div>
                                        )}
                                        {deepData.person.emails?.length > 0 && (
                                            <div className="social-pill-link" style={{ cursor: 'pointer' }} onClick={() => toggleReveal(deepData.person.emails[0])}>
                                                <span className="platform-icon">✉️</span>
                                                <span className="platform-name">
                                                    {revealedNumbers.has(deepData.person.emails[0])
                                                        ? deepData.person.emails[0]
                                                        : maskEmail(deepData.person.emails[0])}
                                                </span>
                                            </div>
                                        )}
                                        {deepData.socials.map((social, i) => (
                                            <div key={i} className="social-pill-link" style={{ cursor: 'pointer' }} onClick={() => openPreview(social.url, social.platform, true)} title={social.platform}>
                                                <span className="platform-icon">{getPlatformEmoji(social.platform)}</span>
                                                <span className="platform-name">{social.platform}</span>
                                            </div>
                                        ))}
                                    </div>

                                </div>
                            </div>
                        </section>

                        {/* Intelligence Feed */}
                        <section className="results-feed">

                            {/* Contact Intelligence Dashboard */}
                            <div className="category-section animate-fade-up">
                                <div className="category-header">
                                    <h3 className="category-title">📇 Contact Intelligence Dashboard</h3>
                                    <span className="category-count">Verified Identity Pins</span>
                                </div>
                                <div className="social-grid">
                                    {(deepData.person.emails || []).map((email, i) => (
                                        <div key={`email-${i}`} className="saas-card animate-scale-in" style={{ cursor: 'pointer' }} onClick={() => toggleReveal(email)}>
                                            <div className="card-icon">✉️</div>
                                            <div className="card-body">
                                                <div className="card-meta">Enriched Email</div>
                                                <div className="card-title" style={{ fontSize: '0.9rem' }}>
                                                    {revealedNumbers.has(email) ? email : maskEmail(email)}
                                                </div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--accent)', marginTop: '4px', opacity: 0.8 }}>
                                                    Source: {deepData.person.enrichmentRecord?.source || 'Public Identity Record'}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {(deepData.person.phoneNumbers || []).map((phone, i) => (
                                        <div key={`phone-${i}`} className="saas-card animate-scale-in" style={{ cursor: 'pointer' }} onClick={() => toggleReveal(phone)}>
                                            <div className="card-icon">📞</div>
                                            <div className="card-body">
                                                <div className="card-meta">Verified Phone</div>
                                                <div className="card-title" style={{ fontSize: '0.9rem' }}>
                                                    {revealedNumbers.has(phone) ? phone : maskPhone(phone)}
                                                </div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--accent)', marginTop: '4px', opacity: 0.8 }}>
                                                    Validated Result
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {(!deepData.person.emails?.length && !deepData.person.phoneNumbers?.length) && (
                                        <div className="empty-state">No direct contact data identified.</div>
                                    )}
                                </div>
                            </div>

                            {/* Media Verification */}
                            <div className="category-section animate-fade-up">
                                <div className="category-header">
                                    <h3 className="category-title">📷 Media Verification</h3>
                                    <span className="category-count">{deepData.images?.length || 0} Items</span>
                                </div>
                                {deepData.images && deepData.images.length > 0 ? (
                                    <div className="gallery-slider">
                                        {deepData.images.map((img, idx) => {
                                            const initials = deepData.person?.name ? deepData.person.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??';
                                            const displayUrl = img.isBlocked ? img.thumbnail : img.original;
                                            return (
                                                <div key={idx} className="gallery-item-wrapper" style={{ position: 'relative', width: '120px', height: '120px', borderRadius: '12px', overflow: 'hidden', background: '#f1f5f9', flexShrink: 0 }}>
                                                    <img
                                                        src={displayUrl}
                                                        className="gallery-thumbnail"
                                                        alt="Evidence"
                                                        onClick={() => openPreview(img.original, 'Media')}
                                                        style={{ cursor: 'pointer', width: '100%', height: '100%', objectFit: 'cover' }}
                                                        onError={(e) => {
                                                            if (displayUrl !== img.thumbnail && img.thumbnail) {
                                                                e.target.src = img.thumbnail;
                                                            } else {
                                                                e.target.style.display = 'none';
                                                                e.target.parentElement.querySelector('.img-placeholder').style.display = 'flex';
                                                            }
                                                        }}
                                                    />
                                                    <div className="img-placeholder" style={{ display: 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)', color: '#64748b', fontSize: '1.5rem', fontWeight: 800 }}>
                                                        {initials}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="empty-state">No media data available</div>
                                )}
                            </div>

                            {/* Platform Footprint */}
                            <div className="category-section animate-fade-up">
                                <div className="category-header">
                                    <h3 className="category-title">🌐 Platform Footprint</h3>
                                    <span className="category-count">{deepData.socials.length} Sources</span>
                                </div>
                                {deepData.socials.length > 0 ? (
                                    <div className="social-grid">
                                        {deepData.socials.map((social, i) => (
                                            <div key={i} className="saas-card animate-scale-in" style={{ cursor: 'pointer' }} onClick={() => openPreview(social.url, social.platform, true)}>
                                                <div className="card-icon">{getPlatformEmoji(social.platform)}</div>
                                                <div className="card-body">
                                                    <div className="card-meta">{social.platform}</div>
                                                    <div className="card-title" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{social.handle || social.url}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="empty-state">No social media profiles found.</div>
                                )}
                            </div>

                            {/* External Documents & Evidence */}
                            {deepData.externalDocuments && deepData.externalDocuments.length > 0 && (
                                <div className="category-section animate-fade-up">
                                    <div className="category-header">
                                        <h3 className="category-title">📄 External Documents & Evidence</h3>
                                        <span className="category-count">{deepData.externalDocuments.length} Findings</span>
                                    </div>
                                    <div className="social-grid">
                                        {(showAllDocuments ? deepData.externalDocuments : deepData.externalDocuments.slice(0, 6)).map((doc, i) => (
                                            <div key={i} className="saas-card animate-scale-in" style={{ cursor: 'pointer' }} onClick={() => window.open(doc.url, '_blank')}>
                                                <div className="card-icon">
                                                    {doc.platform === 'PDF' ? '📝' :
                                                        doc.platform === 'DOCX' ? '📄' :
                                                            doc.platform === 'PPT' ? '📊' : '📁'}
                                                </div>
                                                <div className="card-body">
                                                    <div className="card-meta">{doc.platform} Document</div>
                                                    <div className="card-title" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {doc.title || 'View Source'}
                                                    </div>
                                                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                                                        {doc.snippet.substring(0, 40)}...
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {deepData.externalDocuments.length > 6 && (
                                        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                                            <button
                                                className="nav-btn secondary"
                                                onClick={() => setShowAllDocuments(!showAllDocuments)}
                                                style={{ padding: '0.6rem 2rem', fontSize: '0.9rem' }}
                                            >
                                                {showAllDocuments ? "Show Less" : "More Information"}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}


                            {/* Internal Archive */}
                            <div className="category-section animate-fade-up">
                                <div className="category-header">
                                    <h3 className="category-title">🗄️ Internal Archive Dossiers</h3>
                                    <span className="category-count">{deepData.localData?.length || 0} Records</span>
                                </div>
                                {deepData.localData && deepData.localData.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                        {deepData.localData.map((item, idx) => (
                                            <div key={idx} className="archive-card animate-scale-in">
                                                <div className="archive-card-header">
                                                    <span className={`source-badge ${item.source === 'SQLite' ? 'badge-sqlite' : (item.source === 'MongoDB' ? 'badge-mongodb' : 'badge-internet')}`}>
                                                        {item.source === 'local' ? 'CSV ARCHIVE' : (item.source === 'SQLite' ? 'SQLITE DATASTORE' : (item.source === 'MongoDB' ? 'CLUSTER DB' : (item.source || 'LOCAL').toUpperCase()))}
                                                    </span>
                                                    <span className="archive-card-id">ID: {item.id || `${idx + 1}-H1`}</span>
                                                </div>
                                                <p className="archive-card-text">{item.text}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="empty-state">No internal archive data available.</div>
                                )}
                            </div>

                            {/* AI Synthesis */}
                            {deepData.person.aiSummary && (
                                <div className="category-section animate-fade-up">
                                    <div className="category-header">
                                        <h3 className="category-title">✨ AI Synthesis</h3>
                                    </div>
                                    <div className="ai-summary-block prose" style={{ padding: '1.5rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', borderLeft: 'none', color: 'var(--text-main)', lineHeight: '1.6', fontSize: '1rem' }}>
                                        <ReactMarkdown>{deepData.person.aiSummary}</ReactMarkdown>
                                    </div>
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            )}

            {/* Mobile Sticky CTA */}
            {stage !== STAGES.ENTRY && (
                <div className="mobile-sticky-search" onClick={handleReset}>
                    <button className="mobile-search-btn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                        </svg>
                        Start New Search
                    </button>
                </div>
            )}

            {/* Premium In-App Browser Modal */}
            {previewUrl && (
                <div className="modal-overlay" onClick={() => { setPreviewUrl(null); setPreviewIsSocial(false); setIsLiveView(false); }}>
                    <div className="preview-modal-minimal animate-scale-in" onClick={e => e.stopPropagation()}>

                        {/* Minimalist Header */}
                        <div className="modal-header-minimal">
                            <button className="minimal-back-btn" onClick={() => { setPreviewUrl(null); setPreviewIsSocial(false); setIsLiveView(false); }}>
                                ← Back
                            </button>
                        </div>

                        {/* Intelligence Container */}
                        <div className="modal-iframe-container" style={{ background: previewIsSocial && !isLiveView ? 'inherit' : '#fff' }}>
                            {(!previewIsSocial || isLiveView) ? (
                                previewIsSocial ? (
                                    <LivePreviewViewer
                                        url={previewUrl}
                                        onOpenOriginal={() => window.open(previewUrl, '_blank')}
                                    />
                                ) : (
                                    <iframe
                                        src={previewUrl}
                                        className="preview-iframe iframe-blend"
                                        title="Intelligence Preview"
                                        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                                    />
                                )
                            ) : (
                                <div className="mirror-content-scrollable">
                                    {renderPlatformMirror(previewPlatform, previewUrl)}
                                </div>
                            )}
                        </div>

                        {/* Minimalist Footer */}
                        <div className="modal-footer-minimal">
                            <button className="minimal-open-original-btn" onClick={() => window.open(previewUrl, '_blank')}>
                                Open Original Page
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {showFeedbackForm && (
                <div className="modal-overlay" onClick={() => setShowFeedbackForm(false)}>
                    <form className="precision-modal animate-scale-in" onSubmit={handleFeedbackSubmit} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>Intelligence Fallback</h2>
                            <p style={{ color: 'var(--text-soft)', margin: 0, fontSize: '0.9rem' }}>Initial discovery failed. Please provide exact attributes.</p>
                        </div>

                        <div className="modal-tabs" style={{ display: 'flex', gap: '1rem', padding: '0 1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)' }}>
                            <button
                                type="button"
                                className={`tab-btn ${searchMode === SEARCH_MODES.GENERAL ? 'active' : ''}`}
                                onClick={() => setSearchMode(SEARCH_MODES.GENERAL)}
                                style={{ padding: '0.75rem 0', background: 'none', border: 'none', color: searchMode === SEARCH_MODES.GENERAL ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 700, borderBottom: searchMode === SEARCH_MODES.GENERAL ? '2px solid var(--accent)' : 'none', cursor: 'pointer' }}
                            >
                                Name Search
                            </button>
                            <button
                                type="button"
                                className={`tab-btn ${searchMode === SEARCH_MODES.PHONE ? 'active' : ''}`}
                                onClick={() => setSearchMode(SEARCH_MODES.PHONE)}
                                style={{ padding: '0.75rem 0', background: 'none', border: 'none', color: searchMode === SEARCH_MODES.PHONE ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 700, borderBottom: searchMode === SEARCH_MODES.PHONE ? '2px solid var(--accent)' : 'none', cursor: 'pointer' }}
                            >
                                Number Search
                            </button>
                        </div>

                        <div className="modal-body">
                            {searchMode === SEARCH_MODES.GENERAL ? (
                                <div className="form-dense-group animate-fade-up">
                                    <div className="form-group">
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-soft)' }}>NAME (REQUIRED)</label>
                                        <input
                                            className="hero-search-input"
                                            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', padding: '0.75rem 1rem', fontSize: '1rem', width: '100%', boxSizing: 'border-box', color: 'var(--primary)' }}
                                            value={feedbackData.name}
                                            onChange={(e) => setFeedbackData({ ...feedbackData, name: e.target.value })}
                                            placeholder="Full legal name"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-soft)' }}>KEYWORD (REQUIRED)</label>
                                        <input
                                            className="hero-search-input"
                                            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', padding: '0.75rem 1rem', fontSize: '1rem', width: '100%', boxSizing: 'border-box', color: 'var(--primary)' }}
                                            value={feedbackData.keyword}
                                            onChange={(e) => setFeedbackData({ ...feedbackData, keyword: e.target.value })}
                                            placeholder="Company, Role, or Location"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-soft)' }}>LOCATION (OPTIONAL)</label>
                                        <input
                                            className="hero-search-input"
                                            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', padding: '0.75rem 1rem', fontSize: '1rem', width: '100%', boxSizing: 'border-box', color: 'var(--primary)' }}
                                            value={feedbackData.location || ""}
                                            onChange={(e) => setFeedbackData({ ...feedbackData, location: e.target.value })}
                                            placeholder="City, State, or Country"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="form-dense-group animate-fade-up">
                                    <div className="form-group">
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-soft)' }}>PHONE NUMBER</label>
                                        <input
                                            className="hero-search-input"
                                            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', padding: '0.75rem 1rem', fontSize: '1rem', width: '100%', boxSizing: 'border-box', color: 'var(--primary)' }}
                                            value={feedbackData.number}
                                            onChange={(e) => setFeedbackData({ ...feedbackData, number: e.target.value })}
                                            placeholder="e.g. +1 234 567 8900"
                                            required
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button type="button" className="nav-btn secondary" onClick={() => setShowFeedbackForm(false)}>Cancel</button>
                            <button type="submit" className="nav-btn primary">
                                Start Intelligent Discovery
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
        </div>
    );
};

export default MultiSearchPage;
