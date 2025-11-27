import { describe, expect, it } from 'vitest';
import { PLATFORMS, transformPath } from '../../src/config/platforms.js';

describe('CRAN Platform Configuration', () => {
  it('should have CRAN platform configured', () => {
    expect(PLATFORMS.cran).toBe('https://cran.r-project.org');
  });

  it('should transform CRAN paths correctly', () => {
    const testCases = [
      {
        input: '/cran/src/contrib/ggplot2_3.5.2.tar.gz',
        expected: '/src/contrib/ggplot2_3.5.2.tar.gz',
        description: 'package source file'
      },
      {
        input: '/cran/web/packages/dplyr/DESCRIPTION',
        expected: '/web/packages/dplyr/DESCRIPTION',
        description: 'package description file'
      },
      {
        input: '/cran/bin/windows/contrib/4.3/ggplot2_3.4.4.zip',
        expected: '/bin/windows/contrib/4.3/ggplot2_3.4.4.zip',
        description: 'Windows binary package'
      },
      {
        input: '/cran/bin/macosx/big-sur-arm64/contrib/4.3/ggplot2_3.4.4.tgz',
        expected: '/bin/macosx/big-sur-arm64/contrib/4.3/ggplot2_3.4.4.tgz',
        description: 'macOS binary package'
      },
      {
        input: '/cran/web/packages/packages.rds',
        expected: '/web/packages/packages.rds',
        description: 'package index file'
      }
    ];

    testCases.forEach(({ input, expected, description }) => {
      const result = transformPath(input, 'cran');
      expect(result).toBe(expected, `Failed for ${description}: ${input}`);
    });
  });

  it('should handle root path correctly', () => {
    const result = transformPath('/cran/', 'cran');
    expect(result).toBe('/');
  });

  it('should handle paths without platform prefix', () => {
    const result = transformPath('/src/contrib/ggplot2_3.5.2.tar.gz', 'cran');
    expect(result).toBe('/src/contrib/ggplot2_3.5.2.tar.gz');
  });
});
