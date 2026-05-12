'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { authFetch } from '@/lib/fetch-utils';

interface WidgetDataResult {
  data: Array<Record<string, unknown>>;
  columns: string[];
  rowCount: number;
  executionTime: number;
}

interface UseWidgetDataReturn {
  result: WidgetDataResult | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// Simple in-memory cache for widget query results
const widgetDataCache = new Map<string, { result: WidgetDataResult; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// In-flight request deduplication: prevents identical concurrent requests
const pendingRequests = new Map<string, Promise<WidgetDataResult>>();

export function useWidgetData(
  dataSourceId: string | undefined,
  sqlQuery: string | undefined
): UseWidgetDataReturn {
  const [result, setResult] = useState<WidgetDataResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cacheKey = dataSourceId && sqlQuery ? `${dataSourceId}:${sqlQuery}` : null;

  const fetchData = useCallback(async () => {
    if (!dataSourceId || !sqlQuery) {
      setResult(null);
      setLoading(false);
      setError(null);
      return;
    }

    // Check cache first
    if (cacheKey) {
      const cached = widgetDataCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setResult(cached.result);
        setLoading(false);
        setError(null);
        return;
      }
    }

    // Check if there's already an in-flight request for this exact query
    if (cacheKey && pendingRequests.has(cacheKey)) {
      setLoading(true);
      setError(null);
      try {
        const pendingResult = await pendingRequests.get(cacheKey)!;
        setResult(pendingResult);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch widget data');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Abort any previous request for THIS hook instance
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    // Create the request promise and register it for deduplication
    const requestPromise = (async () => {
      const res = await authFetch('/api/query/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql: sqlQuery,
          dataSourceId,
          queryRowLimit: 500,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.details || 'Query execution failed');
      }

      const data = await res.json();
      const widgetResult: WidgetDataResult = {
        data: data.data || [],
        columns: data.columns || [],
        rowCount: data.rowCount || 0,
        executionTime: data.executionTime || 0,
      };

      // Update cache
      if (cacheKey) {
        widgetDataCache.set(cacheKey, { result: widgetResult, timestamp: Date.now() });
      }

      return widgetResult;
    })();

    // Register in-flight request for deduplication
    if (cacheKey) {
      pendingRequests.set(cacheKey, requestPromise);
    }

    try {
      const widgetResult = await requestPromise;
      setResult(widgetResult);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Failed to fetch widget data');
    } finally {
      // Remove from pending requests
      if (cacheKey) {
        pendingRequests.delete(cacheKey);
      }
      setLoading(false);
    }
  }, [dataSourceId, sqlQuery, cacheKey]);

  useEffect(() => {
    fetchData();
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [fetchData]);

  return { result, loading, error, refetch: fetchData };
}

/**
 * Execute a query on demand (not a hook) — used for "Run Query" preview
 * Also caches the result so when the widget is saved and rendered, it uses cached data
 */
export async function executeWidgetQuery(
  dataSourceId: string,
  sqlQuery: string
): Promise<WidgetDataResult> {
  const cacheKey = `${dataSourceId}:${sqlQuery}`;

  // Check cache first
  const cached = widgetDataCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }

  // Check for in-flight request
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey)!;
  }

  const res = await authFetch('/api/query/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sql: sqlQuery,
      dataSourceId,
      queryRowLimit: 500,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || errData.details || 'Query execution failed');
  }

  const data = await res.json();
  const result: WidgetDataResult = {
    data: data.data || [],
    columns: data.columns || [],
    rowCount: data.rowCount || 0,
    executionTime: data.executionTime || 0,
  };

  // Cache the result for future use
  widgetDataCache.set(cacheKey, { result, timestamp: Date.now() });

  return result;
}
