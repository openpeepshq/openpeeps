# Testing

This project uses [Vitest](https://vitest.dev/) for unit testing.

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests once and exit
pnpm test:run

# Run tests with coverage
pnpm test:coverage

# Open test UI
pnpm test:ui
```

## Test Structure

Tests are located in `src/lib/__tests__/` directory and follow the naming convention `*.test.ts`.

### Test Files

- `utils.test.ts` - Tests for utility functions
- `colors.test.ts` - Tests for color conversion functions
- `text.test.ts` - Tests for text manipulation functions
- `capabilitiesHelpers.test.ts` - Tests for capability checking functions
- `groupHelpers.test.ts` - Tests for group-related helper functions
- `postHelpers.test.ts` - Tests for post-related helper functions
- `profileHelpers.test.ts` - Tests for profile-related helper functions

## Coverage

The test suite provides comprehensive coverage of the utility functions with 96.87% statement coverage for the lib directory.

## Configuration

Test configuration is defined in `vitest.config.ts` with the following features:

- Node.js environment
- V8 coverage provider
- TypeScript support
- Path aliases for imports
