import { Capacitor } from '@capacitor/core';

/** True inside the Android app, false in a normal browser. */
export const isNativeApp = Capacitor.isNativePlatform();

// The public website. Email links (verify, reset password, invites) must point here,
// because the Android app has no web address of its own.
const PUBLIC_SITE = 'https://tasksync404.vercel.app';
const configured = (import.meta.env.VITE_SITE_URL || '').trim().replace(/\/+$/, '');

/** Base address for links that leave the app: emails, invite links, copied links. */
export const SITE_URL = isNativeApp ? configured || PUBLIC_SITE : window.location.origin;

export const siteLink = (path = '/') => `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
