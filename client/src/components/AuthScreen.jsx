import React, { useState } from 'react';
import GlassCard from './GlassCard';
import logo from '../assets/vudki.png';
import { motion, AnimatePresence } from 'framer-motion';

const EyeIcon = ({ show }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50">
        {show ? (
            <>
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
            </>
        ) : (
            <>
                <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                <line x1="2" x2="22" y1="2" y2="22" />
            </>
        )}
    </svg>
);

const MapPinIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
    </svg>
);

const AuthScreen = ({ onLogin }) => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Login State
    const [accountId, setAccountId] = useState('');
    const [loginPass, setLoginPass] = useState('');
    const [showLoginPass, setShowLoginPass] = useState(false);

    // Register State
    const [regUsername, setRegUsername] = useState('');
    const [regNickname, setRegNickname] = useState(''); // NEW Field
    const [regHouseName, setRegHouseName] = useState('');
    const [regAddress, setRegAddress] = useState('');
    const [regPass, setRegPass] = useState('');
    const [showRegPass, setShowRegPass] = useState(false);
    const [gender, setGender] = useState('male');

    // Address Suggestions (OpenStreetMap)
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const debounceRef = React.useRef(null);

    // Helper to sanitize input (alphanumeric only)
    const sanitize = (val) => val.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    // Fetch Address Suggestions from Nominatim (Debounced)
    const fetchAddressSuggestions = (query) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (query.length < 3) return;

        debounceRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=5&countrycodes=au`);
                const data = await res.json();
                setSuggestions(data);
                setShowSuggestions(true);
            } catch (e) {
                console.error("Failed to fetch address suggestions", e);
            }
        }, 800); // 800ms debounce
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Strict validation: Must contain exactly one dot
        if (accountId.split('.').length !== 2) {
            setError('Invalid Format. Only username.housename is valid');
            setLoading(false);
            return;
        }
        const [uName, hName] = accountId.split('.');
        if (!uName || uName.trim() === '' || !hName || hName.trim() === '') {
            setError('Invalid Format. Only username.housename is valid');
            setLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accountId, password: loginPass })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Login failed');

            onLogin(data.user, data.token);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Validation Logic
        const validateUser = (u) => {
            const regex = /^(?![_.])(?!.*[_.]{2})[a-zA-Z0-9._]{3,30}(?<![_.])$/;
            if (!regex.test(u)) return "Username: 3-30 chars, alphanumeric/./_, no spaces or consecutive symbols.";
            const reserved = ['admin', 'root', 'support', 'dev', 'developer'];
            if (reserved.includes(u.toLowerCase())) return "Username is reserved.";
            return null;
        };
        const validatePass = (p, u) => {
            if (p.length < 6 || p.length > 24) return "Password must be 6-24 characters.";
            if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(p)) return "Password must have uppercase, lowercase, number.";
            if (u && p.toLowerCase().includes(u.toLowerCase())) return "Password cannot contain username.";
            if (/(.)\1{3,}/.test(p)) return "Password has too many repeated chars.";
            if (/1234|abcd|qwerty/.test(p.toLowerCase())) return "Password contains weak sequences.";
            return null;
        };

        const uErr = validateUser(regUsername);
        if (uErr) { setError(uErr); setLoading(false); return; }
        const pErr = validatePass(regPass, regUsername);
        if (pErr) { setError(pErr); setLoading(false); return; }

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: regUsername,
                    nickname: regNickname, // NEW
                    password: regPass,
                    houseName: regHouseName,
                    address: regAddress,
                    gender: gender
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Registration failed');

            alert(`House created! Login with: ${regUsername}.${regHouseName}`);
            setIsRegistering(false);
            setAccountId(`${regUsername}.${regHouseName}`);
            setLoginPass('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getUserLocation = () => {
        if (navigator.geolocation) {
            setLoading(true);

            // Set timeout for geolocation (10 seconds max)
            const timeout = setTimeout(() => {
                setLoading(false);
                alert("Location detection taking too long. Please enter manually.");
            }, 10000);

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    clearTimeout(timeout);
                    const { latitude, longitude } = position.coords;
                    try {
                        // Reverse Geocoding with OpenStreetMap (with timeout)
                        const controller = new AbortController();
                        const fetchTimeout = setTimeout(() => controller.abort(), 5000);

                        const res = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
                            { signal: controller.signal }
                        );
                        clearTimeout(fetchTimeout);
                        const data = await res.json();
                        setRegAddress(data.display_name || `Lat: ${latitude}, Long: ${longitude}`);
                    } catch (e) {
                        // Fallback to coordinates if geocoding fails
                        setRegAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
                    }
                    setLoading(false);
                },
                (error) => {
                    clearTimeout(timeout);
                    setLoading(false);
                    // More specific error messages
                    if (error.code === 1) {
                        alert("Location permission denied. Please enter address manually.");
                    } else if (error.code === 2) {
                        alert("Location unavailable. Please enter address manually.");
                    } else {
                        alert("Could not get location. Please enter manually.");
                    }
                },
                {
                    enableHighAccuracy: false, // Use network location for speed
                    timeout: 8000, // 8 second timeout for GPS
                    maximumAge: 300000 // Cache location for 5 minutes
                }
            );
        } else {
            alert("Geolocation is not supported by this browser.");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-md"
            >
                <GlassCard className="w-full p-8 space-y-6">
                    {/* Logo Header - Tighter Circle */}
                    <div className="flex flex-col items-center mb-8">
                        {/* Reduced circle size from w-40 to w-32, keeping image large (w-28) to reduce padding look */}
                        <div className="w-32 h-32 mb-4 bg-white/20 rounded-full flex items-center justify-center shadow-inner">
                            <img src={logo} alt="Vudki" className="w-28 h-28 object-contain" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Vudki</h1>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-3 bg-rose-100/80 border border-rose-200 text-rose-600 text-xs font-bold rounded-xl text-center"
                        >
                            {error}
                        </motion.div>
                    )}

                    {isRegistering ? (
                        <motion.form
                            key="register"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            onSubmit={handleRegister}
                            className="space-y-4"
                        >
                            <h2 className="text-xl font-bold text-slate-700 text-center mb-6">Create Admin Account</h2>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">House Name (ID)</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. daisy"
                                    value={regHouseName}
                                    onChange={e => setRegHouseName(sanitize(e.target.value))}
                                    className="w-full p-2.5 bg-white/40 border border-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-800 placeholder:font-normal text-sm"
                                />
                            </div>

                            {/* Username & Nickname Row */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="min-w-0">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Username (Login)</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. admin"
                                        value={regUsername}
                                        onChange={e => setRegUsername(sanitize(e.target.value))}
                                        className="w-full p-2.5 bg-white/40 border border-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-800 placeholder:font-normal text-sm"
                                    />
                                </div>
                                <div className="min-w-0">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nickname (Display)</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Admin User"
                                        value={regNickname}
                                        onChange={e => setRegNickname(e.target.value)}
                                        className="w-full p-2.5 bg-white/40 border border-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-800 placeholder:font-normal text-sm"
                                    />
                                </div>
                            </div>

                            <div className="relative">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
                                <div className="relative">
                                    <input
                                        type={showRegPass ? "text" : "password"}
                                        required
                                        value={regPass}
                                        onChange={e => setRegPass(e.target.value)}
                                        className="w-full p-2.5 bg-white/40 border border-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-800 text-sm pr-8"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowRegPass(!showRegPass)}
                                        className="absolute right-2 top-2.5"
                                    >
                                        <EyeIcon show={showRegPass} />
                                    </button>
                                </div>
                            </div>

                            <div className="relative">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">House Address / Location</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Type to search..."
                                        value={regAddress}
                                        onChange={e => {
                                            setRegAddress(e.target.value);
                                            fetchAddressSuggestions(e.target.value);
                                        }}
                                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                        className="w-full p-2.5 bg-white/40 border border-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-800 placeholder:font-normal text-sm pr-8"
                                    />
                                    <button
                                        type="button"
                                        onClick={getUserLocation}
                                        className="absolute right-2 top-2.5 hover:scale-110 transition-transform"
                                        title="Use Current Location"
                                    >
                                        <MapPinIcon />
                                    </button>
                                </div>

                                <AnimatePresence>
                                    {showSuggestions && suggestions.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                            className="absolute z-50 w-full mt-1 bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-white/50 overflow-hidden"
                                        >
                                            {suggestions.map((item, i) => (
                                                <div
                                                    key={i}
                                                    className="p-2 text-xs font-semibold text-slate-600 hover:bg-indigo-50 cursor-pointer border-b border-slate-100 last:border-0 truncate"
                                                    onClick={() => { setRegAddress(item.display_name); setShowSuggestions(false); }}
                                                >
                                                    {item.display_name}
                                                </div>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all mt-2"
                            >
                                {loading ? 'Creating...' : 'Create Admin Account'}
                            </button>

                            <p className="text-center text-xs text-slate-500 mt-4 cursor-pointer hover:text-indigo-600 font-bold" onClick={() => setIsRegistering(false)}>
                                Back to Login
                            </p>
                        </motion.form>
                    ) : (
                        <motion.form
                            key="login"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            onSubmit={handleLogin}
                            className="space-y-4"
                        >
                            <h2 className="text-xl font-bold text-slate-700 text-center mb-6">Welcome Back</h2>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Account ID</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="username.housename"
                                    value={accountId}
                                    onChange={e => setAccountId(e.target.value.toLowerCase())}
                                    className="w-full p-3 bg-white/40 border border-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-800 placeholder:text-slate-400 placeholder:font-normal text-base"
                                />
                            </div>

                            <div className="relative">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
                                <div className="relative">
                                    <input
                                        type={showLoginPass ? "text" : "password"}
                                        required
                                        placeholder="••••••••"
                                        value={loginPass}
                                        onChange={e => setLoginPass(e.target.value)}
                                        className="w-full p-3 bg-white/40 border border-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-800 placeholder:text-slate-400 text-base pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowLoginPass(!showLoginPass)}
                                        className="absolute right-3 top-3.5"
                                    >
                                        <EyeIcon show={showLoginPass} />
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all text-base mt-2"
                            >
                                {loading ? 'Logging in...' : 'Login'}
                            </button>

                            <div className="text-center pt-4 border-t border-slate-300/20">
                                <p className="text-xs text-slate-500 mb-2">New here?</p>
                                <button type="button" onClick={() => setIsRegistering(true)} className="text-indigo-600 font-bold text-sm hover:underline">
                                    Create Admin Account
                                </button>
                            </div>
                        </motion.form>
                    )}
                </GlassCard>
            </motion.div>
        </div>
    );
};

export default AuthScreen;
