# IP Checker

Responsive, static IP/network dashboard designed for GitHub Pages.

## Features
- Separate IPv4 and IPv6 checks via ipify, with timeouts and unavailable states.
- IP geolocation, ISP, organization, ASN and timezone via ipwho.is.
- Approximate location map using Leaflet and OpenStreetMap tiles.
- Conservative VPN/proxy and IPv6 exposure indicators. **This is not a VPN leak test.**
- Device details, light/dark mode, copy and refresh.

## Deployment
1. Open **Settings → Pages** in this repository.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select **main** and **/(root)**, then save.
4. Wait for GitHub Pages to publish at https://nikita3311.github.io/2nd-test/.

No build process, server or API key is required.

## API usage and limitations
- [ipify](https://www.ipify.org/) for address detection: api.ipify.org (IPv4 only), api6.ipify.org (IPv6 only).
- [ipwho.is](https://ipwhois.io/documentation) for geolocation. Free tier: 1,000 requests/day **shared by the site domain** for browser/CORS traffic. On quota exhaustion, the IP can still display while location becomes unavailable.
- [Leaflet](https://leafletjs.com/) and [OpenStreetMap](https://www.openstreetmap.org/copyright) for mapping; map tiles require an internet connection and are subject to provider usage policies.
- The IP address reported is the address visible to each external API. Proxies, split tunnels and VPN rules can route these requests differently.
- Hosting-provider heuristics are incomplete and **cannot confirm** whether a VPN/proxy is in use. IPv6 reachability alone is **not proof of an IPv6 leak**.
- Browser and OS labels are approximate user-agent interpretations.

## Privacy
This static website does not run a backend, store addresses or set tracking cookies. Third-party lookup providers, map providers, CDNs and GitHub Pages may process request metadata, including IP addresses, according to their policies.

## Files
- `index.html` — page markup
- `style.css` — responsive styling
- `script.js` — lookups, state and interactions
