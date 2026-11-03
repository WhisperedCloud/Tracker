/**
 * Android app only: things a browser does by itself that the app's WebView does not.
 * Imported once from main.jsx; does nothing in a normal browser.
 */
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { isNativeApp } from '@/lib/platform';
import { closeTopLayer } from '@/components/ui/overlay';

const openInBrowser = (url) => {
  if (!url) return;
  Browser.open({ url: String(url) }).catch(() => { window.location.href = String(url); });
};

if (isNativeApp) {
  // Files and links open in the phone's browser (Chrome tab). The pages open a blank tab
  // first and set its address once a signed file URL is ready, so hand back a stand-in tab.
  window.open = (url) => {
    if (url) {
      openInBrowser(url);
      return null;
    }
    const tab = { closed: false, close() { this.closed = true; }, location: {} };
    Object.defineProperty(tab.location, 'href', { set: (next) => { if (!tab.closed) openInBrowser(next); } });
    return tab;
  };

  // Links to other sites (meeting links, resource links) also go to the browser,
  // instead of replacing the app.
  document.addEventListener('click', (event) => {
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!link) return;
    let url;
    try { url = new URL(link.href, window.location.href); } catch { return; }
    if (!/^https?:$/.test(url.protocol) || url.origin === window.location.origin) return;
    event.preventDefault();
    openInBrowser(url.href);
  }, true);

  // Android Back: close the open popup, then step back inside the app, then leave it.
  App.addListener('backButton', () => {
    if (closeTopLayer()) return;
    const back = new CustomEvent('tasksync:back', { cancelable: true });
    window.dispatchEvent(back);
    if (!back.defaultPrevented) App.minimizeApp();
  });
}
