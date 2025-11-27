import { describe, expect, it } from 'vitest';
import { transformPath } from '../../src/config/platforms.js';

describe('Jenkins Plugin Support', () => {
  describe('Update Center Transformations', () => {
    it('should redirect default update-center.json to current', () => {
      const result = transformPath('/jenkins/update-center.json', 'jenkins');
      expect(result).toBe('/current/update-center.json');
    });

    it('should redirect update-center.actual.json to current', () => {
      const result = transformPath('/jenkins/update-center.actual.json', 'jenkins');
      expect(result).toBe('/current/update-center.actual.json');
    });

    it('should preserve current paths as-is', () => {
      const result = transformPath('/jenkins/current/update-center.json', 'jenkins');
      expect(result).toBe('/current/update-center.json');
    });

    it('should preserve experimental paths as-is', () => {
      const result = transformPath('/jenkins/experimental/update-center.json', 'jenkins');
      expect(result).toBe('/experimental/update-center.json');
    });

    it('should preserve download paths as-is', () => {
      const result = transformPath('/jenkins/download/plugins/git/5.2.1/git.hpi', 'jenkins');
      expect(result).toBe('/download/plugins/git/5.2.1/git.hpi');
    });
  });

  describe('Plugin Download Transformations', () => {
    it('should handle Maven plugin download', () => {
      const path = '/jenkins/download/plugins/maven-plugin/3.27/maven-plugin.hpi';
      const result = transformPath(path, 'jenkins');
      expect(result).toBe('/download/plugins/maven-plugin/3.27/maven-plugin.hpi');
    });

    it('should handle Git plugin download', () => {
      const path = '/jenkins/download/plugins/git/5.2.1/git.hpi';
      const result = transformPath(path, 'jenkins');
      expect(result).toBe('/download/plugins/git/5.2.1/git.hpi');
    });

    it('should handle workflow aggregator plugin download', () => {
      const path =
        '/jenkins/download/plugins/workflow-aggregator/596.v8c21c963d92d/workflow-aggregator.hpi';
      const result = transformPath(path, 'jenkins');
      expect(result).toBe(
        '/download/plugins/workflow-aggregator/596.v8c21c963d92d/workflow-aggregator.hpi'
      );
    });

    it('should handle blueocean plugin download', () => {
      const path = '/jenkins/download/plugins/blueocean/1.27.8/blueocean.hpi';
      const result = transformPath(path, 'jenkins');
      expect(result).toBe('/download/plugins/blueocean/1.27.8/blueocean.hpi');
    });
  });

  describe('Special Path Handling', () => {
    it('should prefix unknown paths with current', () => {
      const result = transformPath('/jenkins/unknown-path', 'jenkins');
      expect(result).toBe('/current/unknown-path');
    });

    it('should handle paths with query parameters', () => {
      const result = transformPath('/jenkins/update-center.json?version=2.401', 'jenkins');
      expect(result).toBe('/current/update-center.json?version=2.401');
    });

    it('should handle deep nested paths', () => {
      const result = transformPath('/jenkins/some/deep/nested/path', 'jenkins');
      expect(result).toBe('/current/some/deep/nested/path');
    });

    it('should handle root path', () => {
      const result = transformPath('/jenkins/', 'jenkins');
      expect(result).toBe('/current/');
    });
  });

  describe('Real-world Jenkins URLs', () => {
    const testCases = [
      {
        description: 'Jenkins update center',
        input: '/jenkins/update-center.json',
        expected: '/current/update-center.json'
      },
      {
        description: 'Jenkins experimental update center',
        input: '/jenkins/experimental/update-center.json',
        expected: '/experimental/update-center.json'
      },
      {
        description: 'Git plugin latest',
        input: '/jenkins/download/plugins/git/5.2.1/git.hpi',
        expected: '/download/plugins/git/5.2.1/git.hpi'
      },
      {
        description: 'Maven plugin',
        input: '/jenkins/download/plugins/maven-plugin/3.27/maven-plugin.hpi',
        expected: '/download/plugins/maven-plugin/3.27/maven-plugin.hpi'
      },
      {
        description: 'Docker workflow plugin',
        input: '/jenkins/download/plugins/docker-workflow/563.vd5d2e5c4007f/docker-workflow.hpi',
        expected: '/download/plugins/docker-workflow/563.vd5d2e5c4007f/docker-workflow.hpi'
      },
      {
        description: 'Blue Ocean plugin',
        input: '/jenkins/download/plugins/blueocean/1.27.8/blueocean.hpi',
        expected: '/download/plugins/blueocean/1.27.8/blueocean.hpi'
      }
    ];

    testCases.forEach(({ description, input, expected }) => {
      it(`should transform ${description} correctly`, () => {
        const result = transformPath(input, 'jenkins');
        expect(result).toBe(expected);
      });
    });
  });

  describe('Version Compatibility', () => {
    it('should handle various plugin version formats', () => {
      const versionFormats = [
        '1.0.0',
        '2.34.1',
        '596.v8c21c963d92d',
        '563.vd5d2e5c4007f',
        '1.27.8',
        '3.27'
      ];

      versionFormats.forEach(version => {
        const path = `/jenkins/download/plugins/test-plugin/${version}/test-plugin.hpi`;
        const result = transformPath(path, 'jenkins');
        expect(result).toBe(`/download/plugins/test-plugin/${version}/test-plugin.hpi`);
      });
    });

    it('should handle plugin names with special characters', () => {
      const pluginNames = [
        'maven-plugin',
        'workflow-aggregator',
        'docker-workflow',
        'ant',
        'build-timeout',
        'git',
        'github',
        'matrix-auth'
      ];

      pluginNames.forEach(pluginName => {
        const path = `/jenkins/download/plugins/${pluginName}/1.0.0/${pluginName}.hpi`;
        const result = transformPath(path, 'jenkins');
        expect(result).toBe(`/download/plugins/${pluginName}/1.0.0/${pluginName}.hpi`);
      });
    });
  });
});
