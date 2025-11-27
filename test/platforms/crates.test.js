import { describe, expect, it } from 'vitest';
import { transformPath } from '../../src/config/platforms.js';

describe('crates.io path transformation', () => {
  it('should transform crate download URLs correctly', () => {
    const path = '/crates/serde/1.0.0/download';
    const result = transformPath(path, 'crates');
    expect(result).toBe('/api/v1/crates/serde/1.0.0/download');
  });

  it('should transform crate metadata URLs correctly', () => {
    const path = '/crates/serde';
    const result = transformPath(path, 'crates');
    expect(result).toBe('/api/v1/crates/serde');
  });

  it('should transform crate version URLs correctly', () => {
    const path = '/crates/serde/1.0.0';
    const result = transformPath(path, 'crates');
    expect(result).toBe('/api/v1/crates/serde/1.0.0');
  });

  it('should transform search URLs correctly', () => {
    const path = '/crates/?q=serde';
    const result = transformPath(path, 'crates');
    expect(result).toBe('/api/v1/crates?q=serde');
  });

  it('should transform root crates URL correctly', () => {
    const path = '/crates/';
    const result = transformPath(path, 'crates');
    expect(result).toBe('/api/v1/crates');
  });
});
