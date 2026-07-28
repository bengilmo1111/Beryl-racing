export async function installOfflineRoutes(context) {
  await context.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' })
  );
  await context.route('https://fonts.gstatic.com/**', (route) => route.abort());
}

export function watchPage(page) {
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.stack || error.message));
  page.on('requestfailed', (request) => {
    if (!request.url().endsWith('/favicon.ico')) {
      failedRequests.push(`${request.failure()?.errorText || 'failed'} ${request.url()}`);
    }
  });
  page.on('response', (response) => {
    if (response.status() >= 400 && !response.url().endsWith('/favicon.ico')) {
      failedRequests.push(`${response.status()} ${response.url()}`);
    }
  });

  return { consoleErrors, pageErrors, failedRequests };
}

export function unique(values) {
  return [...new Set(values)];
}
