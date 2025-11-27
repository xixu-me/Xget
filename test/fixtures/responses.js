/**
 * Mock HTTP response fixtures for testing
 * Organized by platform with realistic response data
 */

export const MOCK_RESPONSES = {
  github: {
    packageJson: {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=300' },
      body: JSON.stringify({
        name: 'vscode',
        version: '1.85.0',
        description: 'Visual Studio Code'
      })
    },
    readme: {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: '# Visual Studio Code\n\nCode editing. Redefined.'
    },
    gitInfoRefs: {
      status: 200,
      headers: { 'Content-Type': 'application/x-git-upload-pack-advertisement' },
      body: '001e# service=git-upload-pack\n0000009144b8c8cf...'
    }
  },

  npm: {
    packageMetadata: {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'react',
        version: '18.2.0',
        description: 'React is a JavaScript library for building user interfaces.'
      })
    }
  },

  pypi: {
    simpleIndex: {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
      body: '<!DOCTYPE html><html><head><title>Links for requests</title></head></html>'
    }
  },

  errors: {
    notFound: { status: 404, headers: { 'Content-Type': 'text/plain' }, body: 'Not Found' },
    badRequest: { status: 400, headers: { 'Content-Type': 'text/plain' }, body: 'Bad Request' },
    unauthorized: {
      status: 401,
      headers: { 'Content-Type': 'text/plain' },
      body: 'Unauthorized'
    },
    internalServerError: {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
      body: 'Internal Server Error'
    }
  }
};

/**
 * Create a Response object from mock data
 */
export function createMockResponse(mockData) {
  return new Response(mockData.body, {
    status: mockData.status,
    headers: mockData.headers
  });
}
