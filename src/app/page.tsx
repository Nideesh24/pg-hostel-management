'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  Sun,
  Moon,
  LogOut,
  Loader2,
  AlertCircle,
  Mail,
  Lock,
  ArrowRight,
} from 'lucide-react';

// ── Owner Dashboard Imports ──────────────────────────────
import { KpiStats, KpiMetrics } from './owner/components/KpiStats';
import { OccupancyGrid, RoomData, BedData } from './owner/components/OccupancyGrid';
import { TenantOnboardModal } from './owner/components/TenantOnboardModal';
import { OwnerRoomManagement } from './owner/components/OwnerRoomManagement';
import { OwnerTenantManagement } from './owner/components/OwnerTenantManagement';
import { InvoicesTable, InvoiceItem } from './owner/components/InvoicesTable';
import { ComplaintsTable, OwnerComplaintItem } from './owner/components/ComplaintsTable';
import { RefreshCw } from 'lucide-react';

// ── Tenant Dashboard Imports ─────────────────────────────
import { TenantBottomNav, TenantTabType } from './tenant/components/TenantBottomNav';
import { HomeTab, TenantHomeData } from './tenant/components/HomeTab';
import { BillsTab, TenantInvoice } from './tenant/components/BillsTab';
import { ComplaintsTab, TenantComplaint } from './tenant/components/ComplaintsTab';
import { UpiPaymentModal } from './tenant/components/UpiPaymentModal';
import { TenantProfileKyc } from './tenant/components/TenantProfileKyc';
import { PasswordInput } from '../components/PasswordInput';
import { compressImageToDataUrl, MAX_UPLOAD_BYTES, readFileAsDataUrl } from '../lib/client-uploads';
import { OwnerAccountSettings } from './owner/components/OwnerAccountSettings';
import { OwnerSharing } from './owner/components/OwnerSharing';
import { TenantDocumentsVault } from './owner/components/TenantDocumentsVault';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface SessionUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: 'OWNER' | 'TENANT';
  avatarUrl: string | null;
  tenantProfile?: {
    id: string;
    name: string;
    phone: string;
    bedId: string | null;
    propertyId: string;
    approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  } | null;
  ownedProperties?: Array<{
    id: string;
    name: string;
    city: string | null;
  }>;
}

const HOSTEL_NAME = 'OM MURUGAA MENS HOSTEL';
const HOSTEL_ADDRESS = 'Porur, Chennai, Tamil Nadu';
const CONTACT_PHONE = '9791157550';
const GOOGLE_MAPS_URL =
  'https://www.google.com/maps?sca_esv=e5efdb4f23fffd2d&udm&fvr=1&pvq=Cg0vZy8xMW40MzN2ZnZoIhYKEG9tIG11cnVnYSBob3N0ZWwQAhgDiQF9SCG7fqBuSA&lqi=ChBvbSBtdXJ1Z2EgaG9zdGVsSM_u9LGQtICACFoiEAAQARACGAAYAiIQb20gbXVydWdhIGhvc3RlbCoECAMQApIBEXN0dWRlbnRfZG9ybWl0b3J5&vet=10CAAQoqAOahcKEwi4zYeKroSYAxUAAAAAHQAAAAAQCQ..i&cs=0&um=1&ie=UTF-8&fb=1&gl=in&sa=X&ftid=0x3a52617485f67453:0x486ea07ebb21487d';

// ═══════════════════════════════════════════════════════════
// DARK MODE TOGGLE HOOK
// ═══════════════════════════════════════════════════════════

function useDarkMode() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = stored === 'dark' || (!stored && prefersDark);
    setIsDark(dark);
    document.documentElement.classList.toggle('dark', dark);
  }, []);

  const toggle = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem('theme', next ? 'dark' : 'light');
      document.documentElement.classList.toggle('dark', next);
      return next;
    });
  }, []);

  return { isDark, toggle };
}

// ═══════════════════════════════════════════════════════════
// DARK MODE TOGGLE BUTTON (Shared)
// ═══════════════════════════════════════════════════════════

