import { describe, expect, it } from 'vitest';
import { PLATFORMS, transformPath } from '../../src/config/platforms.js';

describe('openSUSE Platform Configuration', () => {
  it('should have openSUSE platform configured', () => {
    expect(PLATFORMS.opensuse).toBe('https://download.opensuse.org');
  });

  it('should transform openSUSE paths correctly', () => {
    const testCases = [
      {
        input:
          '/opensuse/distribution/leap/15.5/repo/oss/x86_64/vim-9.0.1572-150500.20.8.1.x86_64.rpm',
        expected: '/distribution/leap/15.5/repo/oss/x86_64/vim-9.0.1572-150500.20.8.1.x86_64.rpm',
        description: 'Leap package file'
      },
      {
        input: '/opensuse/tumbleweed/repo/oss/x86_64/firefox-121.0-1.1.x86_64.rpm',
        expected: '/tumbleweed/repo/oss/x86_64/firefox-121.0-1.1.x86_64.rpm',
        description: 'Tumbleweed package file'
      },
      {
        input: '/opensuse/distribution/leap/15.5/repo/oss/repodata/repomd.xml',
        expected: '/distribution/leap/15.5/repo/oss/repodata/repomd.xml',
        description: 'repository metadata'
      },
      {
        input:
          '/opensuse/source/distribution/leap/15.5/repo/oss/src/kernel-default-5.14.21-150500.55.44.1.src.rpm',
        expected:
          '/source/distribution/leap/15.5/repo/oss/src/kernel-default-5.14.21-150500.55.44.1.src.rpm',
        description: 'source package'
      },
      {
        input: '/opensuse/update/leap/15.5/oss/x86_64/systemd-249.17-150400.8.35.1.x86_64.rpm',
        expected: '/update/leap/15.5/oss/x86_64/systemd-249.17-150400.8.35.1.x86_64.rpm',
        description: 'update package'
      }
    ];

    testCases.forEach(({ input, expected, description }) => {
      const result = transformPath(input, 'opensuse');
      expect(result).toBe(expected, `Failed for ${description}: ${input}`);
    });
  });

  it('should handle root path correctly', () => {
    const result = transformPath('/opensuse/', 'opensuse');
    expect(result).toBe('/');
  });

  it('should handle paths without platform prefix', () => {
    const result = transformPath(
      '/distribution/leap/15.5/repo/oss/x86_64/vim-9.0.1572-150500.20.8.1.x86_64.rpm',
      'opensuse'
    );
    expect(result).toBe(
      '/distribution/leap/15.5/repo/oss/x86_64/vim-9.0.1572-150500.20.8.1.x86_64.rpm'
    );
  });
});
