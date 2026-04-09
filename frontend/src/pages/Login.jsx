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
    <div className="relative min-h-dvh min-h-screen flex items-center justify-center p-4 sm:p-6 bg-app-shell safe-pt safe-pb safe-pl safe-pr">

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-72 sm:w-96 h-72 sm:h-96 rounded-full opacity-[0.14] bg-sky-300 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-72 sm:w-96 h-72 sm:h-96 rounded-full opacity-[0.12] bg-blue-200 blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative z-10 animate-scale-in">
        <div className="text-center mb-6 sm:mb-8">
          <div
            className="w-16 h-16 sm:w-[4.5rem] sm:h-[4.5rem] rounded-2xl mx-auto flex items-center justify-center mb-4
              shadow-lg shadow-slate-900/15 bg-slate-900
              transition-transform duration-300 hover:scale-[1.02]"
          >
            <span className="material-symbols-outlined text-white text-3xl sm:text-4xl">precision_manufacturing</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight font-headline">Sheetal Dies ERP</h1>
          <p className="text-slate-500 text-xs mt-1.5 px-2">Precision Engineering Management System</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg shadow-slate-900/8 overflow-hidden border border-slate-200/90">
          <div className="flex border-b border-slate-200/80">
            <button
              type="button"
              onClick={() => setMode('password')}
              className={`flex-1 min-h-[48px] py-3 text-xs font-bold uppercase tracking-wider transition-all duration-200
                ${mode === 'password'
                  ? 'text-sky-950 border-b-2 border-sky-600 bg-sky-50/80'
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600 active:bg-slate-100'}`}
            >
              Password Login
            </button>
            <button
              type="button"
              onClick={() => { setMode('otp'); setOtpSent(false); setOtp(''); }}
              className={`flex-1 min-h-[48px] py-3 text-xs font-bold uppercase tracking-wider transition-all duration-200
                ${mode === 'otp'
                  ? 'text-sky-950 border-b-2 border-sky-600 bg-sky-50/80'
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600 active:bg-slate-100'}`}
            >
              OTP Login
            </button>
          </div>

          <div className="p-5 sm:p-7">
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
                      className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center
                        text-slate-400 hover:text-brand-600 rounded-lg transition-colors">
                      <span className="material-symbols-outlined text-lg">{showPass ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full btn-primary !justify-center">
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
                  <button type="button" onClick={handleSendOtp} disabled={loading || !email} className="w-full btn-primary !justify-center">
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
                          className="text-sky-800 hover:text-sky-950 hover:underline font-semibold py-1 px-1 rounded-md">Resend</button>
                      </p>
                    </div>
                    <button type="submit" disabled={loading || otp.length !== 6} className="w-full btn-primary !justify-center">
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
