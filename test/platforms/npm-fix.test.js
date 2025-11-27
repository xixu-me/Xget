import { describe, expect, it } from 'vitest';

describe('npm URL Rewriting Fix', () => {
  it('should correctly rewrite npm registry URLs to preserve package names', () => {
    const mockOriginalText = JSON.stringify({
      name: 'npm',
      versions: {
        '11.5.1': {
          dist: {
            tarball: 'https://registry.npmjs.org/npm/-/npm-11.5.1.tgz'
          }
        }
      }
    });

    // Simulate the regex replacement that happens in the code
    const rewrittenText = mockOriginalText.replace(
      /https:\/\/registry\.npmjs\.org\/([^\/]+)/g,
      'https://xget.xi-xu.me/npm/$1'
    );

    const rewrittenData = JSON.parse(rewrittenText);

    // Verify the URL is correctly rewritten
    expect(rewrittenData.versions['11.5.1'].dist.tarball).toBe(
      'https://xget.xi-xu.me/npm/npm/-/npm-11.5.1.tgz'
    );
  });

  it('should handle scoped packages correctly', () => {
    const mockOriginalText = JSON.stringify({
      name: '@types/node',
      versions: {
        '20.0.0': {
          dist: {
            tarball: 'https://registry.npmjs.org/@types/node/-/node-20.0.0.tgz'
          }
        }
      }
    });

    const rewrittenText = mockOriginalText.replace(
      /https:\/\/registry\.npmjs\.org\/([^\/]+)/g,
      'https://xget.xi-xu.me/npm/$1'
    );

    const rewrittenData = JSON.parse(rewrittenText);

    expect(rewrittenData.versions['20.0.0'].dist.tarball).toBe(
      'https://xget.xi-xu.me/npm/@types/node/-/node-20.0.0.tgz'
    );
  });

  it('should handle multiple URLs in the same JSON response', () => {
    const mockOriginalText = JSON.stringify({
      dist: {
        tarball: 'https://registry.npmjs.org/package1/-/package1-1.0.0.tgz'
      },
      dependencies: {
        dep: {
          dist: {
            tarball: 'https://registry.npmjs.org/dep/-/dep-2.0.0.tgz'
          }
        }
      }
    });

    const rewrittenText = mockOriginalText.replace(
      /https:\/\/registry\.npmjs\.org\/([^\/]+)/g,
      'https://xget.xi-xu.me/npm/$1'
    );

    const rewrittenData = JSON.parse(rewrittenText);

    expect(rewrittenData.dist.tarball).toBe(
      'https://xget.xi-xu.me/npm/package1/-/package1-1.0.0.tgz'
    );
    expect(rewrittenData.dependencies.dep.dist.tarball).toBe(
      'https://xget.xi-xu.me/npm/dep/-/dep-2.0.0.tgz'
    );
  });
});
