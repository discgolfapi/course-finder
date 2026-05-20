# Security Policy

## Reporting Security Issues

If you discover a security vulnerability in the DGAPI Course Finder, please email security@discgolfapi.com with:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

**Please do not** file a public GitHub issue for security vulnerabilities.

## Security Features

### Course Badges
- Badges are pure data (JSON) — no code execution
- Badge URLs are not followed automatically; users must click links
- See [Course Badges](README.md#course-badges) for detailed security guarantees

### DiscGolfAPI Integration
- Data fetched from official DiscGolfAPI endpoint only
- No credential storage in browser
- No tracking or personal data collection
- SSL/HTTPS recommended for deployment

### Data Handling
- No server-side sessions
- No cookies set by the finder
- No external tracking services
- Geolocation data stays in browser (never sent to server)

## Supported Versions

Security updates are provided for the latest version only.

## Updates

Keep the course finder updated to receive security patches:
- Check GitHub releases regularly
- Update `assets/` files when new versions are available
- Test updates locally before deploying to production

## Attribution

Maintaining visible attribution to DiscGolfAPI is both a license requirement and helps ensure data integrity and trust.
