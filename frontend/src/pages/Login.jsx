import { useState, useCallback, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFormValidation, validators } from '../hooks/useFormValidation';
import toast from 'react-hot-toast';

export default function Login() {
  const { user, initializing, login, requestOtp, loginWithOtp } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('password');
  const [showPass, setShowPass] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    if (!initializing && user) {
      navigate('/', { replace: true });
    }
  }, [initializing, user, navigate]);

  const validate = useCallback((name, value) => {
    if (name === 'email') return validators.validateEmail(value);
    if (mode === 'password') {
      if (name === 'password') {
        return validators.validateRequired(value, 'Password') || validators.validateMinLength(value, 8, 'Password');
      }
      return null;
    }

    if (mode === 'otp') {
      if (name === 'otp') {
        if (!value || value.trim().length === 0) return 'OTP is required';
        return /^[0-9]{6}$/.test(value) ? null : 'OTP must be 6 digits';
      }
      return null;
    }

    return null;
  }, [mode]);

  const onSubmit = useCallback(async (values) => {
    if (mode === 'password') {
      await login(values.email, values.password);
    } else {
      await loginWithOtp(values.email, values.otp);
    }
    toast.success('Login successful!');
    navigate('/');
  }, [login, loginWithOtp, mode, navigate]);

  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    isSubmitting,
    submitError,
  } = useFormValidation({ email: '', password: '', otp: '' }, onSubmit, validate);

  const handleModeSwitch = (newMode) => {
    setMode(newMode);
    setOtpSent(false);
    resetForm();
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    const emailError = validators.validateEmail(values.email);
    if (emailError) {
      toast.error(emailError);
      return;
    }
    try {
      await requestOtp(values.email);
      setOtpSent(true);
      toast.success('OTP sent to your email.');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to send OTP.');
    }
  };

  if (!initializing && user) {
    return <Navigate to="/" replace />;
  }

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
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800 active:bg-slate-100'}`}
            >
              Password Login
            </button>
            <button
              type="button"
              onClick={() => { setMode('otp'); setOtpSent(false); resetForm(); }}
              className={`flex-1 min-h-[48px] py-3 text-xs font-bold uppercase tracking-wider transition-all duration-200
                ${mode === 'otp'
                  ? 'text-sky-950 border-b-2 border-sky-600 bg-sky-50/80'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800 active:bg-slate-100'}`}
            >
              OTP Login
            </button>
          </div>

          <div className="p-5 sm:p-7">
            {mode === 'password' ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={values.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className="form-input"
                    placeholder="admin@sheetaldies.com"
                  />
                  {touched.email && errors.email && (
                    <p className="mt-2 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>
                <div>
                  <label className="form-label">Password</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      name="password"
                      value={values.password}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className="form-input pr-10"
                      placeholder="••••••••"
                    />
                    <button type="button" onClick={() => setShowPass(p => !p)} tabIndex={-1}
                      className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center
                        text-slate-400 hover:text-brand-600 rounded-lg transition-colors">
                      <span className="material-symbols-outlined text-lg">{showPass ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                  {touched.password && errors.password && (
                    <p className="mt-2 text-sm text-red-600">{errors.password}</p>
                  )}
                </div>
                {submitError && <p className="text-sm text-red-600">{submitError}</p>}
                <button type="submit" disabled={isSubmitting} className="w-full btn-primary !justify-center">
                  {isSubmitting
                    ? <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> Signing in...</>
                    : <><span className="material-symbols-outlined text-sm">login</span> Sign In</>
                  }
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={values.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className="form-input"
                    placeholder="your@email.com"
                    disabled={otpSent}
                  />
                  {touched.email && errors.email && (
                    <p className="mt-2 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>
                {!otpSent ? (
                  <button type="button" onClick={handleSendOtp} disabled={isSubmitting || Boolean(errors.email)} className="w-full btn-primary !justify-center">
                    {isSubmitting
                      ? <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> Sending...</>
                      : <><span className="material-symbols-outlined text-sm">send</span> Send OTP</>
                    }
                  </button>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="form-label">Enter OTP</label>
                      <input
                        type="text"
                        name="otp"
                        value={values.otp}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        maxLength={6}
                        className="form-input text-center text-xl font-mono tracking-[0.5em]"
                        placeholder="000000"
                      />
                      {touched.otp && errors.otp && (
                        <p className="mt-2 text-sm text-red-600">{errors.otp}</p>
                      )}
                      <p className="text-[10px] text-slate-400 mt-1.5 text-center">
                        OTP sent to {values.email}.{' '}
                        <button type="button" onClick={() => { setOtpSent(false); resetForm(); }}
                          className="text-sky-800 hover:text-sky-950 hover:underline font-semibold py-1 px-1 rounded-md">Resend</button>
                      </p>
                    </div>
                    {submitError && <p className="text-sm text-red-600">{submitError}</p>}
                    <button type="submit" disabled={isSubmitting || Boolean(errors.otp)} className="w-full btn-primary !justify-center">
                      {isSubmitting
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
