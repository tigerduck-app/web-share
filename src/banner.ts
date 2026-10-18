// The Smart App Banner's Open button hands app-argument to TigerDuck, which then imports what this
// page shares. Safari reads the tag while the page loads, so this runs in the head, before the body.
document
  .querySelector('meta[name="apple-itunes-app"]')!
  .setAttribute('content', `app-id=6761084888, app-argument=${location.href}`);
