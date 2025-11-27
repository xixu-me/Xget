import { SELF } from 'cloudflare:test';
import { bench, describe } from 'vitest';
import { PerformanceTestHelper, TEST_URLS } from '../helpers/test-utils.js';

describe('Performance Benchmarks', () => {
  const perfHelper = new PerformanceTestHelper();

  describe('Request Processing Speed', () => {
    bench('Basic request handling', async () => {
      await SELF.fetch('https://example.com/gh/test/repo/file.txt', {
        method: 'HEAD'
      });
    });

    bench('GitHub file request', async () => {
      await SELF.fetch(TEST_URLS.github.file, {
        method: 'HEAD'
      });
    });

    bench('GitLab file request', async () => {
      await SELF.fetch(TEST_URLS.gitlab.file, {
        method: 'HEAD'
      });
    });

    bench('Hugging Face model request', async () => {
      await SELF.fetch(TEST_URLS.huggingface.model, {
        method: 'HEAD'
      });
    });

    bench('npm package request', async () => {
      await SELF.fetch(TEST_URLS.npm.package, {
        method: 'HEAD'
      });
    });

    bench('PyPI package request', async () => {
      await SELF.fetch(TEST_URLS.pypi.simple, {
        method: 'HEAD'
      });
    });

    bench('conda package request', async () => {
      await SELF.fetch(TEST_URLS.conda.main, {
        method: 'HEAD'
      });
    });
  });

  describe('Git Protocol Performance', () => {
    bench('Git info/refs request', async () => {
      await SELF.fetch('https://example.com/gh/test/repo.git/info/refs?service=git-upload-pack', {
        headers: {
          'User-Agent': 'git/2.34.1'
        }
      });
    });

    bench('Git upload-pack request', async () => {
      await SELF.fetch('https://example.com/gh/test/repo.git/git-upload-pack', {
        method: 'POST',
        headers: {
          'User-Agent': 'git/2.34.1',
          'Content-Type': 'application/x-git-upload-pack-request'
        },
        body: '0000'
      });
    });
  });

  describe('Security Header Processing', () => {
    bench('Security headers addition', async () => {
      const response = await SELF.fetch('https://example.com/gh/test/repo/file.txt');

      // Verify headers are present (this adds to processing time)
      response.headers.get('Strict-Transport-Security');
      response.headers.get('X-Frame-Options');
      response.headers.get('X-XSS-Protection');
      response.headers.get('Content-Security-Policy');
      response.headers.get('Referrer-Policy');
    });
  });

  describe('Error Handling Performance', () => {
    bench('404 error handling', async () => {
      await SELF.fetch('https://example.com/gh/nonexistent/repo/file.txt');
    });

    bench('400 error handling', async () => {
      await SELF.fetch('https://example.com/invalid-platform/test');
    });

    bench('405 error handling', async () => {
      await SELF.fetch('https://example.com/gh/test/repo/file.txt', {
        method: 'DELETE'
      });
    });
  });

  describe('Concurrent Request Handling', () => {
    bench('10 concurrent requests', async () => {
      const requests = Array(10)
        .fill()
        .map(() =>
          SELF.fetch('https://example.com/gh/test/repo/file.txt', {
            method: 'HEAD'
          })
        );

      await Promise.all(requests);
    });

    bench('50 concurrent requests', async () => {
      const requests = Array(50)
        .fill()
        .map(() =>
          SELF.fetch('https://example.com/gh/test/repo/file.txt', {
            method: 'HEAD'
          })
        );

      await Promise.all(requests);
    });
  });

  describe('Path Processing Performance', () => {
    bench('Short path processing', async () => {
      await SELF.fetch('https://example.com/gh/a/b', {
        method: 'HEAD'
      });
    });

    bench('Medium path processing', async () => {
      await SELF.fetch('https://example.com/gh/user/repository/path/to/some/file.txt', {
        method: 'HEAD'
      });
    });

    bench('Long path processing', async () => {
      const longPath = `/gh/user/repo/${'very-long-path-segment/'.repeat(20)}file.txt`;
      await SELF.fetch(`https://example.com${longPath}`, {
        method: 'HEAD'
      });
    });
  });

  describe('URL Parsing Performance', () => {
    bench('Simple URL parsing', async () => {
      await SELF.fetch('https://example.com/gh/user/repo');
    });

    bench('URL with query parameters', async () => {
      await SELF.fetch('https://example.com/gh/user/repo/file.txt?ref=main&path=src');
    });

    bench('URL with fragments', async () => {
      await SELF.fetch('https://example.com/gh/user/repo/README.md#section');
    });

    bench('Complex URL parsing', async () => {
      await SELF.fetch(
        'https://example.com/gh/user/repo/file.txt?ref=feature/branch&path=src/components&line=123#L123'
      );
    });
  });

  describe('Memory Usage Patterns', () => {
    bench('Request object creation', async () => {
      const request = new Request('https://example.com/gh/test/repo/file.txt', {
        method: 'GET',
        headers: {
          'User-Agent': 'Test/1.0',
          Accept: '*/*'
        }
      });

      // Process the request
      await SELF.fetch(request);
    });

    bench('Response object processing', async () => {
      const response = await SELF.fetch('https://example.com/gh/test/repo/file.txt');

      // Access various response properties
      response.status;
      response.statusText;
      response.headers.get('Content-Type');
      response.headers.get('X-Performance-Metrics');
    });
  });

  describe('Platform-Specific Performance', () => {
    bench('GitHub platform processing', async () => {
      await SELF.fetch('https://example.com/gh/microsoft/vscode/blob/main/package.json');
    });

    bench('GitLab platform processing', async () => {
      await SELF.fetch('https://example.com/gl/gitlab-org/gitlab/-/blob/master/package.json');
    });

    bench('Hugging Face platform processing', async () => {
      await SELF.fetch('https://example.com/hf/microsoft/DialoGPT-medium/resolve/main/config.json');
    });

    bench('npm platform processing', async () => {
      await SELF.fetch('https://example.com/npm/react');
    });

    bench('PyPI platform processing', async () => {
      await SELF.fetch('https://example.com/pypi/simple/requests/');
    });

    bench('conda platform processing', async () => {
      await SELF.fetch('https://example.com/conda/pkgs/main/linux-64/numpy-1.24.3.conda');
    });
  });
});
