// Live API Database Service Layer

const API_URL = import.meta.env.VITE_APPS_SCRIPT_URL || 'https://crimson-recipe-6818.ee23bt035.workers.dev/';

const liveChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('boardroom_battles_live_sync') : null;

export function notifyLiveChange(eventType, payloadData = {}) {
  if (liveChannel) {
    try {
      liveChannel.postMessage({ type: eventType, data: payloadData, timestamp: Date.now() });
    } catch (e) {
      console.error('Failed to post live message:', e);
    }
  }
}

export function subscribeLiveChanges(callback) {
  const handler = (event) => {
    if (event && event.data) {
      callback(event.data);
    }
  };

  if (liveChannel) {
    liveChannel.addEventListener('message', handler);
  }

  return () => {
    if (liveChannel) {
      liveChannel.removeEventListener('message', handler);
    }
  };
}

/**
 * Execute HTTP POST call directly to the actual backend database API URL.
 */
export async function apiCall(payload) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Server returned HTTP ${response.status} status`);
  }

  const data = await response.json();

  // If a mutating action succeeded on the actual database, notify cross-tab subscribers
  if (data && data.success) {
    if (['setStatement', 'toggleStatementActive', 'reactivateStatement'].includes(payload.action)) {
      notifyLiveChange('STATEMENT_UPDATED', payload);
    } else if (['vote', 'useNeutral'].includes(payload.action)) {
      notifyLiveChange('VOTE_SUBMITTED', payload);
    }
  }

  return data;
}
