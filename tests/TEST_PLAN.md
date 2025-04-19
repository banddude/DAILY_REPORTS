<!--
This document outlines a proposed testing strategy for the Daily Reports App,
covering both the Node/TypeScript server and the React Native/Expo mobile client.
-->
# Test Plan for Daily Reports App

## Table of Contents
1. [Overview](#overview)
2. [Directory Structure](#directory-structure)
3. [Dependencies & Tooling](#dependencies--tooling)
4. [Server Testing](#server-testing)
   - [Unit Tests](#unit-tests)
   - [Integration Tests](#integration-tests)
5. [Mobile Testing](#mobile-testing)
   - [Unit Tests](#unit-tests-1)
   - [Integration Tests](#integration-tests-1)
6. [End-to-End (E2E) Testing](#end-to-end-e2e-testing)
7. [Continuous Integration Setup](#continuous-integration-setup)
8. [Next Steps](#next-steps)

## 1. Overview
This plan establishes a workflow to add automated tests incrementally:
- **Unit Tests** for core logic, utilities, and components
- **Integration Tests** for server API endpoints and mobile screen flows
- **End-to-End (E2E) Tests** for critical user journeys across server + mobile

Goals:
- Improve code quality and catch regressions early
- Provide clear examples and tooling for future test additions
- Integrate tests into CI for automated validation

## 2. Directory Structure
Organize tests alongside source code in each project:

Root
├── server
│   ├── src
│   │   ├── __tests__        ← unit + integration tests for server
│   │   └── ...
│   ├── jest.server.config.js
│   └── package.json         ← add test scripts, devDependencies
└── mobile-app
    ├── src
    │   ├── __tests__        ← unit + integration tests for mobile
    │   └── ...
    ├── jest.config.js
    └── package.json         ← add test scripts, devDependencies

## 3. Dependencies & Tooling
- **Jest**: test runner and assertion library for both projects
- **ts-jest**: TypeScript support in Jest (server)
- **supertest**: HTTP assertions for server endpoints
- **@testing-library/react-native**: rendering & interaction tests for mobile
- **MSW** (Mock Service Worker) or `fetch-mock`: intercept network calls in tests
- **Detox** (optional): E2E framework for React Native apps

## 4. Server Testing

### 4.1 Unit Tests
- **Purpose**: validate pure functions, data transformations, report generation logic
- **Location**: `server/src/__tests__/*.test.ts`
- **Strategy**:
  - Import and call utilities/modules directly
  - Mock external clients (S3, Supabase, OpenAI, Puppeteer) via Jest mocks
  - Cover edge cases, error paths, and expected outputs

### 4.2 Integration Tests
- **Purpose**: exercise API routes end‑to‑end against an in‑memory or test database
- **Location**: `server/src/__tests__/*.int.test.ts`
- **Strategy**:
  - Use **supertest** to launch the Express app (built by `ts-node` or compiled code)
  - Spin up a disposable Supabase/Postgres instance or mock queries
  - Seed test data, call endpoints (e.g. `POST /reports`), assert HTTP codes & payloads
  - Clean up resources after each test

## 5. Mobile Testing

### 5.1 Unit Tests
- **Purpose**: test UI components, hooks, and utility modules in isolation
- **Location**: `mobile-app/src/__tests__/*.test.tsx`
- **Strategy**:
  - Use **@testing-library/react-native** for rendering components
  - Snapshot tests for stable UI
  - Mock navigation (`@react-navigation/native`) and network calls
  - Test hooks and context providers in isolation

### 5.2 Integration Tests
- **Purpose**: verify screen flows (e.g. login → report list → detail)
- **Location**: `mobile-app/src/__tests__/*.int.test.tsx`
- **Strategy**:
  - Render navigation container with relevant screens
  - Use **MSW** or `fetch-mock` to stub API responses
  - Simulate user interactions and assert navigation and UI changes

## 6. End-to-End (E2E) Testing
- **Purpose**: simulate real device interactions across server + mobile
- **Tooling**: **Detox** (preferred), **Appium** (alternative)
- **Strategy**:
  - Configure Detox with iOS/Android emulators
  - Write tests for critical flows (report creation, document preview)
  - Connect to a test backend instance or mock network at the HTTP layer

## 7. Continuous Integration Setup
- **CI Matrix**:
  - Node.js (server tests)
  - macOS/Linux (mobile tests)
- **Steps**:
  1. checkout code
  2. install dependencies (`npm ci`, `cd mobile-app && npm ci`)
  3. build server (`npm run build:server`)
  4. run server tests (`npm run test:server`)
  5. run mobile unit/integration tests (`cd mobile-app && npm run test`)
  6. optional: run Detox E2E (`npm run test:e2e`)

## 8. Next Steps
1. Add initial **Jest** configs and install devDependencies in both `server` and `mobile-app`.
2. Write smoke tests for one server endpoint and one mobile component.
3. Integrate tests into the existing **GitHub Actions** or CI pipeline.
4. Expand coverage gradually, focusing on critical business logic first.
5. Review and refine mocks/fixtures for reliability and maintainability.