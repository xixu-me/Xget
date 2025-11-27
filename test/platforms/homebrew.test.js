import { describe, expect, it } from 'vitest';
import { transformPath } from '../../src/config/platforms.js';

describe('Homebrew path transformation', () => {
  describe('homebrew-api platform', () => {
    it('should handle formula API paths correctly', () => {
      const path = '/homebrew/api/formula/git.json';
      const result = transformPath(path, 'homebrew-api');
      expect(result).toBe('/formula/git.json');
    });

    it('should handle cask API paths correctly', () => {
      const path = '/homebrew/api/cask/docker.json';
      const result = transformPath(path, 'homebrew-api');
      expect(result).toBe('/cask/docker.json');
    });

    it('should handle formula list API paths correctly', () => {
      const path = '/homebrew/api/formula.json';
      const result = transformPath(path, 'homebrew-api');
      expect(result).toBe('/formula.json');
    });

    it('should handle cask list API paths correctly', () => {
      const path = '/homebrew/api/cask.json';
      const result = transformPath(path, 'homebrew-api');
      expect(result).toBe('/cask.json');
    });
  });

  describe('homebrew-bottles platform', () => {
    it('should handle bottle manifest paths correctly', () => {
      const path = '/homebrew/bottles/v2/homebrew/core/git/manifests/2.39.0';
      const result = transformPath(path, 'homebrew-bottles');
      expect(result).toBe('/v2/homebrew/core/git/manifests/2.39.0');
    });

    it('should handle bottle blob paths correctly', () => {
      const path = '/homebrew/bottles/v2/homebrew/core/git/blobs/sha256:abcd1234';
      const result = transformPath(path, 'homebrew-bottles');
      expect(result).toBe('/v2/homebrew/core/git/blobs/sha256:abcd1234');
    });

    it('should handle bottle catalog paths correctly', () => {
      const path = '/homebrew/bottles/v2/_catalog';
      const result = transformPath(path, 'homebrew-bottles');
      expect(result).toBe('/v2/_catalog');
    });
  });

  describe('homebrew platform', () => {
    it('should handle brew repository paths correctly', () => {
      const path = '/homebrew/brew.git/info/refs';
      const result = transformPath(path, 'homebrew');
      expect(result).toBe('/brew.git/info/refs');
    });

    it('should handle homebrew-core repository paths correctly', () => {
      const path = '/homebrew/homebrew-core.git/info/refs';
      const result = transformPath(path, 'homebrew');
      expect(result).toBe('/homebrew-core.git/info/refs');
    });

    it('should handle homebrew-cask repository paths correctly', () => {
      const path = '/homebrew/homebrew-cask.git/archive/refs/heads/master.tar.gz';
      const result = transformPath(path, 'homebrew');
      expect(result).toBe('/homebrew-cask.git/archive/refs/heads/master.tar.gz');
    });

    it('should handle raw file downloads correctly', () => {
      const path = '/homebrew/homebrew-core/archive/master.tar.gz';
      const result = transformPath(path, 'homebrew');
      expect(result).toBe('/homebrew-core/archive/master.tar.gz');
    });
  });
});
