# Contributing to DGAPI Course Finder

Thank you for your interest in contributing! This guide will help you get started.

## Getting Started

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/discgolfapi/course-finder.git
cd course-finder
```

2. Start a local server:
```bash
python3 -m http.server 8080
```

3. Open in your browser:
- Demo: http://localhost:8080/
- Configurator: http://localhost:8080/configurator.html
- Development: http://localhost:8080/index.html

## How to Contribute

### Reporting Issues

Found a bug? Please create an issue with:
- Clear title and description
- Steps to reproduce
- Expected vs actual behaviour
- Browser and OS details
- Screenshots (if UI-related)

### Feature Requests

Have an idea? Open an issue describing:
- The use case
- Why it's useful
- How it should work
- Any relevant API or compatibility considerations

### Code Changes

1. **Fork and branch**: Create a branch from `main` for your work
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Code style**:
   - Use vanilla JavaScript (no frameworks or build steps)
   - Keep functions focused and readable
   - Add comments for non-obvious logic only
   - Use semantic HTML and CSS class names
   - Follow existing formatting conventions

3. **Test locally**:
   - Test in multiple browsers if changing UI
   - Test responsive layouts
   - Verify accessibility with keyboard navigation
   - Check that DiscGolfAPI attribution remains visible

4. **Commit messages**:
   - Use imperative mood: "Add feature" not "Added feature"
   - Keep messages concise and descriptive
   - Reference issue numbers if applicable: "Fix #123"

5. **Push and create a PR**:
   - Push your branch to your fork
   - Create a pull request against `discgolfapi/course-finder:main`
   - Describe what changed and why
   - Link related issues

## Code Guidelines

### JavaScript

- No transpilation or build steps needed
- Target modern browsers (ES6+ OK)
- Use `fetch()` for API calls
- Prefer vanilla DOM methods over jQuery
- Keep bundle size in mind

### HTML & CSS

- Use semantic HTML5 elements
- BEM naming convention for CSS classes
- Keep styles in external stylesheets (no inline styles)
- Test color contrast for accessibility

### Documentation

- Update README.md if adding features or changing configuration
- Keep examples working and tested
- Document new data attributes with their purpose and values

## Areas We Need Help With

- Additional country/region presets
- UI/UX improvements and design feedback
- Accessibility enhancements
- Performance optimizations
- Documentation and examples
- Bug reports and fixes

## Questions?

- Check existing issues and discussions
- Review the README for common questions
- Open an issue with your question

## License

By contributing, you agree that your contributions will be licensed under the same terms as the project (see [LICENSE](LICENSE)).

---

Made with ❤️ for the disc golf community.
