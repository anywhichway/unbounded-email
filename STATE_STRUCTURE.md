# Spaces Plugin State Structure

## Centralized State Tree

All application state is managed through `window.appState`, a Lightview reactive state object defined in `index.html`.

```javascript
window.appState = {
    // User and UI state
    user: Object,                    // User accounts from Lightview import
    currentAccount: string | null,   // Currently selected account email
    currentFolder: string | null,    // Currently selected folder name
    selectedFolderId: string,        // UI selection state (e.g., 'folder-Chat')
    
    // Active workspace state
    workspace: {
        // Connection details
        roomId: string,                    // Unique workspace identifier
        password: string,                  // Workspace access password
        nickname: string,                  // Local user's display name
        isHost: boolean,                   // Whether local user created the workspace
        status: 'disconnected' | 'connecting' | 'connected',
        
        // Peer management
        peers: {
            [peerId: string]: nickname     // Map of peer IDs to their nicknames
        },
        
        // Chat feature state
        chatHistory: Array<{
            id: string,
            text: string,
            sender: string,
            timestamp: number,
            channelId: string,
            isPrivate?: boolean,
            recipientId?: string,
            parentId?: string,              // For threaded replies
            depth?: number                  // Reply depth in thread
        }>,
        channels: Array<{
            id: string,
            name: string,
            isDefault?: boolean
        }>,
        currentActiveChannelId: string | null,
        
        // Kanban feature state
        kanbanData: {
            columns: Array<{
                id: string,
                title: string,
                cards: Array<{
                    id: string,
                    text: string
                }>
            }>
        },
        
        // Whiteboard feature state
        whiteboardHistory: Array<{
            type: 'path' | 'clear',
            points?: Array<{x: number, y: number}>,
            color?: string,
            lineWidth?: number
        }>,
        
        // Documents feature state
        documents: {
            [docId: string]: {
                id: string,
                name: string,
                content: string,
                lastModified: number
            }
        },
        currentActiveDocumentId: string | undefined
    },
    
    // UI helper methods
    getAccountIconClass: Function,
    getCount: Function,
    selectFolder: Function               // Navigation method
}
```

---

## State Access Patterns

### Reading State

**From any module with access to appState:**
```javascript
// Get current workspace room ID
const roomId = appState.workspace.roomId;

// Get current user's nickname
const nickname = appState.workspace.nickname;

// Get all peers
const peers = appState.workspace.peers;

// Check if user is host
const isHost = appState.workspace.isHost;
```

**From inline handlers or external scripts:**
```javascript
// Access via window global
const roomId = window.appState.workspace.roomId;
const peers = window.appState.workspace.peers;
```

### Updating State

**Reactive updates (triggers re-render):**
```javascript
// Update nickname
appState.workspace.nickname = 'NewNickname';

// Add a peer
appState.workspace.peers = { 
    ...appState.workspace.peers, 
    [newPeerId]: 'NewPeerName' 
};

// Remove a peer
const newPeers = { ...appState.workspace.peers };
delete newPeers[leftPeerId];
appState.workspace.peers = newPeers;

// Update connection status
appState.workspace.status = 'connected';
```

**Batch updates:**
```javascript
// Reset entire workspace
appState.workspace = null;

// Initialize new workspace
appState.workspace = {
    roomId: 'room-123',
    nickname: 'User',
    password: 'pass',
    isHost: true,
    status: 'disconnected',
    peers: {},
    chatHistory: [],
    channels: [],
    currentActiveChannelId: null,
    kanbanData: { columns: [] },
    whiteboardHistory: [],
    documents: {},
};
```

---

## Module State Dependencies

### `share.js`
**Receives:** `dependencies.workspace` (reference to `appState.workspace`)  
**Stores in:** `appStateDep`  
**Accesses:**
- `appStateDep.isHost` - Check if user is host
- `appStateDep.nickname` - Get local user's nickname
- `appStateDep.roomId` - Get current room ID
- `appStateDep.peers` - via `getPeerNicknamesDep()`
- `appStateDep.chatHistory` - Direct manipulation
- `appStateDep.channels` - Direct manipulation
- `appStateDep.currentActiveChannelId` - Direct manipulation
- `appStateDep.kanbanData` - Updates from kanban module
- `appStateDep.whiteboardHistory` - Updates from whiteboard module
- `appStateDep.documents` - Updates from document module

### `main.js`
**Creates:** `appState` is passed in from `index.html`  
**Accesses:**
- `window.appState.workspace` - All workspace properties
- `window.appState.workspace.peers` - Peer management
- `window.appState.workspace.roomId` - For export/save operations
- `window.appState.workspace.nickname` - For settings

