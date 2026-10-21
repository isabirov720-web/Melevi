// OpenNext adapter config for Cloudflare Workers.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
	// No incremental cache: all storefront pages are dynamic (rendered per request),
	// so there is nothing to store. Add R2 caching here if static/ISR pages appear later.
	// See https://opennext.js.org/cloudflare/caching
});
