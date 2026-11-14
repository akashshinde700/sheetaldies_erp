import { useState, useCallback, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, LogIn, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

import { Card, CardContent } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '../context/AuthContext';
import { useFormValidation, validators } from '../hooks/useFormValidation';

// Two-factor login, in two screens:
//   1. Email + password  → server checks the password, emails an OTP and
//      returns a short-lived `challenge` (proof the password was correct).
//   2. OTP screen        → OTP + challenge → logged in.
// There is no way to get an OTP with only an email address.
export default function Login() {
  const { user, initializing, login, requestOtp, loginWithOtp } = useAuth();
  const navigate = useNavigate();

  const [showPass, setShowPass] = useState(false);
  // null = password screen; { email, challenge } = OTP screen
  const [twoFA, setTwoFA] = useState(null);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!initializing && user) {
      navigate('/', { replace: true });
    }
  }, [initializing, user, navigate]);

  // Only validate the fields that are on the current screen — a hidden empty
  // field would otherwise silently block the submit.
  const validate = useCallback((name, value) => {
    if (twoFA) {
      if (name !== 'otp') return null;
      if (!value || value.trim().length === 0) return 'OTP is required';
      return /^[0-9]{6}$/.test(value) ? null : 'OTP must be 6 digits';
    }
    if (name === 'email') return validators.validateEmail(value);
    if (name === 'password') {
      return validators.validateRequired(value, 'Password') || validators.validateMinLength(value, 8, 'Password');
    }
    return null;
  }, [twoFA]);

  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    isSubmitting,
    submitError,
    resetForm,
    setValues,
  } = useFormValidation({ email: '', password: '', otp: '' }, (vals) => onSubmit(vals), validate);

  // Switching screens: drop password/OTP, errors and messages; keep the email.
  const email = values.email;
  const clearStepState = useCallback(() => {
    resetForm();
    setValues(v => ({ ...v, email }));
  }, [resetForm, setValues, email]);

  const backToPassword = useCallback(() => {
    setTwoFA(null);
    clearStepState();
  }, [clearStepState]);

  async function onSubmit(vals) {
    if (!twoFA) {
      // Step 1: password check → OTP is emailed
      const result = await login(vals.email, vals.password);
      if (result?.otpRequired) {
        setTwoFA({ email: result.email || vals.email, challenge: result.challenge });
        clearStepState();
        toast.success('Password verified. OTP sent to your email.');
        return;
      }
    } else {
      // Step 2: OTP check → login
      try {
        await loginWithOtp(twoFA.challenge, vals.otp);
      } catch (err) {
        if (err?.response?.data?.code === 'ERR_2FA_CHALLENGE') {
          toast.error(err.response.data.message);
          backToPassword();
          return;
        }
        throw err;
      }
    }
    toast.success('Login successful!');
    navigate('/');
  }

  const handleResend = async () => {
    setResending(true);
    try {
      await requestOtp(twoFA.challenge);
      setValues(v => ({ ...v, otp: '' }));
      toast.success('New OTP sent to your email.');
    } catch (err) {
      if (err?.response?.data?.code === 'ERR_2FA_CHALLENGE') backToPassword();
      toast.error(err.response?.data?.message || 'Failed to send OTP.');
    } finally {
      setResending(false);
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
          <div className="border-b border-slate-200/80 px-5 sm:px-7 py-3 flex items-center gap-2">
            {twoFA ? (
              <ShieldCheck className="h-4 w-4 text-sky-700" aria-hidden="true" />
            ) : (
              <LogIn className="h-4 w-4 text-sky-700" aria-hidden="true" />
            )}
            <h2 className="text-xs font-bold uppercase tracking-wider text-sky-950">
              {twoFA ? 'Step 2 of 2 · Verify OTP' : 'Step 1 of 2 · Sign In'}
            </h2>
          </div>

          <CardContent className="p-5 sm:p-7">
            {twoFA ? (
              <form key="otp-step" onSubmit={handleSubmit} className="space-y-4">
                <div className="rounded-lg bg-sky-50 border border-sky-100 px-4 py-3 text-center">
                  <p className="text-xs text-slate-600">Password verified. Enter the 6-digit OTP sent to</p>
                  <p className="text-sm font-semibold text-sky-950 break-all">{twoFA.email}</p>
                </div>

                <FormField
                  label="Enter OTP"
                  htmlFor="twofa-otp"
                  error={touched.otp && errors.otp ? errors.otp : null}
                >
                  <Input
                    id="twofa-otp"
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
                    autoFocus
                  />
                </FormField>

                {submitError && (
                  <p className="text-sm font-medium text-rose-600" role="alert">{submitError}</p>
                )}

                <Button type="submit" loading={isSubmitting} className="w-full">
                  {!isSubmitting && <ShieldCheck aria-hidden="true" />}
                  {isSubmitting ? 'Verifying...' : 'Verify & Login'}
                </Button>

                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={backToPassword}
                    className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 hover:underline py-1 px-1 rounded-md"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending}
                    className="text-sky-800 hover:text-sky-950 hover:underline font-semibold py-1 px-1 rounded-md disabled:opacity-50"
                  >
                    {resending ? 'Sending...' : 'Resend OTP'}
                  </button>
                </div>
              </form>
            ) : (
              <form key="password-step" onSubmit={handleSubmit} className="space-y-4">
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
