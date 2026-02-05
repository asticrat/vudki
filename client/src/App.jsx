import React, { useState, useEffect } from 'react';
import BalanceCard from './components/BalanceCard';
import ReceiptList from './components/ReceiptList';
import UploadButton from './components/UploadButton';
import ReceiptUploadMethods from './components/ReceiptUploadMethods';
import GlassCard from './components/GlassCard';
import AuthScreen from './components/AuthScreen';
import logo from './assets/vudki.png';
import { motion, AnimatePresence } from 'framer-motion';

// Icons
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
const CameraIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>;
const HistoryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;

const MALE_AVATARS = ['male/avatar1.png', 'male/avatar2.png', 'male/avatar3.png', 'male/avatar5.png', 'male/avatar6.png'];
const FEMALE_AVATARS = ['female/avatar4.png'];

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

function App() {
  const [user, setUser] = useState(null); // { id, username, nickname, role, fullId }
  const [token, setToken] = useState(null);

  const [activeTab, setActiveTab] = useState('home');
  const [balances, setBalances] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Auth Logic
  useEffect(() => {
    const storedToken = localStorage.getItem('vudki_token');
    const storedUser = localStorage.getItem('vudki_user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogin = (userData, authToken) => {
    setToken(authToken);
    setUser(userData);
    localStorage.setItem('vudki_token', authToken);
    localStorage.setItem('vudki_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('vudki_token');
    localStorage.removeItem('vudki_user');
    setActiveTab('home');
  };

  // API Helper
  const apiCall = async (endpoint, options = {}) => {
    if (!token) return;
    const res = await fetch(endpoint, {
      ...options,
      cache: 'no-store',
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      }
    });
    if (res.status === 401 || res.status === 403) {
      handleLogout();
      throw new Error("Session expired. Please login again.");
    }
    return res;
  };

  // Data Fetching
  const fetchData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const [balanceRes, receiptRes] = await Promise.all([
        apiCall('/api/balances'),
        apiCall('/api/receipts')
      ]);

      if (!balanceRes.ok || !receiptRes.ok) {
        throw new Error(`Failed to fetch data (Status: B${balanceRes.status}/R${receiptRes.status})`);
      }

      const balanceData = await balanceRes.json();
      const receiptData = await receiptRes.json();

      setBalances(balanceData.balances || []);
      setReceipts(receiptData || []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not connect to server or session expired.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on token change or activeTab change (if needed)
  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  // --- VIEWS ---

  if (!token) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  const PageTransition = ({ children }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );

  const HomeView = () => {
    const [analytics, setAnalytics] = useState(null);

    // Fetch analytics if developer
    React.useEffect(() => {
      if (user.role === 'developer') {
        apiCall('/api/dev/analytics')
          .then(res => res.json())
          .then(data => setAnalytics(data))
          .catch(err => console.error('Analytics error:', err));
      }
    }, [user.role]);

    // Developer Analytics Dashboard
    if (user.role === 'developer') {
      return (
        <PageTransition>
          <div className="space-y-6">
            <GlassCard className="!p-6 text-center">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">🔧 Developer Portal</h2>
              <p className="text-sm text-slate-500">Vudki Platform Analytics</p>
            </GlassCard>

            {analytics ? (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <GlassCard className="!p-6 text-center">
                    <div className="text-4xl font-black text-indigo-600 mb-2">{analytics.totalHouseholds}</div>
                    <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">Total Households</div>
                  </GlassCard>

                  <GlassCard className="!p-6 text-center">
                    <div className="text-4xl font-black text-purple-600 mb-2">{analytics.totalUsers}</div>
                    <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">Total Users</div>
                  </GlassCard>
                </div>

                <GlassCard className="!p-6 text-center">
                  <div className="text-5xl font-black text-emerald-600 mb-2">{analytics.totalReceipts}</div>
                  <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">Total Receipts Scanned</div>
                </GlassCard>

                {/* Households List */}
                <section>
                  <h3 className="text-sm uppercase tracking-wider text-slate-600 font-bold mb-3 ml-1">Active Households</h3>
                  <div className="space-y-2">
                    {analytics.households.map((house, idx) => (
                      <GlassCard key={idx} className="!p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-bold text-slate-700">{house.house_name}</div>
                            <div className="text-xs text-slate-400">{house.user_count} member{house.user_count !== 1 ? 's' : ''}</div>
                          </div>
                          {house.last_receipt_date && (
                            <div className="text-xs text-slate-500">
                              Last activity: {new Date(house.last_receipt_date).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </GlassCard>
                    ))}
                  </div>
                </section>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
                <p className="text-slate-500 mt-4">Loading analytics...</p>
              </div>
            )}
          </div>
        </PageTransition>
      );
    }

    // Regular Home View for normal users
    return (
      <PageTransition>
        <div className="space-y-6">
          <GlassCard className="!p-6 flex flex-col items-center justify-center text-center">
            <h3 className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-2 opacity-80">House Total Expense</h3>
            <div className="text-6xl font-black text-slate-800 tracking-tighter drop-shadow-sm flex items-start justify-center">
              <span className="text-3xl font-medium text-slate-400 relative top-2 mr-1">$</span>
              <span>{receipts.reduce((sum, r) => sum + parseFloat(r.amount), 0).toFixed(2)}</span>
            </div>
          </GlassCard>

          <section>
            <h3 className="text-sm uppercase tracking-wider text-slate-600 font-bold mb-3 ml-1">Your Standing</h3>
            <GlassCard className="!p-4 bg-gradient-to-br from-emerald-50/50 to-emerald-100/30">
              {(() => {
                const myBal = balances.find(u => u.id === user.id)?.balance || 0;
                return (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${myBal >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                        {myBal >= 0 ? '+' : '-'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase">
                          {myBal >= 0 ? 'You should be getting' : 'You are expected to give'}
                        </p>
                        <p className="text-xl font-bold text-slate-800">$ {Math.abs(myBal).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </GlassCard>
          </section>

          <section>
            <h3 className="text-sm uppercase tracking-wider text-slate-600 font-bold mb-3 ml-1">Housemates</h3>
            {loading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-16 bg-white/20 rounded-xl"></div>
                <div className="h-16 bg-white/20 rounded-xl"></div>
              </div>
            ) : balances.filter(u => u.id !== user.id).length > 0 ? (
              <div className="space-y-3">
                {balances.filter(u => u.id !== user.id).map(u => <BalanceCard key={u.id} user={u} />)}
              </div>
            ) : (
              <GlassCard className="py-4 text-center">
                <p className="text-slate-500">No housemates yet.</p>
              </GlassCard>
            )}
          </section>
        </div>
      </PageTransition>
    );
  };

  const AddReceiptView = () => {
    const [mode, setMode] = useState('selection'); // selection, analyzing, editing
    const [formData, setFormData] = useState({ amount: '', date: '', description: '', imagePath: null });
    const fileInputRef = React.useRef(null);
    const cameraInputRef = React.useRef(null);

    const handleFileSelect = async (file) => {
      if (!file) return;
      setMode('analyzing');
      const fd = new FormData();
      fd.append('receipt', file);

      try {
        const res = await apiCall('/api/receipts/analyze', { method: 'POST', body: fd });
        const json = await res.json();
        setFormData({
          amount: json.data.amount,
          date: json.data.date,
          description: 'Receipt',
          imagePath: json.data.imagePath
        });
        setMode('editing');
      } catch (e) {
        alert("OCR failed: " + e.message);
        setMode('selection');
      }
    };

    // Handler for camera capture (always uses auto-fill)
    const handleCameraCapture = async (file) => {
      await handleFileSelect(file);
    };

    // Handler for gallery upload with auto-fill option
    const handleUploadWithOption = async (file, autoFill) => {
      if (!file) return;

      if (autoFill) {
        // Use OCR to extract data
        await handleFileSelect(file);
      } else {
        // Manual entry - just upload the image
        setMode('analyzing');
        const fd = new FormData();
        fd.append('skipOCR', 'true');
        fd.append('receipt', file);

        try {
          const res = await apiCall('/api/receipts/analyze', { method: 'POST', body: fd });
          const json = await res.json();
          // Only save image path, user will enter amount/date manually
          setFormData({
            amount: '',
            date: new Date().toISOString().split('T')[0],
            description: '',
            imagePath: json.data.imagePath
          });
          setMode('editing');
        } catch (e) {
          alert("Upload failed: " + e.message);
          setMode('selection');
        }
      }
    };

    const handleSave = async () => {
      if (!formData.amount) return alert("Please enter an amount");
      if (!formData.description) return alert("Please enter a description"); // Mandate description

      try {
        setLoading(true);
        const res = await apiCall('/api/receipts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (!res.ok) throw new Error("Failed to save");

        fetchData();
        alert("Receipt Saved!");
        setActiveTab('history');
      } catch (e) {
        alert(e.message);
      } finally {
        setLoading(false);
      }
    };

    return (
      <PageTransition>
        <div className="space-y-6 pt-4">
          <h2 className="text-2xl font-bold text-slate-800 text-center drop-shadow-sm">Add Receipt</h2>

          {mode === 'selection' && (
            <ReceiptUploadMethods
              onCameraCapture={handleCameraCapture}
              onUploadWithOption={handleUploadWithOption}
              uploading={mode === 'analyzing'}
            />
          )}

          {mode === 'analyzing' && (
            <GlassCard className="min-h-[300px] flex items-center justify-center">
              <div className="flex flex-col items-center justify-center">
                <div className="relative w-16 h-16 mb-4">
                  <svg className="animate-spin" width="64" height="64" viewBox="0 0 50 50">
                    <circle
                      className="opacity-25"
                      cx="25"
                      cy="25"
                      r="20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <circle
                      className="text-indigo-500"
                      cx="25"
                      cy="25"
                      r="20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray="31.4 94.2"
                    />
                  </svg>
                </div>
                <p className="font-bold text-slate-600 text-lg">Analyzing Receipt...</p>
                <p className="text-xs text-slate-400">Extracting amount and date</p>
              </div>
            </GlassCard>
          )}

          {mode === 'editing' && (
            <div className="space-y-4">
              <GlassCard>
                <div className="space-y-4">
                  {formData.imagePath && (
                    <div className="h-32 w-full bg-slate-100 rounded-xl overflow-hidden relative mb-4 border border-white/50">
                      <img src={`/${formData.imagePath}`} className="w-full h-full object-cover opacity-80" alt="Receipt" />
                      <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded-lg backdrop-blur-md">
                        Scanned
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Amount ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={e => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full text-3xl font-black text-slate-800 bg-transparent border-b-2 border-slate-200 focus:border-indigo-500 outline-none py-2 placeholder:text-slate-300"
                      placeholder="0.00"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Description</label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      className="w-full p-2 bg-white/40 border border-white/50 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Date</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                      className="w-full p-2 bg-white/40 border border-white/50 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    />
                  </div>
                </div>
              </GlassCard>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setMode('selection')}
                  className="py-3 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="py-3 bg-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/30 hover:bg-indigo-600 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      </PageTransition>
    );
  };


  const handleDeleteReceipt = async (receiptId) => {
    if (!confirm("Are you sure you want to delete this receipt? This will affect balances.")) return;
    try {
      setLoading(true);
      const res = await apiCall(`/api/receipts/${receiptId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      alert("Receipt deleted.");
      fetchData(); // Refresh data
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const HistoryView = () => (
    <PageTransition>
      <div className="space-y-6 pt-4">
        <h2 className="text-2xl font-bold text-slate-800 text-center drop-shadow-sm">Receipt History</h2>
        {loading ? (
          <div className="animate-pulse h-64 bg-white/20 rounded-3xl"></div>
        ) : (
          <div className="relative">
            <ReceiptList receipts={receipts} onDelete={handleDeleteReceipt} currentUser={user} />
          </div>
        )}
      </div>
    </PageTransition>
  );

  const SettingsView = () => {
    const [newMemberName, setNewMemberName] = useState('');
    const [newMemberNickname, setNewMemberNickname] = useState('');
    const [newMemberPass, setNewMemberPass] = useState('');
    const [newMemberGender, setNewMemberGender] = useState('male');
    const [showAddMember, setShowAddMember] = useState(false);

    // Deletion State
    const [deleteModalUser, setDeleteModalUser] = useState(null);
    const [adminPassForDelete, setAdminPassForDelete] = useState('');

    // Change Password State
    const [showChangePass, setShowChangePass] = useState(false);
    const [oldPass, setOldPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [showEditProfile, setShowEditProfile] = useState(false);

    // Change Nickname State
    const [showChangeNickname, setShowChangeNickname] = useState(false);
    const [newUserNickname, setNewUserNickname] = useState('');

    // Change Username State
    const [showChangeUsername, setShowChangeUsername] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [showChangeAvatar, setShowChangeAvatar] = useState(false);
    const [selectedAvatar, setSelectedAvatar] = useState(user.avatar || 'male/avatar1.png');

    // Reset House Data State
    const [showResetHouse, setShowResetHouse] = useState(false);
    const [resetPassword, setResetPassword] = useState('');

    // Delete Household State
    const [showDeleteHouse, setShowDeleteHouse] = useState(false);
    const [deleteHousePassword, setDeleteHousePassword] = useState('');

    const handleResetHouseData = async () => {
      if (!resetPassword) return alert('Please enter your password');
      if (!confirm('⚠️ WARNING: This will delete ALL receipts and reset all balances to $0.00. This action CANNOT be undone. Are you absolutely sure?')) return;

      try {
        const res = await apiCall('/api/house/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminPassword: resetPassword })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to reset house data');

        alert('✅ All house data has been reset successfully!');
        setResetPassword('');
        setShowResetHouse(false);
        fetchData(); // Refresh to show empty state
      } catch (e) {
        alert(e.message);
      }
    };

    const handleDeleteHousehold = async () => {
      if (!deleteHousePassword) return alert('Please enter your password');
      if (!confirm('⛔ CRITICAL WARNING ⛔\n\nThis will PERMANENTLY DELETE your entire household, all members, and all data.\n\nTHIS CANNOT BE UNDONE.\n\nAre you absolutely sure?')) return;

      try {
        const res = await apiCall('/api/house/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminPassword: deleteHousePassword })
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to delete household');
        }

        alert('✅ Household deleted successfully. Logging out.');
        handleLogout();
      } catch (e) {
        alert(e.message);
      }
    };

    const handlePromoteMember = async (userId, userName) => {
      if (!confirm(`Promote ${userName} to Co-Admin? They will be able to reset house data but cannot add/remove members.`)) return;

      try {
        const res = await apiCall('/api/members/promote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to promote member');

        alert(`✅ ${userName} is now a Co-Admin!`);
        fetchData(); // Refresh member list
      } catch (e) {
        alert(e.message);
      }
    };

    const handleDemoteMember = async (userId, userName) => {
      if (!confirm(`Demote ${userName} back to regular Member?`)) return;

      try {
        const res = await apiCall('/api/members/demote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to demote member');

        alert(`${userName} is now a regular Member`);
        fetchData(); // Refresh member list
      } catch (e) {
        alert(e.message);
      }
    };

    const handleChangeAvatar = async () => {
      try {
        const res = await apiCall('/api/user/update-avatar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatar: selectedAvatar })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update avatar');

        // Update user state immediately
        setUser(prev => ({ ...prev, avatar: selectedAvatar }));
        alert('Avatar updated successfully!');
        setShowChangeAvatar(false);
        fetchData(); // Refresh to show new avatar in member list
      } catch (e) {
        alert(e.message);
      }
    };

    const handleTransferAdmin = async (userId, userName) => {
      const password = prompt(`⚠️ TRANSFER ADMIN ROLE TO ${userName.toUpperCase()}?\n\nYou will become a regular Member and lose admin privileges.\n\nEnter your password to confirm:`);
      if (!password) return;

      try {
        const res = await apiCall('/api/members/transfer-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, adminPassword: password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to transfer admin role');

        alert(`✅ Admin role transferred to ${userName}!\n\nYou are now a regular Member. Logging out...`);
        // Logout since role changed
        setToken(null);
        setUser(null);
        localStorage.removeItem('vudki_token');
      } catch (e) {
        alert(e.message);
      }
    };

    const handleTransferCoAdmin = async (userId, userName) => {
      const password = prompt(`⚠️ TRANSFER CO-ADMIN ROLE TO ${userName.toUpperCase()}?\n\nYou will become a regular Member.\n\nEnter your password to confirm:`);
      if (!password) return;

      try {
        const res = await apiCall('/api/members/transfer-coadmin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to transfer co-admin role');

        alert(`✅ Co-Admin role transferred to ${userName}!\n\nYou are now a regular Member. Logging out...`);
        // Logout since role changed
        setToken(null);
        setUser(null);
        localStorage.removeItem('vudki_token');
      } catch (e) {
        alert(e.message);
      }
    };

    const handleChangeUsername = async () => {
      if (!newUsername) return alert('Please enter a new username');
      // Sanitize username
      const sanitizedUsername = newUsername.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      if (sanitizedUsername !== newUsername) {
        return alert('Username must be alphanumeric only');
      }
      try {
        const res = await apiCall('/api/user/update-username', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newUsername: sanitizedUsername })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update username');

        alert(`Username Updated! New Login ID: ${sanitizedUsername}.${user.houseName}\nPlease log in again with your new username.`);
        // Log the user out so they can log in with new username
        setToken(null);
        setUser(null);
        localStorage.removeItem('vudki_token');
      } catch (e) {
        alert(e.message);
      }
    };

    const handleChangeNickname = async () => {
      if (!newUserNickname) return alert('Please enter a new nickname');
      try {
        const res = await apiCall('/api/user/update-nickname', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newNickname: newUserNickname })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update nickname');

        alert('Nickname Updated! Please refresh or re-login to see changes strictly.');
        setNewUserNickname('');
        setShowChangeNickname(false);
        // Optimistic update locally or fetch data
        setUser(prev => ({ ...prev, nickname: newUserNickname }));
        fetchData();
      } catch (e) {
        alert(e.message);
      }
    };

    const handleChangePassword = async () => {
      if (!oldPass || !newPass) return alert('Fill all fields');
      try {
        const res = await apiCall('/api/user/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oldPassword: oldPass, newPassword: newPass })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update password');
        alert('Password Updated Successfully');
        setOldPass('');
        setNewPass('');
        setShowChangePass(false);
      } catch (e) {
        alert(e.message);
      }
    };

    const handleAddMember = async () => {
      if (!newMemberName || !newMemberPass || !newMemberNickname) return alert('Fill all fields');

      const uErr = validateUser(newMemberName);
      if (uErr) return alert(uErr);
      const pErr = validatePass(newMemberPass, newMemberName);
      if (pErr) return alert(pErr);

      try {
        const res = await apiCall('/api/members', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: newMemberName,
            nickname: newMemberNickname,
            password: newMemberPass,
            gender: newMemberGender
          })
        });
        if (!res.ok) throw new Error('Failed to add member');
        alert(`Member Added! Login ID: ${newMemberName}.${user.houseName}`);
        setNewMemberName('');
        setNewMemberNickname('');
        setNewMemberPass('');
        setNewMemberGender('male');
        setShowAddMember(false);
        fetchData();
      } catch (e) {
        alert(e.message);
      }
    };

    const handleDeleteMember = async () => {
      if (!adminPassForDelete) return alert('Enter Admin Password');
      try {
        const res = await apiCall('/api/members/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: deleteModalUser.id,
            adminPassword: adminPassForDelete
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to delete');

        alert('Member Removed.');
        setDeleteModalUser(null);
        setAdminPassForDelete('');
        fetchData();
      } catch (e) {
        alert(e.message);
      }
    };

    return (
      <PageTransition>
        <div className="space-y-6 pt-4 relative">
          <h2 className="text-2xl font-bold text-slate-800 text-center drop-shadow-sm">Settings</h2>

          {/* Large Avatar Display at Top */}
          <div className="flex flex-col items-center mb-6">
            <img
              src={`/avatars/${user.avatar || 'male/avatar1.png'}`}
              alt="Your Avatar"
              className="w-32 h-32 rounded-full border-4 border-white shadow-lg mb-3"
            />
            <div className="text-center">
              <div className="text-xl font-bold text-slate-800">{user.name}</div>
              <div className="text-sm text-slate-500">@{user.username}</div>
              <div className="mt-2">
                <span className="text-[10px] px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full uppercase font-bold tracking-wider">
                  {user.role}
                </span>
              </div>
            </div>
          </div>

          {/* Two separate cards for better organization */}
          <GlassCard className="mb-6">
            {/* Edit Profile Button (Entry Point - Simplified & Transparent) */}
            {!showEditProfile && (
              <button
                onClick={() => {
                  setNewUserNickname(user.nickname);
                  setNewUsername(user.username);
                  setSelectedAvatar(user.avatar || 'male/avatar1.png');
                  setShowChangePass(false);
                  setOldPass('');
                  setNewPass('');
                  setShowEditProfile(true);
                }}
                className="w-full py-3 bg-white/20 text-slate-700 font-bold rounded-xl border border-white/20 hover:bg-white/30 transition-all flex justify-between items-center px-4 shadow-sm"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-1.5 bg-indigo-100/50 rounded-lg text-indigo-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  </div>
                  <span>Edit Profile</span>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            )}

            {/* Edit Profile Entry Screen */}
            <AnimatePresence>
              {showEditProfile && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-white/10 rounded-xl border border-white/20 p-5 space-y-8 mt-2 backdrop-blur-sm">
                    <div className="flex justify-between items-center border-b border-white/10 pb-3">
                      <h4 className="font-bold text-slate-700 text-lg">Edit Profile</h4>
                      <button onClick={() => setShowEditProfile(false)} className="text-xs font-bold text-slate-400 hover:text-slate-600 px-2 py-1 bg-white/20 rounded-lg">Cancel</button>
                    </div>

                    {/* Section 1 - Avatar & Role */}
                    <div className="flex flex-col items-center space-y-4">
                      <div className="relative">
                        <img src={`/avatars/${selectedAvatar}`} className="w-28 h-28 rounded-full border-4 border-white/50 shadow-lg" />
                        <button
                          onClick={() => setShowChangeAvatar(!showChangeAvatar)}
                          className="absolute bottom-0 right-0 p-2 bg-indigo-500 text-white rounded-full shadow-md hover:bg-indigo-600 transition-colors border-2 border-white"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                        </button>
                      </div>

                      <div className="text-center">
                        <div className="text-sm font-bold text-slate-600">@{user.username}</div>
                        <div className="mt-1">
                          <span className="text-[10px] px-3 py-1 bg-indigo-100/50 text-indigo-700 rounded-full uppercase font-bold tracking-wider shadow-sm border border-indigo-100/50">
                            {user.role}
                          </span>
                        </div>
                      </div>

                      <AnimatePresence>
                        {showChangeAvatar && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="w-full overflow-hidden">
                            <div className="bg-white/30 p-3 rounded-xl border border-white/20">
                              <div className="text-[10px] font-bold text-slate-500 uppercase mb-2 text-center">Select New Avatar</div>
                              <div className="grid grid-cols-6 gap-2">
                                {((user.gender || 'male') === 'female' ? FEMALE_AVATARS : MALE_AVATARS).map((avatar) => {
                                  const usedAvatars = balances.filter(u => u.id !== user.id).map(u => u.avatar);
                                  const isUsed = usedAvatars.includes(avatar);
                                  const isSelected = selectedAvatar === avatar;
                                  return (
                                    <button
                                      key={avatar}
                                      onClick={() => !isUsed && setSelectedAvatar(avatar)}
                                      disabled={isUsed}
                                      className={`p-1 rounded-lg border-2 transition-all relative ${isSelected ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' : isUsed ? 'grayscale opacity-30 cursor-not-allowed border-transparent' : 'border-transparent hover:border-indigo-300'}`}
                                    >
                                      <img src={`/avatars/${avatar}`} className="w-full rounded-full" />
                                    </button>
                                  );
                                })}
                              </div>
                              {/* No Avatars Check */}
                              {((user.gender || 'male') === 'female' ? FEMALE_AVATARS : MALE_AVATARS).every(a => balances.filter(u => u.id !== user.id).some(u => u.avatar === a)) && (
                                <p className="text-[10px] text-rose-500 mt-2 font-bold text-center bg-rose-50 py-1 rounded-lg border border-rose-100">
                                  No avatars available. Please create a custom one.
                                </p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Section 2 - Basic Info */}
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Nickname</label>
                        <input type="text" value={newUserNickname} onChange={(e) => setNewUserNickname(e.target.value)} className="w-full p-3 rounded-xl bg-white/40 border border-white/20 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm transition-all focus:bg-white/60" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Username</label>
                        <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="w-full p-3 rounded-xl bg-white/40 border border-white/20 text-sm font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-sm transition-all focus:bg-white/60" />
                        {newUsername !== user.username && <div className="text-[10px] text-amber-600 mt-1 pl-1 font-bold">⚠️ Changing username requires re-login</div>}
                      </div>
                    </div>

                    {/* Section 3 - Security */}
                    <div className="space-y-3 pt-2 border-t border-white/10">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Password</label>
                        <button onClick={() => setShowChangePass(!showChangePass)} className="text-xs font-bold text-indigo-600 hover:text-indigo-800">
                          {showChangePass ? 'Cancel Change' : 'Change Password'}
                        </button>
                      </div>

                      {!showChangePass ? (
                        <div className="w-full p-3 rounded-xl bg-slate-100/30 border border-white/20 text-slate-400 font-mono text-sm tracking-widest">
                          ••••••••
                        </div>
                      ) : (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 p-3 bg-indigo-50/30 rounded-xl border border-indigo-100/50">
                          <input type="password" placeholder="Current Password" value={oldPass} onChange={(e) => setOldPass(e.target.value)} className="w-full p-3 rounded-lg bg-white/60 border border-indigo-100/50 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                          <input type="password" placeholder="New Password" value={newPass} onChange={(e) => setNewPass(e.target.value)} className="w-full p-3 rounded-lg bg-white/60 border border-indigo-100/50 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                        </motion.div>
                      )}
                    </div>

                    {/* Section 4 - Actions */}
                    <div className="pt-4">
                      <button
                        onClick={async () => {
                          let hasChanges = false;
                          let needsLogout = false;
                          let updatedUser = { ...user };

                          // Validations
                          if (showChangePass && newPass) {
                            const pErr = validatePass(newPass, user.username);
                            if (pErr) return alert(pErr);
                          }
                          if (newUsername !== user.username) {
                            const uErr = validateUser(newUsername);
                            if (uErr) return alert(uErr);
                          }

                          // Avatar
                          if (selectedAvatar !== user.avatar) {
                            try {
                              await apiCall('/api/user/update-avatar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ avatar: selectedAvatar }) });
                              updatedUser.avatar = selectedAvatar;
                              hasChanges = true;
                            } catch (e) { return alert('Avatar Error: ' + e.message); }
                          }

                          // Nickname
                          if (newUserNickname !== user.nickname) {
                            try {
                              await apiCall('/api/user/update-nickname', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ newNickname: newUserNickname }) });
                              updatedUser.nickname = newUserNickname;
                              hasChanges = true;
                            } catch (e) { return alert('Nickname Error: ' + e.message); }
                          }

                          // Password
                          if (showChangePass && oldPass && newPass) {
                            try {
                              const res = await apiCall('/api/user/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oldPassword: oldPass, newPassword: newPass }) });
                              if (!res.ok) throw new Error();
                              hasChanges = true;
                            } catch (e) { return alert('Password Change Failed (Check old password)'); }
                          }

                          // Username
                          if (newUsername !== user.username) {
                            try {
                              const res = await apiCall('/api/user/update-username', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ newUsername }) });
                              if (res.ok) {
                                needsLogout = true;
                              } else {
                                const d = await res.json();
                                return alert(d.error || 'Username change failed');
                              }
                            } catch (e) { return alert('Username Error: ' + e.message); }
                          }

                          if (needsLogout) {
                            alert('Username updated! Logging out...');
                            handleLogout();
                          } else if (hasChanges) {
                            setUser(updatedUser);
                            localStorage.setItem('vudki_user', JSON.stringify(updatedUser));
                            alert('✅ Profile Updated Successfully');
                            setBalances(prev => prev.map(m => String(m.id) === String(user.id) ? { ...m, avatar: updatedUser.avatar, name: updatedUser.nickname } : m));

                            setShowChangePass(false);
                            setOldPass('');
                            setNewPass('');
                            fetchData();
                          }
                        }}
                        disabled={loading}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span>Save Changes</span>
                      </button>
                    </div>

                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center justify-between mb-3 ml-1">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase">Members</h3>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{balances.length} Active</span>
            </div>

            <div className="space-y-3">
              {/* List existing mems (Unified View) */}
              <div className="space-y-2">
                {[...balances].sort((a, b) => {
                  // Admin first, then co-admin, then members
                  const roleOrder = { 'admin': 0, 'co-admin': 1, 'member': 2, 'developer': 3 };
                  return roleOrder[a.role] - roleOrder[b.role];
                }).map(member => (
                  <div key={member.id} className="flex justify-between items-center p-3 bg-white/40 rounded-xl border border-white/30 shadow-sm group hover:bg-white/50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <img src={`/avatars/${member.avatar}`} className={`w-10 h-10 rounded-full border-2 ${member.role === 'admin' ? 'border-amber-400' : member.role === 'co-admin' ? 'border-indigo-400' : 'border-white'}`} />
                      <div>
                        <div className="font-bold text-slate-700 text-sm flex items-center">
                          {member.name}
                        </div>
                        <div className="text-[10px] text-slate-400">@{member.username}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {/* Role Badges with Icons */}
                      {member.role === 'admin' && (
                        <span className="text-[10px] uppercase font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded flex items-center space-x-1">
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                          </svg>
                          <span>Admin</span>
                        </span>
                      )}
                      {member.role === 'co-admin' && (
                        <span className="text-[10px] uppercase font-bold text-purple-500 bg-purple-50 px-2 py-1 rounded flex items-center space-x-1">
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          </svg>
                          <span>Co-Admin</span>
                        </span>
                      )}

                      {/* Admin Controls */}
                      {user.role === 'admin' && member.id !== user.id && (
                        <>
                          {/* Member Actions */}
                          {member.role === 'member' && (
                            <>
                              {/* Transfer Admin (LEFT - PURPLE) */}
                              <button
                                onClick={() => handleTransferAdmin(member.id, member.name)}
                                className="relative p-1.5 bg-purple-50 text-purple-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-purple-100 group/btn"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                                  <circle cx="8.5" cy="7" r="4" />
                                  <polyline points="17 11 19 13 23 9" />
                                </svg>
                                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover/btn:opacity-100 pointer-events-none transition-opacity duration-100">
                                  Make {member.name} Admin
                                </span>
                              </button>

                              {/* Promote to Co-Admin (RIGHT - AMBER) */}
                              <button
                                onClick={() => handlePromoteMember(member.id, member.name)}
                                className="relative p-1.5 bg-amber-50 text-amber-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-amber-100 group/btn"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                                  <circle cx="8.5" cy="7" r="4" />
                                  <line x1="20" y1="8" x2="20" y2="14" />
                                  <line x1="23" y1="11" x2="17" y2="11" />
                                </svg>
                                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover/btn:opacity-100 pointer-events-none transition-opacity duration-100">
                                  Make {member.name} Co-Admin
                                </span>
                              </button>
                            </>
                          )}

                          {/* Co-Admin Actions */}
                          {member.role === 'co-admin' && (
                            <button
                              onClick={() => handleDemoteMember(member.id, member.name)}
                              className="p-1.5 bg-slate-100 text-slate-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-200"
                              title="Demote to Member"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                                <circle cx="8.5" cy="7" r="4" />
                                <line x1="23" y1="11" x2="17" y2="11" />
                              </svg>
                            </button>
                          )}

                          {/* Delete Button */}
                          <button
                            onClick={() => setDeleteModalUser(member)}
                            className="p-1.5 bg-rose-100 text-rose-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <TrashIcon />
                          </button>
                        </>
                      )}

                      {/* Co-Admin can transfer their role */}
                      {user.role === 'co-admin' && member.id !== user.id && member.role === 'member' && (
                        <button
                          onClick={() => handleTransferCoAdmin(member.id, member.name)}
                          className="relative p-1.5 bg-purple-50 text-purple-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-purple-100 group/btn"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                            <circle cx="8.5" cy="7" r="4" />
                            <polyline points="17 11 19 13 23 9" />
                          </svg>
                          <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover/btn:opacity-100 pointer-events-none transition-opacity duration-100">
                            Make {member.name} Co-Admin
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Member Accordion (Admin Only) */}
              {user.role === 'admin' && (
                <div className="mt-4 pt-2 border-t border-slate-200/50">
                  <button
                    onClick={() => setShowAddMember(!showAddMember)}
                    className="flex items-center justify-center w-full space-x-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 px-1 py-2 bg-indigo-50/50 rounded-xl hover:bg-indigo-50 transition-colors"
                  >
                    <PlusIcon />
                    <span>Add House Member</span>
                  </button>

                  <AnimatePresence>
                    {showAddMember && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-300 space-y-3 mt-2">
                          <input
                            placeholder="Nickname (e.g. Abi)"
                            className="w-full p-2 rounded-lg text-sm bg-white/60 outline-none focus:ring-2 focus:ring-indigo-500/20"
                            value={newMemberNickname}
                            onChange={e => setNewMemberNickname(e.target.value)}
                          />
                          <select
                            value={newMemberGender}
                            onChange={e => setNewMemberGender(e.target.value)}
                            className="w-full p-2 rounded-lg text-sm bg-white/60 outline-none focus:ring-2 focus:ring-indigo-500/20"
                          >
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                          </select>
                          <input
                            placeholder="Username (e.g. abi)"
                            className="w-full p-2 rounded-lg text-sm bg-white/60 outline-none focus:ring-2 focus:ring-indigo-500/20"
                            value={newMemberName}
                            onChange={e => setNewMemberName(e.target.value)}
                          />
                          <input
                            placeholder="Password"
                            type="password"
                            className="w-full p-2 rounded-lg text-sm bg-white/60 outline-none focus:ring-2 focus:ring-indigo-500/20"
                            value={newMemberPass}
                            onChange={e => setNewMemberPass(e.target.value)}
                          />
                          <button onClick={handleAddMember} className="w-full py-2 bg-indigo-500 text-white font-bold rounded-lg text-xs hover:bg-indigo-600 shadow-sm">
                            Create Account
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Reset House Data (Admin & Co-Admin Only) */}
          {
            (user.role === 'admin' || user.role === 'co-admin') && (
              <GlassCard className="border-2 border-rose-200">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-[10px] font-bold text-rose-600 uppercase">Danger Zone</h3>
                    <p className="text-[9px] text-slate-500 mt-0.5">
                      {user.role === 'admin' ? 'Admin controls' : 'Co-Admin controls'}
                    </p>
                  </div>
                </div>

                <div className="border-t border-rose-200 pt-3">
                  <button
                    onClick={() => setShowResetHouse(!showResetHouse)}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center justify-between w-full p-1"
                  >
                    <span className="flex items-center space-x-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                      <span>Reset All House Data</span>
                    </span>
                    <span className="text-rose-400">{showResetHouse ? '-' : '+'}</span>
                  </button>
                  <AnimatePresence>
                    {showResetHouse && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 space-y-2 p-3 bg-rose-50/50 rounded-xl border border-rose-200">
                          <div className="text-xs text-rose-700 font-semibold">
                            ⚠️ This will delete ALL receipts permanently!
                          </div>
                          <input
                            type="password"
                            placeholder="Your Password"
                            className="w-full p-2.5 rounded-lg text-sm bg-white border border-rose-200 outline-none focus:ring-2 focus:ring-rose-500/20 transition-all"
                            value={resetPassword}
                            onChange={e => setResetPassword(e.target.value)}
                          />
                          <button
                            onClick={handleResetHouseData}
                            className="w-full py-2 bg-rose-500 text-white font-bold rounded-lg text-xs hover:bg-rose-600 shadow-md transition-colors"
                          >
                            Reset All Data
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </GlassCard>
            )
          }

          {/* Delete Household (Admin Only - Separate Section) */}
          {
            user.role === 'admin' && (
              <GlassCard className="border-2 border-rose-500 bg-rose-50/10">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Zone of No Return</h3>
                    <p className="text-[9px] text-rose-400 mt-0.5">Destroy Household</p>
                  </div>
                </div>

                <div className="border-t border-rose-200 pt-3">
                  <button
                    onClick={() => setShowDeleteHouse(!showDeleteHouse)}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center justify-between w-full p-1"
                  >
                    <span className="flex items-center space-x-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                      <span>Delete Household Permanently</span>
                    </span>
                    <span className="text-rose-400">{showDeleteHouse ? '-' : '+'}</span>
                  </button>

                  <AnimatePresence>
                    {showDeleteHouse && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 space-y-2 p-3 bg-white/20 rounded-xl border-2 border-rose-500">
                          <div className="text-xs text-rose-700 font-bold text-center">
                            ⛔ This deletes EVERYTHING ⛔
                          </div>
                          <input
                            type="password"
                            placeholder="Admin Password"
                            className="w-full p-2.5 rounded-lg text-sm bg-white border-2 border-rose-200 outline-none focus:ring-2 focus:ring-rose-500/20 transition-all placeholder:text-rose-300 text-rose-900"
                            value={deleteHousePassword}
                            onChange={e => setDeleteHousePassword(e.target.value)}
                          />
                          <button
                            onClick={handleDeleteHousehold}
                            className="w-full py-2 bg-rose-600 text-white font-bold rounded-lg text-xs hover:bg-rose-700 shadow-lg shadow-rose-500/30 transition-all"
                          >
                            CONFIRM DELETION
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </GlassCard>
            )
          }

          <button onClick={handleLogout} className="w-full py-3 bg-rose-100/80 text-rose-600 font-bold rounded-xl hover:bg-rose-200 transition-colors shadow-sm">
            Logout
          </button>

          {/* DELETE CONFIRMATION MODAL */}
          <AnimatePresence>
            {deleteModalUser && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                  onClick={() => setDeleteModalUser(null)}
                />
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-white rounded-2xl p-6 w-full max-w-xs relative z-10 shadow-2xl"
                >
                  <h3 className="text-lg font-bold text-slate-800 mb-2">Remove {deleteModalUser.name}?</h3>
                  <p className="text-sm text-slate-500 mb-4">Please enter your Admin Password to confirm.</p>
                  <input
                    placeholder="Admin Password"
                    type="password"
                    className="w-full p-3 bg-slate-100 rounded-xl mb-4 font-bold border border-slate-200"
                    value={adminPassForDelete}
                    onChange={e => setAdminPassForDelete(e.target.value)}
                  />
                  <div className="flex space-x-2">
                    <button onClick={() => setDeleteModalUser(null)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl">Cancel</button>
                    <button onClick={handleDeleteMember} className="flex-1 py-3 bg-rose-500 text-white font-bold rounded-xl shadow-lg shadow-rose-500/30">Confirm</button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div >
      </PageTransition >
    );
  };

  return (
    <div className="min-h-screen pb-32 font-sans text-slate-900 selection:bg-indigo-100">

      {/* SLIMMER STICKY TOP NAV BAR */}
      <div className="sticky top-2 z-50 px-2 mb-2">
        <nav className="glass-container mx-auto max-w-md w-full !rounded-2xl flex items-center shadow-lg shadow-indigo-900/5 transition-all">
          <div className="glass-filter"></div>
          <div className="glass-overlay !bg-white/40"></div>

          <div className="relative z-10 w-full flex items-center justify-between px-3 py-1">
            {/* Logo in Navbar - LARGER */}
            <div className="flex items-center space-x-0 pl-1">
              <img src={logo} alt="Vudki" className="w-20 h-20 object-contain drop-shadow-md -my-3" />
              <span className="text-2xl font-bold text-slate-800 tracking-tight hidden sm:block ml-1">Vudki</span>
            </div>

            {/* Icons */}
            <div className="flex space-x-1">
              {[
                { id: 'home', icon: HomeIcon, label: 'Home' },
                ...(user.role !== 'developer' ? [
                  { id: 'add', icon: CameraIcon, label: 'Add' },
                  { id: 'history', icon: HistoryIcon, label: 'History' }
                ] : []),
                { id: 'settings', icon: SettingsIcon, label: 'Settings' }
              ].map((item) => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`p-2 rounded-xl transition-all duration-300 ${isActive ? 'bg-white/50 text-indigo-600 shadow-sm scale-105' : 'text-slate-500 hover:text-slate-800 hover:bg-white/20'}`}
                    title={item.label}
                  >
                    <Icon />
                  </button>
                );
              })}
            </div>
          </div>
        </nav>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-md mx-auto px-4 py-2 min-h-[80vh]">
        {error && (
          <div className="mb-6 p-4 bg-rose-500/80 backdrop-blur-md text-white rounded-2xl shadow-lg border border-rose-400 flex justify-between items-center">
            <div>
              <p className="font-bold text-sm">Connection Error</p>
              <p className="text-xs opacity-90">{error}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-3 py-1 bg-white/25 hover:bg-white/40 rounded-lg text-xs font-bold transition-colors border border-white/20"
            >
              Reset / Logout
            </button>
          </div>
        )}

        {/* View Router with AnimatePresence */}
        <AnimatePresence mode="wait">
          <div key={activeTab}>
            {activeTab === 'home' && <HomeView />}
            {activeTab === 'add' && <AddReceiptView />}
            {activeTab === 'history' && <HistoryView />}
            {activeTab === 'settings' && <SettingsView />}
          </div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