function DarkModeToggle({ isDark, toggle }: { isDark: boolean; toggle: () => void }) {
  return (
    <button
      onClick={toggle}
      type="button"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-xs transition-all hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════
// LOGIN SCREEN COMPONENT
// ═══════════════════════════════════════════════════════════

function LoginScreen({
  isDark,
  toggleDark,
  onLogin,
}: {
  isDark: boolean;
  toggleDark: () => void;
  onLogin: (user: SessionUser) => void;
}) {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [signupMessage, setSignupMessage] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPassword, setForgotPassword] = useState({ email: '', phone: '', newPassword: '', confirmPassword: '' });
  const [selectedRole, setSelectedRole] = useState<'OWNER' | 'TENANT'>('OWNER');
  const [signup, setSignup] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    preferredRoomType: 'DOUBLE',
    preferredSharing: '2',
    emergencyContactName: '',
    emergencyContactPhone: '',
    profilePhotoUrl: '',
    idDocumentUrl: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, role: selectedRole }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Login failed.');
      }

      onLogin(data.user as SessionUser);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during login.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSignupMessage(null);
    if (!signup.profilePhotoUrl || !signup.idDocumentUrl) {
      setErrorMsg('Upload your profile photo and Aadhaar card copy to continue.');
      return;
    }
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...signup,
          email: signup.email.trim(),
          fullName: signup.fullName.trim(),
          phone: signup.phone.trim(),
          preferredSharing: Number(signup.preferredSharing),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Unable to submit signup.');
      setSignupMessage('Your request was submitted. You can sign in after Owner approval.');
      setSignup((current) => ({ ...current, password: '' }));
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Unable to submit signup.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProfilePhoto = async (file?: File) => {
    if (!file) return;
    setErrorMsg(null);
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setErrorMsg('Profile photo must be a JPG or PNG smaller than 2 MB.');
      return;
    }
    try {
      const profilePhotoUrl = await compressImageToDataUrl(file);
      setSignup((current) => ({ ...current, profilePhotoUrl }));
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Unable to process the profile photo.');
    }
  };

  const handleIdDocument = async (file?: File) => {
    if (!file) return;
    setErrorMsg(null);
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type) || file.size >= MAX_UPLOAD_BYTES) {
      setErrorMsg('Aadhaar copy must be a JPG, PNG, or PDF smaller than 2 MB.');
      return;
    }
    try {
      const idDocumentUrl = await readFileAsDataUrl(file);
      setSignup((current) => ({ ...current, idDocumentUrl }));
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Unable to read the Aadhaar document.');
    }
  };

  const handleForgotPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMsg(null);
    setSignupMessage(null);
    if (forgotPassword.newPassword !== forgotPassword.confirmPassword) {
      setErrorMsg('The new passwords do not match.');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotPassword.email.trim(),
          phone: forgotPassword.phone.trim(),
          newPassword: forgotPassword.newPassword,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to reset your password.');
      setEmail(forgotPassword.email.trim());
      setPassword('');
      setForgotPassword({ email: '', phone: '', newPassword: '', confirmPassword: '' });
      setSignupMessage(data.message);
      setShowForgotPassword(false);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Unable to reset your password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-stone-50 dark:bg-slate-950">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white/95 px-3 py-2 backdrop-blur-sm sm:px-6 sm:py-3 dark:border-slate-800 dark:bg-slate-900/95">
        <div className="flex min-w-0 items-center gap-2.5">
        <Image src="/logo.svg" alt="" width={36} height={36} priority />
          <span className="truncate text-xs font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-sm">
            {HOSTEL_NAME}
          </span>
        </div>
        <DarkModeToggle isDark={isDark} toggle={toggleDark} />
      </div>

      {/* Login Center */}
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="mb-4 flex items-center justify-center gap-3">
              <Image src="/logo.svg" alt="OM Murugaa Mens Hostel logo" width={56} height={56} priority />
              <div className="text-left">
                <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">{HOSTEL_NAME}</h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Hostel Management Portal</p>
              </div>
            </div>
          </div>

          {!showForgotPassword && <div className="flex rounded-xl border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-700 dark:bg-slate-800/80">
            {(['signin', 'signup'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setAuthMode(mode);
                  setErrorMsg(null);
                  setSignupMessage(null);
                }}
                className={`min-h-[44px] flex-1 rounded-lg px-2 py-2 text-xs font-semibold tracking-wide transition-all ${
                  authMode === mode
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                }`}
              >
                {mode === 'signin' ? 'Sign In' : 'Tenant Sign Up'}
              </button>
            ))}
          </div>}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {errorMsg && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {signupMessage && (
              <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                {signupMessage}
              </div>
            )}

            {showForgotPassword ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Reset your password</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Verify your registered email and phone number.</p>
                </div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Registered Email
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={forgotPassword.email}
                    onChange={(event) => setForgotPassword({ ...forgotPassword, email: event.target.value })}
                    className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:text-sm"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Registered Phone Number
                  <input
                    type="tel"
                    required
                    autoComplete="tel"
                    value={forgotPassword.phone}
                    onChange={(event) => setForgotPassword({ ...forgotPassword, phone: event.target.value })}
                    className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:text-sm"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  New Password
                  <PasswordInput
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={forgotPassword.newPassword}
                    onChange={(event) => setForgotPassword({ ...forgotPassword, newPassword: event.target.value })}
                    className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Confirm New Password
                  <PasswordInput
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={forgotPassword.confirmPassword}
                    onChange={(event) => setForgotPassword({ ...forgotPassword, confirmPassword: event.target.value })}
                    className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </label>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-[44px] w-full rounded-lg bg-emerald-700 px-4 py-2 text-base font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 sm:text-sm"
                >
                  {isSubmitting ? 'Updating…' : 'Set New Password'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForgotPassword(false); setErrorMsg(null); }}
                  className="min-h-[44px] w-full text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                >
                  Back to Sign In
                </button>
              </form>
            ) : authMode === 'signin' ? (
              <>
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-700 dark:bg-slate-800/80">
                  {(['OWNER', 'TENANT'] as const).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setSelectedRole(role)}
                      className={`min-h-[44px] flex-1 rounded-lg py-2 text-xs font-semibold ${
                        selectedRole === role
                          ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {role === 'OWNER' ? 'Owner' : 'Tenant'}
                    </button>
                  ))}
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@example.com"
                    className="min-h-[44px] w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-emerald-500 dark:focus:ring-emerald-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
                  <PasswordInput
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-12 text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-emerald-500 dark:focus:ring-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 py-2.5 text-base font-semibold text-white shadow-sm transition-all hover:bg-emerald-800 active:scale-[0.99] disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500 sm:text-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
                <div className="mt-3 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotPassword((current) => ({ ...current, email }));
                      setShowForgotPassword(true);
                      setErrorMsg(null);
                      setSignupMessage(null);
                    }}
                    className="min-h-[44px] text-sm font-semibold text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-400"
                  >
                    Forgot Password?
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleSignup} autoComplete="off" className="space-y-4">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Full Name
                  <input required autoComplete="off" placeholder="Enter full name" value={signup.fullName} onChange={(e) => setSignup({ ...signup, fullName: e.target.value })} className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:text-sm" />
                </label>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Phone Number
                  <input type="tel" required autoComplete="off" placeholder="Enter mobile number" value={signup.phone} onChange={(e) => setSignup({ ...signup, phone: e.target.value })} className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:text-sm" />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Preferred Room Type
                    <select value={signup.preferredRoomType} onChange={(e) => setSignup({ ...signup, preferredRoomType: e.target.value })} className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:text-sm">
                      <option value="SINGLE">Single</option><option value="DOUBLE">Double sharing</option><option value="TRIPLE">Triple sharing</option><option value="FOUR_SHARING">Four sharing</option><option value="DORMITORY">Dormitory</option>
                    </select>
                  </label>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Preferred Sharing
                    <select value={signup.preferredSharing} onChange={(e) => setSignup({ ...signup, preferredSharing: e.target.value })} className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:text-sm">
                      {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} sharing</option>)}
                    </select>
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Emergency Contact Name
                    <input required autoComplete="off" placeholder="Enter contact name" value={signup.emergencyContactName} onChange={(e) => setSignup({ ...signup, emergencyContactName: e.target.value })} className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:text-sm" />
                  </label>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Emergency Contact Phone
                    <input type="tel" required autoComplete="off" placeholder="Enter emergency contact number" value={signup.emergencyContactPhone} onChange={(e) => setSignup({ ...signup, emergencyContactPhone: e.target.value })} className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:text-sm" />
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Tenant Passport / Profile Photo *
                    <input
                      type="file"
                      required
                      accept="image/jpeg,image/png"
                      aria-label="Tenant passport or profile photo"
                      onChange={(event) => handleProfilePhoto(event.target.files?.[0])}
                      className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-base text-slate-700 file:mr-2 file:rounded-md file:border-0 file:bg-stone-100 file:px-2 file:py-1 file:text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:file:bg-slate-700 sm:text-sm"
                    />
                    <span className="mt-1 block text-[11px] text-slate-500 dark:text-slate-400">JPG or PNG · smaller than 2 MB</span>
                  </label>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Aadhaar Card Copy (Front / Back) *
                    <input
                      type="file"
                      required
                      accept="image/jpeg,image/png,application/pdf"
                      aria-label="Aadhaar card copy"
                      onChange={(event) => handleIdDocument(event.target.files?.[0])}
                      className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-base text-slate-700 file:mr-2 file:rounded-md file:border-0 file:bg-stone-100 file:px-2 file:py-1 file:text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:file:bg-slate-700 sm:text-sm"
                    />
                    <span className="mt-1 block text-[11px] text-slate-500 dark:text-slate-400">JPG, PNG, or PDF · smaller than 2 MB</span>
                  </label>
                </div>
                {(signup.profilePhotoUrl || signup.idDocumentUrl) && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {signup.profilePhotoUrl && (
                      <div className="rounded-lg border border-slate-200 bg-stone-50 p-2 dark:border-slate-700 dark:bg-slate-800">
                        <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">Profile photo preview</p>
                        <img src={signup.profilePhotoUrl} alt="Tenant profile photo preview" className="h-32 w-full rounded-md object-cover" />
                      </div>
                    )}
                    {signup.idDocumentUrl && (
                      <div className="rounded-lg border border-slate-200 bg-stone-50 p-2 dark:border-slate-700 dark:bg-slate-800">
                        <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">Aadhaar copy preview</p>
                        {signup.idDocumentUrl.startsWith('data:application/pdf') ? (
                          <iframe title="Aadhaar card preview" src={signup.idDocumentUrl} className="h-32 w-full rounded-md" />
                        ) : (
                          <img src={signup.idDocumentUrl} alt="Aadhaar card preview" className="h-32 w-full rounded-md object-contain" />
                        )}
                      </div>
                    )}
                  </div>
                )}
                <div className="space-y-4 border-t border-slate-200 pt-4 dark:border-slate-700">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">Account Login Credentials</h2>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Use these details after the Owner approves your application.</p>
                  </div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Email Address
                    <input type="email" required autoComplete="off" placeholder="Enter email address" value={signup.email} onChange={(e) => setSignup({ ...signup, email: e.target.value })} className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:text-sm" />
                  </label>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Create Password
                    <PasswordInput required minLength={8} autoComplete="new-password" placeholder="Create a password" value={signup.password} onChange={(e) => setSignup({ ...signup, password: e.target.value })} className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                  </label>
                </div>
                <button type="submit" disabled={isSubmitting} className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 py-2.5 text-base font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500 sm:text-sm">
                  {isSubmitting ? 'Submitting…' : 'Submit for Owner Approval'}
                </button>
              </form>
            )}
          </div>

          <div className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
            <a className="font-semibold text-slate-700 hover:underline dark:text-slate-200" href={`tel:${CONTACT_PHONE}`}>
              {CONTACT_PHONE}
            </a>
            <span className="px-2">·</span>
            <a className="font-semibold text-slate-700 hover:underline dark:text-slate-200" href={GOOGLE_MAPS_URL} target="_blank" rel="noreferrer">
              View on Google Maps
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Unified dashboard header
// ═══════════════════════════════════════════════════════════

function UnifiedDashboardHeader({
  user,
  isDark,
  toggleDark,
  onLogout,
  properties,
  selectedPropertyId,
  onSelectProperty,
  onOpenOnboardModal,
  onOwnerUpdated,
}: {
  user: SessionUser;
  isDark: boolean;
  toggleDark: () => void;
  onLogout: () => void;
  properties?: Array<{ id: string; name: string; city: string; totalBeds: number }>;
  selectedPropertyId?: string;
  onSelectProperty?: (id: string) => void;
  onOpenOnboardModal?: () => void;
  onOwnerUpdated?: (profile: { name: string; email: string }) => void;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Image src="/logo.svg" alt="" width={40} height={40} />
          <div className="min-w-0">
            <span className="block truncate text-xs font-bold tracking-tight text-slate-900 dark:text-white sm:text-sm">
              {HOSTEL_NAME}
            </span>
            <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">
              {user.role === 'OWNER' ? 'Owner' : 'Tenant'} · <span className="font-semibold text-slate-700 dark:text-slate-300">{user.name}</span>
            </p>
            <div className="hidden items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 xl:flex">
              <a className="hover:underline" href={`tel:${CONTACT_PHONE}`}>{CONTACT_PHONE}</a>
              <span>·</span>
              <a className="hover:underline" href={GOOGLE_MAPS_URL} target="_blank" rel="noreferrer">View on Google Maps</a>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:justify-end sm:gap-2">
          {user.role === 'OWNER' && properties && properties.length > 1 && selectedPropertyId && onSelectProperty && (
            <label className="sr-only" htmlFor="active-owner-property">Select property</label>
          )}
          {user.role === 'OWNER' && properties && properties.length > 1 && selectedPropertyId && onSelectProperty && (
            <select
              id="active-owner-property"
              value={selectedPropertyId}
              onChange={(event) => onSelectProperty(event.target.value)}
              className="min-h-[44px] max-w-[150px] rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 sm:max-w-[220px]"
            >
              {properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}
            </select>
          )}
          {user.role === 'OWNER' && selectedPropertyId && onOwnerUpdated && (
            <>
              <OwnerAccountSettings name={user.name} email={user.email} onUpdated={onOwnerUpdated} />
              <OwnerSharing propertyId={selectedPropertyId} />
              <button type="button" onClick={onOpenOnboardModal} className="inline-flex min-h-[44px] items-center gap-1 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500">
                <span aria-hidden="true">+</span><span className="hidden sm:inline">Add New Tenant</span><span className="sm:hidden">Add Tenant</span>
              </button>
            </>
          )}
          <DarkModeToggle isDark={isDark} toggle={toggleDark} />
          <button
            type="button"
            onClick={onLogout}
            className="flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-xs transition-all hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}

// ═══════════════════════════════════════════════════════════
// INLINE OWNER DASHBOARD
// ═══════════════════════════════════════════════════════════

function InlineOwnerDashboard({ user, onOwnerUpdated, isDark, toggleDark, onLogout }: {
  user: SessionUser;
  onOwnerUpdated: (profile: { name: string; email: string }) => void;
  isDark: boolean;
  toggleDark: () => void;
  onLogout: () => void;
}) {
  const ownedProps = user.ownedProperties || [];
  const [properties] = useState(
    ownedProps.length > 0
      ? ownedProps.map((p) => ({ id: p.id, name: p.name, city: p.city || HOSTEL_ADDRESS, totalBeds: 0 }))
      : [{ id: 'prop_1', name: HOSTEL_NAME, city: HOSTEL_ADDRESS, totalBeds: 6 }]
  );

  const [selectedPropertyId, setSelectedPropertyId] = useState(properties[0]?.id || 'prop_1');
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [complaints, setComplaints] = useState<OwnerComplaintItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [isOnboardOpen, setIsOnboardOpen] = useState(false);
  const [preSelectedBedId, setPreSelectedBedId] = useState<string | null>(null);
  const [tenantRefreshKey, setTenantRefreshKey] = useState(0);

  const fetchDashboardData = useCallback(async () => {
    setIsRefreshing(true);
    setDashboardError(null);
    try {
      const occRes = await fetch(`/api/owner/occupancy?propertyId=${selectedPropertyId}`);
      const occData = await occRes.json();
      if (!occRes.ok || !occData.success || !Array.isArray(occData.data)) {
        throw new Error(occData.error || 'Unable to load room occupancy.');
      }
      setRooms(occData.data);

      const invRes = await fetch(`/api/owner/invoices?propertyId=${selectedPropertyId}`);
      const invData = await invRes.json();
      if (!invRes.ok || !invData.success || !Array.isArray(invData.invoices)) {
        throw new Error(invData.error || 'Unable to load rent invoices.');
      }
      setInvoices(invData.invoices);
      const compRes = await fetch(`/api/owner/complaints?propertyId=${selectedPropertyId}`);
      const compData = await compRes.json();
      if (compRes.ok && compData.success && Array.isArray(compData.complaints)) {
        setComplaints(compData.complaints);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load owner dashboard data.';
      console.error('Owner dashboard data request failed:', error);
      setDashboardError(message);
    }
    finally {
      setIsRefreshing(false);
      setIsLoading(false);
      setTenantRefreshKey((current) => current + 1);
    }
  }, [selectedPropertyId]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  const handleAssignBed = (bed: BedData) => { setPreSelectedBedId(bed.id); setIsOnboardOpen(true); };

  let totalBeds = 0, occupiedBeds = 0;
  for (const room of rooms) for (const bed of room.beds) { totalBeds++; if (bed.status === 'OCCUPIED') occupiedBeds++; }
  const occupancyRate = totalBeds > 0 ? `${Math.round((occupiedBeds / totalBeds) * 100)}%` : '0%';
  const totalMonthlyRevenue = invoices.reduce((a, i) => a + i.totalAmount, 0);
  const collectedRevenue = invoices.filter((i) => i.status === 'PAID').reduce((a, i) => a + i.paidAmount, 0);
  const pendingDues = invoices.filter((i) => i.status === 'UNPAID' || i.status === 'OVERDUE').reduce((a, i) => a + (i.totalAmount - (i.paidAmount || 0)), 0);
  const overdueCount = invoices.filter((i) => i.status === 'OVERDUE').length;

  const openComplaints = complaints.filter((c) => c.status === 'OPEN' || c.status === 'IN_PROGRESS').length;
  const urgentComplaints = complaints.filter((c) => c.priority === 'URGENT' && c.status !== 'RESOLVED').length;
  const metrics: KpiMetrics = { totalBeds, occupiedBeds, occupancyRate, totalMonthlyRevenue, collectedRevenue, pendingDues, overdueCount, openComplaints, urgentComplaints }; 
  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950">
      <UnifiedDashboardHeader
        user={user}
        isDark={isDark}
        toggleDark={toggleDark}
        onLogout={onLogout}
        properties={properties}
        selectedPropertyId={selectedPropertyId}
        onSelectProperty={setSelectedPropertyId}
        onOpenOnboardModal={() => { setPreSelectedBedId(null); setIsOnboardOpen(true); }}
        onOwnerUpdated={onOwnerUpdated}
      />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {dashboardError && (
          <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
            {dashboardError}
          </p>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Operations & Occupancy Overview</h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Manage resident tenant profiles, bed slot allocations, and monthly rental settlements.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <OwnerRoomManagement propertyId={selectedPropertyId} rooms={rooms} onSuccess={fetchDashboardData} />
            <button onClick={fetchDashboardData} disabled={isRefreshing} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Refresh Data'}</span>
            </button>
          </div>
        </div>
        <KpiStats metrics={metrics} isLoading={isLoading} />
        <OccupancyGrid rooms={rooms} isLoading={isLoading} onAssignBed={handleAssignBed} />
        <OwnerTenantManagement
          propertyId={selectedPropertyId}
          rooms={rooms}
          refreshKey={tenantRefreshKey}
          onRefresh={fetchDashboardData}
        />
        <TenantDocumentsVault propertyId={selectedPropertyId} />
        <InvoicesTable invoices={invoices} isLoading={isLoading} propertyId={selectedPropertyId} onRefresh={fetchDashboardData} />
        <ComplaintsTable complaints={complaints} isLoading={isLoading} onRefresh={fetchDashboardData} />
        <div className="mx-auto max-w-7xl px-4 pb-8 text-center text-xs text-slate-500 dark:text-slate-400 sm:px-6 lg:px-8">
          <a className="hover:underline" href={`tel:${CONTACT_PHONE}`}>{CONTACT_PHONE}</a>
          <span className="px-2">·</span>
          <a className="hover:underline" href={GOOGLE_MAPS_URL} target="_blank" rel="noreferrer">View on Google Maps</a>
        </div>
      </main>
      <TenantOnboardModal isOpen={isOnboardOpen} onClose={() => { setIsOnboardOpen(false); setPreSelectedBedId(null); }} onSuccess={fetchDashboardData} rooms={rooms} preSelectedBedId={preSelectedBedId} propertyId={selectedPropertyId} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// INLINE TENANT DASHBOARD
// ═══════════════════════════════════════════════════════════

function InlineTenantDashboard({ user }: { user: SessionUser }) {
  const tenantProfile = user.tenantProfile;
  const resolvedTenantId = tenantProfile?.id || user.id;

  const DEFAULT_TENANT_DATA: TenantHomeData = {
    tenant: { id: resolvedTenantId, name: user.name, email: user.email, phone: user.phone || '', checkInDate: '', property: { name: HOSTEL_NAME, address: HOSTEL_ADDRESS, contactNumber: CONTACT_PHONE } },
    stayDetails: { hasBedAllocated: false, bed: null, room: null, roommates: [] },
    latestInvoice: null,
  };

  const [activeTab, setActiveTab] = useState<TenantTabType>('home');
  const [tenantData, setTenantData] = useState<TenantHomeData>(DEFAULT_TENANT_DATA);
  const [invoices, setInvoices] = useState<TenantInvoice[]>([]);
  const [complaints, setComplaints] = useState<TenantComplaint[]>([]);
  const [isLoading] = useState(false);
  const [upiModal, setUpiModal] = useState<{ isOpen: boolean; invoice: TenantInvoice | null }>({ isOpen: false, invoice: null });

  const fetchTenantData = useCallback(async () => {
    try {
      const dashRes = await fetch(`/api/tenant/dashboard?tenantId=${resolvedTenantId}`);
      if (dashRes.ok) { const d = await dashRes.json(); if (d.success && d.tenant) setTenantData(d); }
      const invRes = await fetch(`/api/tenant/invoices?tenantId=${resolvedTenantId}`);
      if (invRes.ok) { const d = await invRes.json(); if (d.success && Array.isArray(d.invoices)) setInvoices(d.invoices); }
      const compRes = await fetch(`/api/tenant/complaints?tenantId=${resolvedTenantId}`);
      if (compRes.ok) { const d = await compRes.json(); if (d.success && Array.isArray(d.complaints)) setComplaints(d.complaints); }
    } catch (error) { console.error('Tenant dashboard data request failed:', error); }
  }, [resolvedTenantId]);

  useEffect(() => { fetchTenantData(); }, [fetchTenantData]);

  const handleOpenUpiModal = (invoice: TenantInvoice) => setUpiModal({ isOpen: true, invoice });
  const handlePayFromHome = () => { const inv = invoices[0]; if (inv) handleOpenUpiModal(inv); else setActiveTab('bills'); };

  const hasUnpaidBill = invoices.some((i) => i.status === 'UNPAID' || i.status === 'OVERDUE');
  const openComplaintsCount = complaints.filter((c) => c.status === 'OPEN' || c.status === 'IN_PROGRESS').length;

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950">
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col bg-slate-50 pb-28 shadow-sm dark:bg-slate-900">
        {/* Top App Bar */}
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 bg-white/95 px-5 py-3 backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95">
          <div className="flex items-center gap-2">
            <Image src="/logo.svg" alt="" width={32} height={32} />
            <span className="text-xs font-bold tracking-tight text-slate-900 dark:text-white">{tenantData.tenant.property?.name || 'Resident Portal'}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Room {tenantData.stayDetails.room?.roomNumber || '—'}</span>
          </div>
        </div>

        <main className="mx-auto w-full flex-1">
          {activeTab === 'home' && <HomeTab data={tenantData} onChangeTab={setActiveTab} onPayRentClick={handlePayFromHome} />}
          {activeTab === 'bills' && <BillsTab invoices={invoices} isLoading={isLoading} onOpenUpiModal={handleOpenUpiModal} />}
          {activeTab === 'complaints' && <ComplaintsTab tenantId={resolvedTenantId} complaints={complaints} isLoading={isLoading} onRefresh={fetchTenantData} />}
          {activeTab === 'profile' && <TenantProfileKyc />}
        </main>

        <div className="px-5 pb-3 text-center text-[11px] text-slate-500 dark:text-slate-400">
          <a className="hover:underline" href={`tel:${CONTACT_PHONE}`}>{CONTACT_PHONE}</a>
          <span className="px-2">·</span>
          <a className="hover:underline" href={GOOGLE_MAPS_URL} target="_blank" rel="noreferrer">View on Google Maps</a>
        </div>

        <TenantBottomNav activeTab={activeTab} onChangeTab={setActiveTab} hasUnpaidBill={hasUnpaidBill} openComplaintsCount={openComplaintsCount} />

        {upiModal.isOpen && upiModal.invoice && (
          <UpiPaymentModal
            isOpen={upiModal.isOpen}
            onClose={() => setUpiModal({ isOpen: false, invoice: null })}
            onPaymentSuccess={() => {
              setInvoices((prev) => prev.map((inv) => inv.id === upiModal.invoice?.id ? { ...inv, status: 'PAID', paidAmount: inv.totalAmount, paidAt: new Date().toISOString() } : inv));
              setTenantData((prev) => ({ ...prev, latestInvoice: prev.latestInvoice ? { ...prev.latestInvoice, status: 'PAID' } : null }));
              fetchTenantData();
            }}
            invoiceId={upiModal.invoice.id}
            invoiceNumber={upiModal.invoice.invoiceNumber}
            totalAmount={upiModal.invoice.totalAmount}
            tenantName={tenantData.tenant.name}
          />
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ROOT PAGE — UNIFIED SPA
// ═══════════════════════════════════════════════════════════

export default function RootPage() {
  const { isDark, toggle: toggleDark } = useDarkMode();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    fetch('/api/auth/session', { cache: 'no-store' })
      .then(async (response) => {
        if (response.status === 401 || response.status === 403) return;
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || 'Unable to restore session.');
        setUser(data.user as SessionUser);
      })
      .catch((error) => console.error('[RootPage] Unable to restore session:', error))
      .finally(() => setIsHydrated(true));
  }, []);

  const handleLogin = (sessionUser: SessionUser) => {
    setUser(sessionUser);
  };

  const handleOwnerUpdated = (profile: { name: string; email: string }) => {
    setUser((current) => current ? { ...current, ...profile } : current);
  };

  const handleLogout = async () => {
    const response = await fetch('/api/auth/logout', { method: 'POST' });
    if (!response.ok) {
      throw new Error('Unable to log out. Please try again.');
    }
    setUser(null);
  };

  // Prevent hydration mismatch
  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  // LOGGED OUT → Login Screen
  if (!user) {
    return <LoginScreen isDark={isDark} toggleDark={toggleDark} onLogin={handleLogin} />;
  }

  if (user.role === 'OWNER') {
    return (
      <InlineOwnerDashboard
        user={user}
        onOwnerUpdated={handleOwnerUpdated}
        isDark={isDark}
        toggleDark={toggleDark}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <UnifiedDashboardHeader user={user} isDark={isDark} toggleDark={toggleDark} onLogout={handleLogout} />
      <InlineTenantDashboard user={user} />
    </div>
  );
}