### `media.js`
**Receives:** `dependencies.getPeerNicknames()` - Returns `appState.workspace.peers`  
**Receives:** `dependencies.getLocalNickname()` - Returns `appState.workspace.nickname`

### `kanban.js`, `whiteboard.js`, `document.js`
**Receives:** `dependencies.getPeerNicknames()` - Returns `appState.workspace.peers`  
**Updates:** Their respective feature state via callbacks to `share.js`

---

## State Persistence

### LocalStorage Keys

**`viewPartyNickname`**
- Stores: User's nickname
- Used for: Pre-filling nickname on reload

**`space_${roomId}`**
- Stores: Complete workspace state for a room
- Structure: `{ ...shareableData, roomId, version }`
- Used for: Restoring workspace on rejoin

**`spacesList`**
- Stores: Map of saved spaces
- Structure: `{ [roomId]: { nickname, password, isHost } }`
- Used for: Sidebar list of saved workspaces

**`spacesAppSettings`**
- Stores: App-level settings (theme, video, PTT, volume)
- Structure: `{ theme, videoFlip, pttEnabled, pttKey, pttKeyDisplay, globalVolume }`

---

## State Initialization Flow

### 1. App Load (`index.html`)
```javascript
const appState = state({
    user: user,
    workspace: null,  // Initially null
    ...
});
window.appState = appState;
```

### 2. Create/Join Workspace (`main.js` or `index.html`)
```javascript
window.appState.workspace = {
    roomId: generatedId,
    nickname: savedNickname,
    password: userPassword,
    isHost: true,
    status: 'disconnected',
    peers: {},
    chatHistory: [],
    channels: [],
    currentActiveChannelId: null,
    kanbanData: { columns: [] },
    whiteboardHistory: [],
    documents: {},
};
```

### 3. Join Room (`main.js` - `joinRoomAndSetup()`)
```javascript
// Update status
appState.workspace.status = 'connecting';

// Setup Trystero and modules
const shareModuleDeps = {
    workspace: appState.workspace,  // Pass reference
    ...
};
initShareFeatures(shareModuleDeps);

// Load saved data if available
const savedSpace = localStorage.getItem('space_' + roomId);
if (savedSpace) {
    const imported = JSON.parse(savedSpace);
    // Share module loads data into appState.workspace
}

appState.workspace.status = 'connected';
```

### 4. Peer Join/Leave
```javascript
// On peer join
appState.workspace.peers = {
    ...appState.workspace.peers,
    [peerId]: nickname
};

// On peer leave
const newPeers = { ...appState.workspace.peers };
delete newPeers[peerId];
appState.workspace.peers = newPeers;
```

### 5. Leave Workspace
```javascript
appState.workspace = null;
```

---

## Anti-Patterns to Avoid

### ❌ Don't create shadow state
```javascript
// BAD - Creates duplicate state
let localPeers = {};
localPeers[peerId] = nickname;
```

### ✅ Use centralized state
```javascript
// GOOD - Updates centralized state
appState.workspace.peers = {
    ...appState.workspace.peers,
    [peerId]: nickname
};
```

### ❌ Don't bypass reactivity
```javascript
// BAD - Direct mutation doesn't trigger updates
appState.workspace.peers[peerId] = nickname;
```

### ✅ Create new object for reactivity
```javascript
// GOOD - Creates new object, triggers updates
appState.workspace.peers = {
    ...appState.workspace.peers,
    [peerId]: nickname
};
```

### ❌ Don't store state in window globals
```javascript
// BAD - Global state pollution
window.currentRoomId = 'room-123';
window.isHost = true;
```

### ✅ Use appState
```javascript
// GOOD - Centralized state
appState.workspace.roomId = 'room-123';
appState.workspace.isHost = true;
```

---

## Future Improvements

### Component-Based State Binding
```javascript
// Future: Reactive user list component
const UserList = ({ peers, localNickname }) => ({
    tagName: 'ul',
    children: Object.entries(peers).map(([id, nickname]) => ({
        tagName: 'li',
        textContent: nickname + (nickname === localNickname ? ' (You)' : '')
    }))
});

// Automatically re-renders when appState.workspace.peers changes
```

### Computed Properties
```javascript
// Future: Add computed properties to state
appState.workspace.peerCount = computed(() => 
    Object.keys(appState.workspace.peers).length
);

appState.workspace.isConnected = computed(() => 
    appState.workspace.status === 'connected'
);
```

---

## Summary

The Spaces plugin now uses a **single, centralized, reactive state tree** rooted at `window.appState`. All workspace-related state lives under `appState.workspace`, eliminating duplicate state management and improving code maintainability.

Key benefits:
- ✅ Single source of truth
- ✅ Predictable state updates
- ✅ Easier debugging (inspect `window.appState` in console)
- ✅ Foundation for reactive UI components
