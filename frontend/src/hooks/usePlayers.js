import { useState, useEffect, useCallback } from 'react';
import api, { fetchSheet, fetchRankings as fetchRankingsFromSheet } from '../utils/api';

export function usePlayers() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPlayers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchSheet();
      setPlayers(data);
    } catch (err) {
      setError(err.message || 'Failed to load players');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  return { players, loading, error, refetch: fetchPlayers };
}

export function useRankings() {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRankingsData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Use the League Points tab directly — accurate & fast
      const data = await fetchRankingsFromSheet();
      setRankings(data);
    } catch (err) {
      setError(err.message || 'Failed to load rankings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRankingsData();
  }, [fetchRankingsData]);

  return { rankings, loading, error, refetch: fetchRankingsData };
}
