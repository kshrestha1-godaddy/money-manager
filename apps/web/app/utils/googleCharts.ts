declare global {
  interface Window {
    google: any;
  }
}

let loaderPromise: Promise<void> | null = null;
const loadedPackages = new Set<string>();

function ensureScript(): Promise<void> {
  if (loaderPromise) return loaderPromise;
  loaderPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }
    if (window.google?.charts) {
      resolve();
      return;
    }
    const existing = document.querySelector('script[src="https://www.gstatic.com/charts/loader.js"]') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://www.gstatic.com/charts/loader.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return loaderPromise;
}

export async function loadGoogleCharts(packages: string[]): Promise<void> {
  await ensureScript();
  if (!packages || packages.length === 0) return;

  // Determine which packages still need to be loaded
  const missing = packages.filter((p) => !loadedPackages.has(p));
  if (missing.length === 0) return;

  await new Promise<void>((resolve) => {
    window.google.charts.load('current', { packages: missing });
    window.google.charts.setOnLoadCallback(() => {
      missing.forEach((p) => loadedPackages.add(p));
      resolve();
    });
  });
}


