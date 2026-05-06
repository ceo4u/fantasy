import { useState, useEffect, useCallback } from 'react';
import { fetchSheet, fetchRankings as fetchRankingsFromSheet, fetchSquad as fetchSquadFromApi } from '../utils/api';

export function usePlayers() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPlayers = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      setPlayers(await fetchSheet());
    } catch (err) {
      setError(err.message || 'Failed to load players');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPlayers(); }, [fetchPlayers]);
  return { players, loading, error, refetch: fetchPlayers };
}

export function useRankings() {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRankingsData = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      setRankings(await fetchRankingsFromSheet());
    } catch (err) {
      setError(err.message || 'Failed to load rankings');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRankingsData(); }, [fetchRankingsData]);
  return { rankings, loading, error, refetch: fetchRankingsData };
}

export function useSquad(teamName) {
  const [squad, setSquad] = useState(null);   // { players, matchTotals, matchLabels }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    if (!teamName) return;
    try {
      setLoading(true); setError(null);
      setSquad(await fetchSquadFromApi(teamName));
    } catch (err) {
      setError(err.message || 'Failed to load squad');
    } finally { setLoading(false); }
  }, [teamName]);

  useEffect(() => { fetch(); }, [fetch]);
  return { squad, loading, error, refetch: fetch };
}
