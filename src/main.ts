import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { appRuntimeConfig, type AppRuntimeConfig } from './app/app-runtime-config';

loadRuntimeConfig()
  .then(() => bootstrapApplication(App, appConfig))
  .catch((err) => console.error(err));

async function loadRuntimeConfig(): Promise<void> {
  const configUrl = new URL('app-config.json', document.baseURI).toString();

  try {
    const response = await fetch(configUrl, { cache: 'no-store' });

    if (!response.ok) {
      return;
    }

    const config = (await response.json()) as Partial<AppRuntimeConfig>;
    appRuntimeConfig.apiBaseUrl = config.apiBaseUrl?.trim() ?? '';
  } catch {
    appRuntimeConfig.apiBaseUrl = '';
  }
}
