import { useState, useCallback, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Send, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

import { Card, CardContent } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '../context/AuthContext';
import { useFormValidation, validators } from '../hooks/useFormValidation';

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
    <div className="login-shell relative min-h-dvh min-h-screen flex items-center justify-center p-4 sm:p-6 bg-app-shell safe-pt safe-pb safe-pl safe-pr">

      <div className="login-grid absolute inset-0 pointer-events-none" aria-hidden="true" />

      <div className="w-full max-w-sm relative z-10 animate-scale-in">
        <div className="text-center mb-6 sm:mb-8">
          <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 shadow-sm shadow-slate-900/5 transition-transform duration-300 hover:scale-[1.02]">
            <img src="/logo.png" alt="SVT" className="h-10 w-10 object-contain" />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight font-headline">SVT ERP</h1>
          <p className="text-slate-500 text-xs mt-1.5 px-2">Shital Vacuum Treat Pvt. Ltd.</p>
        </div>

        <Card className="overflow-hidden shadow-lg shadow-slate-900/8">
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
              onClick={() => setMode('otp')}
              className={`flex-1 min-h-[48px] py-3 text-xs font-bold uppercase tracking-wider transition-all duration-200
                ${mode === 'otp'
                  ? 'text-sky-950 border-b-2 border-sky-600 bg-sky-50/80'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800 active:bg-slate-100'}`}
            >
              OTP Login
            </button>
          </div>

          <CardContent className="p-5 sm:p-7">
            {mode === 'password' ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <FormField
                  label="Email"
                  htmlFor="login-email"
                  error={touched.email && errors.email ? errors.email : null}
                >
                  <Input
                    id="login-email"
                    type="email"
                    name="email"
                    value={values.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    invalid={Boolean(touched.email && errors.email)}
                    placeholder="admin@shitalvaccumtreat.com"
                    autoComplete="email"
                  />
                </FormField>

                <FormField
                  label="Password"
                  htmlFor="login-password"
                  error={touched.password && errors.password ? errors.password : null}
                >
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPass ? 'text' : 'password'}
                      name="password"
                      value={values.password}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      invalid={Boolean(touched.password && errors.password)}
                      className="pr-12"
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(p => !p)}
                      tabIndex={-1}
                      aria-label={showPass ? 'Hide password' : 'Show password'}
                      className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:h-7 sm:w-9
                        flex items-center justify-center rounded-md
                        text-slate-400 hover:text-slate-700 transition-colors"
                    >
                      {showPass ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                    </button>
                  </div>
                </FormField>

                {submitError && (
                  <p className="text-sm font-medium text-rose-600" role="alert">{submitError}</p>
                )}

                <Button type="submit" loading={isSubmitting} className="w-full">
                  {!isSubmitting && <LogIn aria-hidden="true" />}
                  {isSubmitting ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <FormField
                  label="Email"
                  htmlFor="otp-email"
                  error={touched.email && errors.email ? errors.email : null}
                >
                  <Input
                    id="otp-email"
                    type="email"
                    name="email"
                    value={values.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    invalid={Boolean(touched.email && errors.email)}
                    placeholder="your@email.com"
                    autoComplete="email"
                    disabled={otpSent}
                  />
                </FormField>

                {!otpSent ? (
                  <Button
                    type="button"
                    onClick={handleSendOtp}
                    loading={isSubmitting}
                    disabled={Boolean(errors.email)}
                    className="w-full"
                  >
                    {!isSubmitting && <Send aria-hidden="true" />}
                    {isSubmitting ? 'Sending...' : 'Send OTP'}
                  </Button>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <FormField
                      label="Enter OTP"
                      htmlFor="login-otp"
                      error={touched.otp && errors.otp ? errors.otp : null}
                    >
                      <Input
                        id="login-otp"
                        type="text"
                        name="otp"
                        value={values.otp}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        maxLength={6}
                        invalid={Boolean(touched.otp && errors.otp)}
                        className="text-center text-xl font-mono tracking-[0.5em]"
                        placeholder="000000"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                      />
                      <p className="text-[10px] text-slate-400 mt-1.5 text-center">
                        OTP sent to {values.email}.{' '}
                        <button type="button" onClick={() => { setOtpSent(false); resetForm(); }}
                          className="text-sky-800 hover:text-sky-950 hover:underline font-semibold py-1 px-1 rounded-md">Resend</button>
                      </p>
                    </FormField>

                    {submitError && (
                      <p className="text-sm font-medium text-rose-600" role="alert">{submitError}</p>
                    )}

                    <Button
                      type="submit"
                      loading={isSubmitting}
                      disabled={Boolean(errors.otp)}
                      className="w-full"
                    >
                      {!isSubmitting && <ShieldCheck aria-hidden="true" />}
                      {isSubmitting ? 'Verifying...' : 'Verify & Login'}
                    </Button>
                  </form>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-slate-500 text-xs mt-5">
          © {new Date().getFullYear()} Shital Vacuum Treat Pvt. Ltd.
        </p>
      </div>
    </div>
  );
}
