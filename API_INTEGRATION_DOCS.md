# Boardroom Battles - API & Database Integration Documentation

This document explains the technical architecture, API payload structures, database contracts, and integration methods for connecting the Boardroom Battles frontend application to its backend API (Google Apps Script / Cloudflare Workers database).

---

## 1. Architecture Overview

```
 ┌─────────────────────────────────────────────────────────┐
 │             React + Vite Frontend (Client)              │
 └────────────────────────────┬────────────────────────────┘
                              │
                    HTTP POST (JSON)
                              │
                              ▼
 ┌─────────────────────────────────────────────────────────┐
 │               Backend API Endpoint                      │
 │    (Google Apps Script / Cloudflare Worker Endpoint)    │
 └────────────────────────────┬────────────────────────────┘
                              │
                    Read / Write Operations
                              │
                              ▼
 ┌─────────────────────────────────────────────────────────┐
 │               Database / Storage Layer                  │
 │          (Google Sheets / KV Storage / SQL)             │
 └─────────────────────────────────────────────────────────┘
```

---

## 2. Environment Configuration

The frontend connects to the backend API via an environment variable defined in `.env`:

```env
VITE_APPS_SCRIPT_URL=https://crimson-recipe-6818.ee23bt035.workers.dev/
```

In the codebase (e.g. [`src/services/api.js`](file:///home/lataksh-sariya/Code/boardroom-battles/src/services/api.js#L3)), the URL is accessed via:

```javascript
const API_URL = import.meta.env.VITE_APPS_SCRIPT_URL;
```

---

## 3. API Actions & Data Contracts

All client requests are sent as `POST` requests with a `Content-Type: application/json` header. The request body contains an `action` string discriminator alongside required payload parameters.

### 3.1 `action: 'login'`
Authenticates a judge or participant user.

- **Request Payload**:
  ```json
  {
    "action": "login",
    "username": "judge1",
    "password": "user_password"
  }
  ```
- **Success Response**:
  ```json
  {
    "success": true,
    "token": "sess_token_987654321",
    "role": "judge" // or "participant"
  }
  ```
- **Error Response**:
  ```json
  {
    "success": false,
    "error": "Invalid username or password"
  }
  ```

---

### 3.2 `action: 'getStatement'`
Retrieves the currently active statement for participants.

- **Request Payload**:
  ```json
  {
    "action": "getStatement"
  }
  ```
- **Success Response**:
  ```json
  {
    "success": true,
    "statementID": "ST-6504",
    "text": "AI automation should be mandatorily audited by independent boards.",
    "judgeVote": "agree", // "agree" | "disagree"
    "durationMinutes": 30,
    "createdAt": "2026-07-25T16:50:00.000Z",
    "isActive": true
  }
  ```

---

### 3.3 `action: 'getAllStatements'`
Retrieves all statement records (for Judge Dashboard management).

- **Request Payload**:
  ```json
  {
    "action": "getAllStatements",
    "token": "sess_token_987654321"
  }
  ```
- **Success Response**:
  ```json
  {
    "success": true,
    "statements": [
      {
        "statementID": "ST-6504",
        "text": "AI automation should be mandatorily audited by independent boards.",
        "judgeVote": "agree",
        "durationMinutes": 30,
        "createdAt": "2026-07-25T16:50:00.000Z",
        "isActive": true,
        "forVotes": 14,
        "againstVotes": 6,
        "neutralVotes": 3
      }
    ]
  }
  ```

---

### 3.4 `action: 'setStatement'`
Allows a judge to publish a new statement with a custom timer.

- **Request Payload**:
  ```json
  {
    "action": "setStatement",
    "token": "sess_token_987654321",
    "text": "Remote work reduces core engineering productivity in tech startups.",
    "judgeVote": "disagree", // "agree" | "disagree"
    "durationMinutes": 45
  }
  ```
- **Success Response**:
  ```json
  {
    "success": true,
    "statementID": "ST-7819"
  }
  ```

---

### 3.5 `action: 'toggleStatementActive'`
Activates, deactivates, or reactivates a statement.

- **Request Payload**:
  ```json
  {
    "action": "toggleStatementActive",
    "token": "sess_token_987654321",
    "statementID": "ST-6504",
    "isActive": false,
    "durationMinutes": 30 // optional when reactivating
  }
  ```
- **Success Response**:
  ```json
  {
    "success": true
  }
  ```

---

### 3.6 `action: 'vote'`
Submits a participant's vote for an active statement.

- **Request Payload**:
  ```json
  {
    "action": "vote",
    "token": "sess_token_987654321",
    "statementID": "ST-6504",
    "vote": "agree" // "agree" | "disagree" | "neutral"
  }
  ```
- **Success Response**:
  ```json
  {
    "success": true
  }
  ```

---

### 3.7 `action: 'getResults'`
Retrieves aggregated vote totals for a target statement.

- **Request Payload**:
  ```json
  {
    "action": "getResults",
    "token": "sess_token_987654321",
    "statementID": "ST-6504"
  }
  ```
- **Success Response**:
  ```json
  {
    "success": true,
    "statementID": "ST-6504",
    "text": "AI automation should be mandatorily audited by independent boards.",
    "judgeVote": "agree",
    "results": {
      "for": 14,
      "against": 6,
      "neutral": 3,
      "total": 23
    }
  }
  ```

---

## 4. Backend Implementation Template

Below is a reference implementation template if you deploy your backend using Google Apps Script or Cloudflare Workers.

### Google Apps Script Reference (`Code.gs`)

```javascript
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    let result = { success: false, error: "Invalid action" };

    if (action === "login") {
      // Validate credentials against Users Sheet
      result = handleLogin(data.username, data.password);
    } else if (action === "getStatement") {
      result = getActiveStatement();
    } else if (action === "getAllStatements") {
      result = getAllStatements();
    } else if (action === "setStatement") {
      result = createStatement(data);
    } else if (action === "vote") {
      result = recordVote(data);
    } else if (action === "getResults") {
      result = getStatementResults(data.statementID);
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

---

## 5. Dual-Engine Architecture (Live Remote + Local Fallback)

The application features a hybrid API service layer in [`src/services/api.js`](file:///home/lataksh-sariya/Code/boardroom-battles/src/services/api.js):

1. **Remote Priority**: When `VITE_APPS_SCRIPT_URL` is set and reachable, all requests pass directly to your backend endpoint database.
2. **Local Fallback**: If the remote backend is offline or unreachable, the application seamlessly switches to an internal mock engine backed by `localStorage` and `BroadcastChannel` for cross-tab real-time updates.
