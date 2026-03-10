import { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import "./AuthModal.css";

const AuthModal = ({ isOpen, onClose }) => {
    const [isLoginView, setIsLoginView] = useState(true);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const { login } = useContext(AuthContext);
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const endpoint = isLoginView ? "/api/auth/login" : "/api/auth/signup";
            const payload = isLoginView ? { email, password } : { name, email, password };

            const res = await fetch(`${API_URL}${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Authentication failed");
            }

            login(data);
            onClose(); // Close modal on success
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleView = () => {
        setIsLoginView(!isLoginView);
        setError("");
        setName("");
        setEmail("");
        setPassword("");
    };

    return (
        <div className="auth-modal-overlay" onClick={onClose}>
            <div className="auth-modal-content animate-scale-in" onClick={(e) => e.stopPropagation()}>
                <button className="auth-modal-close" onClick={onClose}>×</button>

                <h2 className="auth-modal-title">{isLoginView ? "Welcome Back" : "Create Account"}</h2>
                <p className="auth-modal-subtitle">
                    {isLoginView
                        ? "Log in to access your saved intelligence reports."
                        : "Sign up to track and organize your deep searches."}
                </p>

                {error && <div className="auth-error-banner">{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    {!isLoginView && (
                        <div className="auth-form-group">
                            <label>Full Name</label>
                            <input
                                type="text"
                                placeholder="John Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                    )}
                    <div className="auth-form-group">
                        <label>Email Address</label>
                        <input
                            type="email"
                            placeholder="john@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="auth-form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="auth-submit-btn" disabled={loading}>
                        {loading ? "Processing..." : (isLoginView ? "Log In" : "Sign Up")}
                    </button>
                </form>

                <div className="auth-modal-footer">
                    {isLoginView ? "Don't have an account? " : "Already have an account? "}
                    <span className="auth-toggle-link" onClick={handleToggleView}>
                        {isLoginView ? "Sign up here" : "Log in here"}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default AuthModal;
