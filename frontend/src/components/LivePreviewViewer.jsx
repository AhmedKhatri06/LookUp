import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './LivePreviewViewer.css';

const LivePreviewViewer = ({ url, onOpenOriginal }) => {
    const [previewUrl, setPreviewUrl] = useState(null);
    const [fallbackUrl, setFallbackUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [useFallback, setUseFallback] = useState(false);
    const [authBlocked, setAuthBlocked] = useState(false);

    useEffect(() => {
        const fetchPreview = async () => {
            setLoading(true);
            setError(null);
            setUseFallback(false);
            setAuthBlocked(false);

            try {
                // Determine API base URL
                const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
                const response = await axios.get(`${apiUrl}/api/preview?url=${encodeURIComponent(url)}`);

                if (!response.data || !response.data.previewUrl) {
                    throw new Error("Invalid response format from preview API.");
                }

                setPreviewUrl(response.data.previewUrl);
                setFallbackUrl(response.data.fallbackUrl);
            } catch (err) {
                console.error("Failed to load preview URLs:", err);
                setError("Failed to load secure preview.");
                setUseFallback(true);
            } finally {
                setLoading(false);
            }
        };

        if (url) {
            fetchPreview();
        }
    }, [url]);

    useEffect(() => {
        const handleMessage = (event) => {
            if (event.data && event.data.type === 'URLBOX_AUTH_CLICKED') {
                console.log("Caught Auth Click from iframe.");
                setAuthBlocked(true);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const handleIframeError = () => {
        console.warn("Iframe experienced an error, attempting fallback.");
        setUseFallback(true);
    };

    return (
        <div className="live-preview-viewer">
            {loading && (
                <div className="preview-loading-state">
                    <div className="spinner"></div>
                    <p>Generating high-fidelity local preview...</p>
                </div>
            )}

            {!loading && error && (
                <div className="preview-error-state">
                    <p>{error}</p>
                    <button onClick={onOpenOriginal} className="open-original-btn">
                        Open Original Page in New Tab
                    </button>
                </div>
            )}

            {!loading && previewUrl && (
                <div className="preview-content-area">
                    <div className="screenshot-container">
                        <img 
                            src={previewUrl} 
                            alt="Web Page Preview" 
                            className="preview-screenshot animate-fade-in"
                        />
                        <div className="preview-footer-hint">
                            <span className="hint-icon">🖼️</span>
                            Static high-fidelity preview. Open original for full interaction.
                        </div>
                    </div>
                    
                    <button onClick={onOpenOriginal} className="open-original-btn-bottom">
                        Open Original Page
                    </button>
                </div>
            )}
        </div>
    );
};

export default LivePreviewViewer;
