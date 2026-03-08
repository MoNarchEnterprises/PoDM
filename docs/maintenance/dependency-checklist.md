# Dependency Maintenance Checklist

**Last Updated**: February 1, 2026  
**Status**: Active Monitoring Required

---

## Current Deprecation Warnings

### Frontend (`podm-frontend`)

#### ⚠️ Priority: Medium
- **Package**: `inflight@1.0.6`
  - **Issue**: Memory leak, no longer supported
  - **Source**: Transitive dependency (from build tools)
  - **Recommended Fix**: Update to `lru-cache` or wait for parent packages to update
  - **Impact**: Build-time only, no runtime impact
  - **Detected**: February 1, 2026 (Cloudflare deployment)

- **Package**: `glob@7.2.3`
  - **Issue**: Versions prior to v9 no longer supported
  - **Source**: Transitive dependency (from build tools)
  - **Recommended Fix**: Update to `glob@^10.0.0` or wait for parent packages
  - **Impact**: Build-time only, no runtime impact
  - **Detected**: February 1, 2026 (Cloudflare deployment)

---

## Maintenance Schedule

### Monthly Tasks (1st of each month)
- [ ] Run `npm outdated` in both `podm-frontend` and `PoDM_project`
- [ ] Review security advisories: `npm audit`
- [ ] Check for critical vulnerabilities
- [ ] Update patch versions if safe

### Quarterly Tasks (Every 3 months)
- [ ] Review and update minor versions
- [ ] Test all functionality after updates
- [ ] Update transitive dependencies: `npm update`
- [ ] Run full test suite
- [ ] Check Cloudflare deployment logs for new warnings

### Before Major Releases
- [ ] Full dependency audit
- [ ] Update all packages to latest stable versions
- [ ] Run security scan: `npm audit fix`
- [ ] Test in staging environment
- [ ] Document breaking changes

---

## Commands Reference

### Check for outdated packages
```bash
# Frontend
cd podm-frontend
npm outdated

# Backend
cd PoDM_project
npm outdated
```

### Security audit
```bash
npm audit
npm audit fix          # Auto-fix non-breaking changes
npm audit fix --force  # Fix all (may have breaking changes)
```

### Update dependencies
```bash
npm update              # Update within semver ranges
npm update --save       # Update package.json
```

### Clean install (if issues persist)
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## Known Safe Updates

### Frontend
- ✅ Vite: Currently on 7.1.2 (latest)
- ✅ React: Currently on 18.2.0 (stable)
- ✅ TypeScript: Up to date via typescript-eslint
- ✅ Tailwind: 3.4.1 (stable)

### Backend
- ✅ Express: Check version
- ✅ Supabase: Keep in sync with frontend
- ✅ Stripe: Keep in sync with frontend

---

## Override Configuration (if needed)

If deprecation warnings persist after updates, add to `package.json`:

```json
"overrides": {
  "glob": "^10.0.0",
  "inflight": "^2.0.0"
}
```

**Note**: Only use overrides as a last resort, as they can cause compatibility issues.

---

## Security Vulnerability Response Plan

### Critical (CVSS 9.0-10.0)
1. **Immediate action required**
2. Update package immediately
3. Test in development
4. Deploy to production within 24 hours
5. Notify team

### High (CVSS 7.0-8.9)
1. **Update within 1 week**
2. Review impact
3. Test thoroughly
4. Schedule deployment
5. Document changes

### Medium (CVSS 4.0-6.9)
1. **Update in next release cycle**
2. Include in monthly maintenance
3. Test with other updates

### Low (CVSS 0.1-3.9)
1. **Update in quarterly review**
2. Monitor for escalation
3. Bundle with other updates

---

## Deployment Checklist

Before each deployment:
- [ ] No critical npm audit issues
- [ ] All tests passing
- [ ] Build succeeds locally
- [ ] Review Cloudflare deployment logs
- [ ] Check for new deprecation warnings
- [ ] Document any new warnings in this file

---

## Notes

- **Current Status**: Deployment successful with warnings (Feb 1, 2026)
- **Action Required**: None immediate, monitor in next update cycle
- **Next Review**: March 1, 2026 (monthly check)

---

## Change Log

### February 1, 2026
- Initial checklist created
- Documented `inflight` and `glob` deprecation warnings
- Deployment successful despite warnings
- Set next review date: March 1, 2026
