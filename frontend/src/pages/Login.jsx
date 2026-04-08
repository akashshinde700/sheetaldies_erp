import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const { login, requestOtp, loginWithOtp } = useAuth();
  const navigate = useNavigate();

  const [mode,     setMode]     = useState('password');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [otp,      setOtp]      = useState('');
  const [otpSent,  setOtpSent]  = useState(false);
  const [loading,  setLoading]  = useState(false);

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Login successful!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed.');
    } finally { setLoading(false); }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await requestOtp(email);
      setOtpSent(true);
      toast.success('OTP sent to your email.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP.');
    } finally { setLoading(false); }
  };

  const handleOtpLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await loginWithOtp(email, otp);
      toast.success('Login successful!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}>

      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)' }} />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/30"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            <span className="material-symbols-outlined text-white text-3xl">precision_manufacturing</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-wide font-headline uppercase">Sheetal Dies ERP</h1>
          <p className="text-slate-400 text-xs mt-1">Precision Engineering Management System</p>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden">
          {/* Tab Switch */}
          <div className="flex border-b border-slate-100">
            <button onClick={() => setMode('password')}
              className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-wider transition-all ${
                mode === 'password'
                  ? 'text-indigo-700 border-b-2 border-indigo-600 bg-indigo-50/50'
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
              }`}>
              Password Login
            </button>
            <button onClick={() => { setMode('otp'); setOtpSent(false); setOtp(''); }}
              className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-wider transition-all ${
                mode === 'otp'
                  ? 'text-indigo-700 border-b-2 border-indigo-600 bg-indigo-50/50'
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
              }`}>
              OTP Login
            </button>
          </div>

          <div className="p-7">
            {mode === 'password' ? (
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div>
                  <label className="form-label">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    className="form-input" placeholder="admin@sheetaldies.com" />
                </div>
                <div>
                  <label className="form-label">Password</label>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)} required
                      className="form-input pr-10" placeholder="••••••••" />
                    <button type="button" onClick={() => setShowPass(p => !p)} tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <span className="material-symbols-outlined text-lg">{showPass ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-md shadow-indigo-200"
                  style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                  {loading
                    ? <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> Signing in...</>
                    : <><span className="material-symbols-outlined text-sm">login</span> Sign In</>
                  }
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="form-label">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    className="form-input" placeholder="your@email.com" disabled={otpSent} />
                </div>
                {!otpSent ? (
                  <button onClick={handleSendOtp} disabled={loading || !email}
                    className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-md shadow-indigo-200"
                    style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                    {loading
                      ? <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> Sending...</>
                      : <><span className="material-symbols-outlined text-sm">send</span> Send OTP</>
                    }
                  </button>
                ) : (
                  <form onSubmit={handleOtpLogin} className="space-y-4">
                    <div>
                      <label className="form-label">Enter OTP</label>
                      <input type="text" value={otp} onChange={e => setOtp(e.target.value)} required
                        maxLength={6}
                        className="form-input text-center text-xl font-mono tracking-[0.5em]"
                        placeholder="000000" />
                      <p className="text-[10px] text-slate-400 mt-1.5 text-center">
                        OTP sent to {email}.{' '}
                        <button type="button" onClick={() => { setOtpSent(false); setOtp(''); }}
                          className="text-indigo-500 hover:underline font-semibold">Resend</button>
                      </p>
                    </div>
                    <button type="submit" disabled={loading || otp.length !== 6}
                      className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-md shadow-indigo-200"
                      style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                      {loading
                        ? <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> Verifying...</>
                        : <><span className="material-symbols-outlined text-sm">verified</span> Verify & Login</>
                      }
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-slate-500 text-xs mt-5">
          © {new Date().getFullYear()} Sheetal Dies & Tools Pvt. Ltd.
        </p>
      </div>
    </div>
  );
}
