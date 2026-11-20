const LOADER_URL = "https://www.gstatic.com/charts/loader.js";
const LOAD_TIMEOUT_MS = 15000;
let loaderPromise: Promise<void> | null = null;
const packagePromises = new Map<string, Promise<void>>();

function ensureScript() {
  if (window.google?.charts) return Promise.resolve();
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = LOADER_URL;
    script.async = true;

    const finish = (error?: Error) => {
      clearTimeout(timeout);
      script.onload = null;
      script.onerror = null;
      if (error) {
        script.remove();
        reject(error);
      } else {
        resolve();
      }
    };
    const timeout = setTimeout(() => finish(new Error("Chart library loading timed out")), LOAD_TIMEOUT_MS);
    script.onload = () => finish(window.google?.charts ? undefined : new Error("Chart library is unavailable"));
    script.onerror = () => finish(new Error("Could not load the chart library"));
    document.head.appendChild(script);
  }).catch((error) => {
    loaderPromise = null;
    throw error;
  });

  return loaderPromise;
}

function loadPackage(name: string) {
  const existing = packagePromises.get(name);
  if (existing) return existing;

  const promise = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Chart package ${name} timed out`)), LOAD_TIMEOUT_MS);
    try {
      window.google.charts.load("current", { packages: [name] });
      window.google.charts.setOnLoadCallback(() => {
        clearTimeout(timeout);
        resolve();
      });
    } catch (error) {
      clearTimeout(timeout);
      reject(error);
    }
  }).catch((error) => {
    packagePromises.delete(name);
    throw error;
  });

  packagePromises.set(name, promise);
  return promise;
}

export async function loadGoogleCharts(packages: string[]) {
  if (typeof window === "undefined" || packages.length === 0) return;
  await ensureScript();
  await Promise.all(packages.map(loadPackage));
}
