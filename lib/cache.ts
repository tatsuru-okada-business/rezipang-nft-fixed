// Simple in-memory cache for performance optimization
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  version?: string;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes
  private currentVersion: string | null = null;
  private lastVersionCheck: number = 0;
  private readonly versionCheckInterval = 10 * 1000; // 10 seconds

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      version: this.currentVersion || undefined,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    
    // TTL check
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    // Version check (if version is set)
    if (entry.version && this.currentVersion && entry.version !== this.currentVersion) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  setVersion(version: string): void {
    if (this.currentVersion !== version) {
      this.currentVersion = version;
      // Clear all versioned cache entries
      for (const [key, entry] of this.cache.entries()) {
        if (entry.version && entry.version !== version) {
          this.cache.delete(key);
        }
      }
    }
  }

  async checkVersion(): Promise<void> {
    const now = Date.now();
    if (now - this.lastVersionCheck < this.versionCheckInterval) {
      return;
    }
    
    this.lastVersionCheck = now;
    
    try {
      const response = await fetch('/api/settings-version', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.version) {
          this.setVersion(data.version);
        }
      }
    } catch (error) {
      // Silently fail, will retry on next check
    }
  }
}

export const cache = new MemoryCache();

// Helper function to cache API responses
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Check for version updates
  await cache.checkVersion();
  
  const cached = cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  const data = await fetcher();
  cache.set(key, data, ttl);
  return data;
}