// main.js

import { joinRoom, selfId as localGeneratedPeerId } from './trystero-torrent.min.js';
import {
    initShareFeatures,
    getShareableData,
    loadShareableData,
    resetShareModuleStates,
    setShareModulePeerInfo,
    handleShareModulePeerLeave
} from './share.js';
import { initMediaFeatures, handleMediaPeerStream, stopAllLocalMedia, setupMediaForNewPeer, cleanupMediaForPeer } from './media.js';
import { escapeHtml } from './utils.js';

const APP_ID = 'Spaces-0.1.5-jun21';

function saveSpaceToLocalStorage(appState) {
    if (!appState.workspace) return;
    const roomId = appState.workspace.roomId;
    console.log('Saving space to localStorage for room:', roomId);
    try {
        const shareData = getShareableData();
        const workspaceState = { ...shareData, roomId: roomId, version: APP_ID };
        localStorage.setItem('space_' + roomId, JSON.stringify(workspaceState));
        console.log('Space saved successfully.');
    } catch (e) {
        console.error('Error saving space to localStorage:', e);
    }
}

// Expose functions and variables on window for index.js
// REMOVED: Global state variables
// window.isHost = false;
// window.currentRoomId = '';
// window.localNickname = '';
window.saveSpaceToLocalStorage = saveSpaceToLocalStorage;
window.logStatus = logStatus;
window.cycleTheme = cycleTheme;
window.handlePttKeyCapture = handlePttKeyCapture;
window.isCapturingPttKey = false;

window.onClickSettingsSave = async () => {
    // This function will need to be updated to use appState if it's to remain active.
    // For now, assuming it might be deprecated in favor of direct state binding.
    console.warn("onClickSettingsSave needs refactoring for Lightview state.");
};

window.onClickSidebarButton = (button) => {
    const targetSectionId = button.getAttribute('data-section');
    const targetSectionElement = document.getElementById(targetSectionId);
    if (currentActiveSection === targetSectionId && targetSectionElement && !targetSectionElement.classList.contains('hidden')) return;
    sidebarButtons.forEach(btn => { if (btn.id !== 'exportWorkspaceBtnSidebar') btn.classList.remove('active'); });
    button.classList.add('active');
    currentActiveSection = targetSectionId;
    contentSections.forEach(section => section.classList.toggle('hidden', section.id !== targetSectionId));
    clearNotification(targetSectionId);
    const shareModule = window.shareModuleRef;
    if (shareModule) {
        if (targetSectionId === 'whiteboardSection' && shareModule.resizeWhiteboardAndRedraw) shareModule.resizeWhiteboardAndRedraw();
        if (targetSectionId === 'kanbanSection' && shareModule.renderKanbanBoardIfActive) shareModule.renderKanbanBoardIfActive();
        if (targetSectionId === 'documentsSection' && shareModule.renderDocumentsIfActive) shareModule.renderDocumentsIfActive();
    }
    if (targetSectionId === 'videoChatSection' && window.mediaModuleRef && window.mediaModuleRef.setLocalVideoFlip) window.mediaModuleRef.setLocalVideoFlip(spacesSettings.videoFlip, true);
    if (targetSectionId === 'settingsSection') {
        populateSettingsSection();
        if (isCapturingPttKey) {
            isCapturingPttKey = false;
            if (pttKeyInstructions) pttKeyInstructions.classList.add('hidden');
            if (settingsPttKeyBtn) settingsPttKeyBtn.classList.remove('hidden');
            document.removeEventListener('keydown', handlePttKeyCapture, true);
        }
    }
};

window.onClickExportWorkspace = async () => {
    if (!roomApi) { logStatus("You must be in a workspace to export.", true); return; }
    const password = prompt("Enter a password to encrypt the workspace data (this is for the file, not the workspace access password):");
    if (!password) { logStatus("Export cancelled: No password provided.", true); return; }
    try {
        logStatus("Exporting workspace...");
        const shareData = getShareableData();
        const workspaceState = { ...shareData, roomId: currentRoomId, version: APP_ID };
        const serializedState = JSON.stringify(workspaceState);
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const derivedKey = await deriveKeyFromPassword_ImportExport(password, salt);
        const encryptedData = await crypto.subtle.encrypt({ name: CRYPTO_ALGO, iv: iv }, derivedKey, textEncoder.encode(serializedState));
        const combinedBuffer = new Uint8Array(salt.byteLength + iv.byteLength + encryptedData.byteLength);
        combinedBuffer.set(salt, 0); combinedBuffer.set(iv, salt.byteLength); combinedBuffer.set(new Uint8Array(encryptedData), salt.byteLength + iv.byteLength);
        const blob = new Blob([combinedBuffer], { type: "application/octet-stream" });
        const fileName = `Spaces_Workspace_${currentRoomId || 'backup'}_${new Date().toISOString().slice(0, 10)}.spaces_encrypted`;
        const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = fileName;
        document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(link.href);
        logStatus(`Workspace exported successfully as ${fileName}.`);
    } catch (error) {
        console.error("Error exporting workspace:", error);
        logStatus("Error exporting workspace: " + error.message, true);
    }
};

window.onChangeImportFilePicker = async (event) => {
    const file = event.target.files[0]; if (!file) return;
    const password = prompt(`Enter password for workspace file "${file.name}" (this decrypts the file content):`);
    if (!password) { logStatus("Import cancelled: No password provided.", true); importFilePicker.value = ''; return; }
    logStatus(`Importing workspace from ${file.name}...`);
    try {
        const fileBuffer = await file.arrayBuffer();
        const salt = new Uint8Array(fileBuffer, 0, 16); const iv = new Uint8Array(fileBuffer, 16, 12); const encryptedPayload = fileBuffer.slice(16 + 12);
        const derivedKey = await deriveKeyFromPassword_ImportExport(password, salt);
        const decryptedBuffer = await crypto.subtle.decrypt({ name: CRYPTO_ALGO, iv: iv }, derivedKey, encryptedPayload);
        const decryptedStateString = textDecoder.decode(decryptedBuffer);
        importedWorkspaceState = JSON.parse(decryptedStateString);
        if (!importedWorkspaceState || typeof importedWorkspaceState.kanbanData === 'undefined' || typeof importedWorkspaceState.whiteboardHistory === 'undefined' || typeof importedWorkspaceState.documents === 'undefined') {
            throw new Error("Invalid or incomplete workspace file structure.");
        }
        if (importedWorkspaceState.roomId && roomIdInput && !roomIdInput.value) roomIdInput.value = importedWorkspaceState.roomId;
        logStatus(`Workspace "${file.name}" decrypted. Enter workspace password and create/join to apply. (Imported data for room: ${importedWorkspaceState.roomId || 'N/A'})`);
    } catch (error) {
        console.error("Error importing workspace:", error);
        logStatus("Error importing: " + (error.message.includes("decrypt") ? "Incorrect password or corrupted file." : error.message), true);
        importedWorkspaceState = null;
    } finally { importFilePicker.value = ''; }
};

const wordList = [
    "able", "acid", "army", "away", "baby", "back", "ball", "band", "bank", "base",
    "bath", "bean", "bear", "beat", "bell", "bird", "blow", "blue", "boat", "body",
    "bone", "book", "boss", "busy", "cake", "call", "calm", "camp", "card", "care",
    "case", "cash", "chat", "city", "club", "coal", "coat", "code", "cold", "cook",
    "cool", "cope", "copy", "core", "cost", "crew", "crop", "dark", "data", "date",
    "deal", "deep", "deer", "desk", "disc", "disk", "door", "dose", "down", "draw",
    "dream", "drug", "drum", "duck", "duke", "dust", "duty", "earn", "east", "easy",
    "edge", "face", "fact", "fail", "fair", "fall", "farm", "fast", "fate", "fear",
    "feed", "feel", "file", "fill", "film", "find", "fine", "fire", "firm", "fish",
    "five", "flag", "flat", "flow", "food", "foot", "ford", "form", "fort", "four"
];

const setupSection = document.getElementById('setupSection');
const inRoomInterface = document.getElementById('inRoomInterface');
const nicknameInput = document.getElementById('nicknameInput');
const roomIdInput = document.getElementById('roomIdInput');
const roomPasswordInput = document.getElementById('roomPasswordInput');
const createPartyBtn = document.getElementById('createPartyBtn');
const joinWorkspaceBtn = document.getElementById('joinWorkspaceBtn');
const createWorkspaceFields = document.getElementById('createWorkspaceFields');
const joinWorkspaceFields = document.getElementById('joinWorkspaceFields');
const confirmCreateBtn = document.getElementById('confirmCreateBtn');
const cancelCreateBtn = document.getElementById('cancelCreateBtn');
const confirmJoinBtn = document.getElementById('confirmJoinBtn');
const cancelJoinBtn = document.getElementById('cancelJoinBtn');
const joinPasswordInput = document.getElementById('joinPasswordInput');
const importWorkspaceBtn = document.getElementById('importWorkspaceBtn');
const importFilePicker = document.getElementById('importFilePicker');
const exportWorkspaceBtnSidebar = document.getElementById('exportWorkspaceBtnSidebar');
const currentRoomCodeSpan = document.getElementById('currentRoomCodeSpan');
const copyRoomCodeBtn = document.getElementById('copyRoomCodeBtn');
const currentNicknameSpan = document.getElementById('currentNicknameSpan');

// DOM selection for the new cycling theme button
const cycleThemeBtn = document.getElementById('cycleThemeBtn');
const currentThemeNameSpan = document.getElementById('currentThemeNameSpan');

const sidebarButtons = document.querySelectorAll('.sidebar-button');
const contentSections = document.querySelectorAll('.content-section');
const userCountSpan = document.getElementById('userCountSpan');
const userListUl = document.getElementById('userList');
const settingsSidebarBtn = document.getElementById('settingsSidebarBtn');
const settingsSection = document.getElementById('settingsSection');
const settingsNicknameInput = document.getElementById('settingsNicknameInput');
const settingsVideoFlipCheckbox = document.getElementById('settingsVideoFlipCheckbox');
const settingsPttEnabledCheckbox = document.getElementById('settingsPttEnabledCheckbox');
const pttHotkeySettingsContainer = document.getElementById('pttHotkeySettingsContainer');
const settingsPttKeyBtn = document.getElementById('settingsPttKeyBtn');
const pttKeyInstructions = document.getElementById('pttKeyInstructions');
const settingsSaveBtn = document.getElementById('settingsSaveBtn');

const settingsGlobalVolumeSlider = document.getElementById('settingsGlobalVolumeSlider');
const globalVolumeValue = document.getElementById('globalVolumeValue');

let roomApi;
let currentActiveSection = 'chatSection';
let peerNicknames = {};
let importedWorkspaceState = null;

let availableThemes = [];
let themeDisplayNames = {};
let currentThemeIndex = 0;

let spacesSettings = {
    theme: '',
    videoFlip: false,
    pttEnabled: false,
    pttKey: 'Space',
    pttKeyDisplay: 'Space',
    globalVolume: 1,
};

// Trystero action variables
let sendChatMessage, onChatMessage, sendNickname, onNickname, sendPrivateMessage, onPrivateMessage;
let sendFileMeta, onFileMeta, sendFileChunk, onFileChunk;
let sendDrawCommand, onDrawCommand, sendInitialWhiteboard, onInitialWhiteboard;
let sendKanbanUpdate, onKanbanUpdate, sendInitialKanban, onInitialKanban;
let sendChatHistory, onChatHistory;
let sendInitialDocuments, onInitialDocuments;
let sendCreateDocument, onCreateDocument;
let sendRenameDocument, onRenameDocument;
let sendDeleteDocument, onDeleteDocument;
let sendDocumentContentUpdate, onDocumentContentUpdate;
let sendCreateChannel, onCreateChannel;
let sendInitialChannels, onInitialChannels;

const CRYPTO_ALGO = 'AES-GCM';
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

async function fetchThemesConfig() {
    try {
        const response = await fetch('themes/themes.json');
        if (!response.ok) {
            console.warn(`themes.json not found (status: ${response.status}). Defaulting to 'light' theme.`);
            availableThemes = ['light'];
            themeDisplayNames['light'] = 'Light';
            return;
        }
        const themeConfigs = await response.json();
        
        if (!Array.isArray(themeConfigs) || themeConfigs.length === 0) {
            console.error("themes.json is empty or not a valid array. Defaulting to 'light' theme.");
            availableThemes = ['light'];
            themeDisplayNames['light'] = 'Light';
            return;
        }
        
        availableThemes = themeConfigs.map(t => t.id).filter(id => typeof id === 'string');
        themeConfigs.forEach(t => {
            if (typeof t.id === 'string' && typeof t.name === 'string') {
                themeDisplayNames[t.id] = t.name;
            }
        });

        if (availableThemes.length === 0) {
            console.error("No valid themes found in themes.json. Defaulting to 'light' theme.");
            availableThemes = ['light'];
            themeDisplayNames['light'] = 'Light';
        }
    } catch (error) {
        console.error("Could not load or parse themes configuration (themes/themes.json):", error);
        availableThemes = ['light'];
        themeDisplayNames['light'] = 'Light';
    }
}

async function loadSettings() {
    await fetchThemesConfig(); 

    if (!spacesSettings.theme && availableThemes.length > 0) {
        spacesSettings.theme = availableThemes[0];
    } else if (availableThemes.length === 0) {
        spacesSettings.theme = 'light'; // Absolute fallback
    }

    const savedSettings = localStorage.getItem('spacesAppSettings');
    if (savedSettings) {
        try {
            const parsedSettings = JSON.parse(savedSettings);
            if (availableThemes.includes(parsedSettings.theme)) {
                spacesSettings.theme = parsedSettings.theme;
            } else {
                console.warn(`Saved theme "${parsedSettings.theme}" is not in available themes. Using default: "${spacesSettings.theme}".`);
            }
            spacesSettings.videoFlip = typeof parsedSettings.videoFlip === 'boolean' ? parsedSettings.videoFlip : false;
            spacesSettings.pttEnabled = typeof parsedSettings.pttEnabled === 'boolean' ? parsedSettings.pttEnabled : false;
            spacesSettings.pttKey = typeof parsedSettings.pttKey === 'string' ? parsedSettings.pttKey : 'Space';
            spacesSettings.pttKeyDisplay = typeof parsedSettings.pttKeyDisplay === 'string' ? parsedSettings.pttKeyDisplay : 'Space';
            spacesSettings.globalVolume = typeof parsedSettings.globalVolume === 'number' && !isNaN(parsedSettings.globalVolume) ? parsedSettings.globalVolume : 1;
        } catch (e) {
            console.error("Error parsing saved settings.", e);
        }
    }
    
    currentThemeIndex = availableThemes.indexOf(spacesSettings.theme);
    if (currentThemeIndex === -1) {
        currentThemeIndex = 0;
        if (availableThemes.length > 0) spacesSettings.theme = availableThemes[0];
      }

    populateSettingsSection();
    if (spacesSettings.theme) {
      applyTheme(spacesSettings.theme);
    }

    if (window.mediaModuleRef && window.mediaModuleRef.setLocalVideoFlip) {
        window.mediaModuleRef.setLocalVideoFlip(spacesSettings.videoFlip);
    }
    if (window.mediaModuleRef && window.mediaModuleRef.updatePttSettings) {
        window.mediaModuleRef.updatePttSettings(spacesSettings.pttEnabled, spacesSettings.pttKey, spacesSettings.pttKeyDisplay);
    }
    if (window.mediaModuleRef && window.mediaModuleRef.setGlobalVolume) {
        window.mediaModuleRef.setGlobalVolume(spacesSettings.globalVolume, false);
    }
}

function saveSettings() {
    localStorage.setItem('spacesAppSettings', JSON.stringify(spacesSettings));
}

function populateSettingsSection() {
    if (!settingsNicknameInput || !settingsVideoFlipCheckbox || !settingsPttEnabledCheckbox || !settingsPttKeyBtn || !pttHotkeySettingsContainer ||
        !settingsGlobalVolumeSlider || !globalVolumeValue) return;
    settingsNicknameInput.value = window.localNickname;
    settingsVideoFlipCheckbox.checked = spacesSettings.videoFlip;
    settingsPttEnabledCheckbox.checked = spacesSettings.pttEnabled;
    settingsPttKeyBtn.textContent = spacesSettings.pttKeyDisplay;
    pttHotkeySettingsContainer.classList.toggle('hidden', !settingsPttEnabledCheckbox.checked);

    settingsGlobalVolumeSlider.value = spacesSettings.globalVolume;
    globalVolumeValue.textContent = `${Math.round(spacesSettings.globalVolume * 100)}%`;
}

function handlePttKeyCapture(event) {
    if (!isCapturingPttKey) return;
    event.preventDefault(); event.stopPropagation();
    if (event.key === 'Escape') {/* NOOP */} else {
        spacesSettings.pttKey = event.code;
        spacesSettings.pttKeyDisplay = (event.code === 'Space') ? 'Space' : (event.key.length === 1 ? event.key.toUpperCase() : event.key);
        if (settingsPttKeyBtn) settingsPttKeyBtn.textContent = spacesSettings.pttKeyDisplay;
    }
    isCapturingPttKey = false;
    if (pttKeyInstructions) pttKeyInstructions.classList.add('hidden');
    if (settingsPttKeyBtn) settingsPttKeyBtn.classList.remove('hidden');
    document.removeEventListener('keydown', handlePttKeyCapture, true);
}

function applyTheme(themeName) {
    if (availableThemes.length === 0) {
        console.error("No themes available. Cannot apply theme.");
        document.documentElement.setAttribute('data-theme', 'light');
        if (currentThemeNameSpan) currentThemeNameSpan.textContent = "Light";
        return;
    }
    if (!availableThemes.includes(themeName)) {
        console.warn(`Theme "${themeName}" not available. Defaulting to "${availableThemes[0]}".`);
        themeName = availableThemes[0];
    }

    const themeStylesheetLink = document.getElementById('active-theme-stylesheet');
    if (themeStylesheetLink) {
        const currentHref = themeStylesheetLink.getAttribute('href');
        const newHref = `themes/${themeName}.css`;
        if (currentHref !== newHref) {
            themeStylesheetLink.setAttribute('href', newHref);
        }
    } else {
        console.error("Critical: Theme stylesheet link element not found.");
        const newLink = document.createElement('link');
        newLink.id = 'active-theme-stylesheet'; newLink.rel = 'stylesheet';
        newLink.href = `themes/${themeName}.css`; document.head.appendChild(newLink);
    }

    document.documentElement.setAttribute('data-theme', themeName);
    spacesSettings.theme = themeName;
    currentThemeIndex = availableThemes.indexOf(themeName);
    if (currentThemeIndex === -1 && availableThemes.length > 0) currentThemeIndex = 0;

    saveSettings();

    if (currentThemeNameSpan) {
        currentThemeNameSpan.textContent = themeDisplayNames[themeName] || themeName.charAt(0).toUpperCase() + themeName.slice(1);
    }

    const shareModule = window.shareModuleRef;
    if (shareModule && shareModule.redrawWhiteboardFromHistoryIfVisible) {
        shareModule.redrawWhiteboardFromHistoryIfVisible();
    }
}

function cycleTheme() {
    if (availableThemes.length === 0) return;
    currentThemeIndex = (currentThemeIndex + 1) % availableThemes.length;
    const nextThemeName = availableThemes[currentThemeIndex];
    applyTheme(nextThemeName);
}

function showNotification(sectionId) {
    const targetSectionElement = document.getElementById(sectionId);
    if (targetSectionElement && (currentActiveSection !== sectionId || targetSectionElement.classList.contains('hidden'))) {
        const dot = document.querySelector(`.notification-dot[data-notification-for="${sectionId}"]`);
        if (dot) dot.classList.remove('hidden');
    }
}
function clearNotification(sectionId) {
    const dot = document.querySelector(`.notification-dot[data-notification-for="${sectionId}"]`);
    if (dot) dot.classList.add('hidden');
}
function logStatus(message, isError = false) {
    console.log(message);
    if (isError) console.error("Spaces Error:", message);
    if (window.shareModuleRef && window.shareModuleRef.displaySystemMessage) {
        window.shareModuleRef.displaySystemMessage(isError ? `Error: ${message}` : message);
    }
}
function generateMemorableRoomCode() {
    const selectedWords = [];
    for (let i = 0; i < 4; i++) selectedWords.push(wordList[Math.floor(Math.random() * wordList.length)]);
    return selectedWords.join('-');
}
function updateUserList() {
    // This function will be replaced by a reactive component in index.html
    // bound to appState.workspace.peers and appState.workspace.nickname
    if (!userListUl) return;
    console.log("updateUserList should be replaced by a reactive Lightview component.");
}
function findPeerIdByNickname(nickname) {
    for (const id in peerNicknames) if (peerNicknames[id].toLowerCase() === nickname.toLowerCase()) return id;
    return null;
}
async function deriveKeyFromPassword_ImportExport(password, salt) {
    const keyMaterial = await crypto.subtle.importKey("raw", textEncoder.encode(password), { name: "PBKDB2" }, false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", salt: salt, iterations: 750000, hash: "SHA-256" }, keyMaterial, { name: CRYPTO_ALGO, length: 256 }, true, ["encrypt", "decrypt"]);
}

export async function joinRoomAndSetup(appState) {
    if (!appState || !appState.workspace) {
        logStatus("joinRoomAndSetup called without a workspace state.", true);
        return;
    }

    let { nickname: localNickname, roomId: roomIdToJoin, isHost } = appState.workspace;

    // The logic for determining host/email room is now handled in index.html before calling this.
    
    if (!localNickname) { 
        logStatus("Please enter a nickname.", true); 
        appState.workspace.status = 'disconnected';
        return; 
    }
    localStorage.setItem('viewPartyNickname', localNickname);
    populateSettingsSection(appState); // Pass state
    
    const roomPasswordProvided = isHost ? roomPasswordInput.value : joinPasswordInput.value;
    const requiresPassword = !isHost;
    
    if (requiresPassword && !roomPasswordProvided) {
        logStatus("Workspace password is required.", true);
        if(createPartyBtn) createPartyBtn.disabled = false; if(joinWorkspaceBtn) joinWorkspaceBtn.disabled = false;
        appState.workspace.status = 'disconnected';
        return;
    }
    
    const effectivePassword = roomPasswordProvided || (isHost ? 'host-personal-default' : '');
    
    if (isHost) {
        if (!roomIdToJoin) {
            roomIdToJoin = (importedWorkspaceState && importedWorkspaceState.roomId) ? importedWorkspaceState.roomId : generateMemorableRoomCode();
            appState.workspace.roomId = roomIdToJoin; // Update state
        }
        if(roomIdInput) roomIdInput.value = roomIdToJoin;
    } else if (!roomIdToJoin) {
        logStatus("Room Code is required to join a workspace.", true);
        if(createPartyBtn) createPartyBtn.disabled = false; if(joinWorkspaceBtn) joinWorkspaceBtn.disabled = false;
        appState.workspace.status = 'disconnected';
        return;
    }

    const sanitizedRoomId = roomIdToJoin.toLowerCase().replace(/[\s,]+/g, '-');
    if (roomIdToJoin !== sanitizedRoomId) {
        logStatus(`Using sanitized Room Code: ${sanitizedRoomId}`);
        if(roomIdInput) roomIdInput.value = sanitizedRoomId;
        appState.workspace.roomId = sanitizedRoomId; // Update state
    }
    
    logStatus(`Connecting to workspace: ${sanitizedRoomId}...`);
    appState.workspace.status = 'connecting';

    [createPartyBtn, joinWorkspaceBtn, importWorkspaceBtn, nicknameInput, roomIdInput, roomPasswordInput, joinPasswordInput, confirmCreateBtn, confirmJoinBtn].forEach(el => el && (el.disabled = true));
    
    try {
        const config = { appId: APP_ID, password: effectivePassword };
        roomApi = await joinRoom(config, sanitizedRoomId);
        appState.workspace.status = 'connected';
        logStatus("Setting up workspace features...");

        // Load saved space data and merge into state
        const savedSpace = localStorage.getItem('space_' + sanitizedRoomId);
        if (savedSpace) {
            importedWorkspaceState = JSON.parse(savedSpace);
            console.log("Loaded saved workspace data from localStorage for room:", sanitizedRoomId);
        }

        [sendChatMessage, onChatMessage] = roomApi.makeAction('chatMsg');
        [sendNickname, onNickname] = roomApi.makeAction('nick');
        [sendPrivateMessage, onPrivateMessage] = roomApi.makeAction('privMsg');
        [sendFileMeta, onFileMeta] = roomApi.makeAction('fileMeta');
        [sendFileChunk, onFileChunk] = roomApi.makeAction('fileChunk', true);
        [sendDrawCommand, onDrawCommand] = roomApi.makeAction('drawCmd');
        [sendInitialWhiteboard, onInitialWhiteboard] = roomApi.makeAction('initWb');
        [sendKanbanUpdate, onKanbanUpdate] = roomApi.makeAction('kanbanUpd');
        [sendInitialKanban, onInitialKanban] = roomApi.makeAction('initKb');
        [sendChatHistory, onChatHistory] = roomApi.makeAction('chatHist');
        [sendInitialDocuments, onInitialDocuments] = roomApi.makeAction('initDocs');
        [sendCreateDocument, onCreateDocument] = roomApi.makeAction('newDoc');
        [sendRenameDocument, onRenameDocument] = roomApi.makeAction('renDoc');
        [sendDeleteDocument, onDeleteDocument] = roomApi.makeAction('delDoc');
        [sendDocumentContentUpdate, onDocumentContentUpdate] = roomApi.makeAction('docUpd');
        [sendCreateChannel, onCreateChannel] = roomApi.makeAction('createChan');
        [sendInitialChannels, onInitialChannels] = roomApi.makeAction('initChans');
        
        const shareModuleDeps = {
            workspace: appState.workspace, // Pass the workspace object directly
            sendChatMessage, sendPrivateMessage, sendFileMeta, sendFileChunk,
            sendChatHistory, sendCreateChannel, sendInitialChannels,
            sendDrawCommand, sendInitialWhiteboard,
            sendKanbanUpdate, sendInitialKanban,
            sendInitialDocuments, sendCreateDocument, sendRenameDocument,
            sendDeleteDocument, sendDocumentContentUpdate,
            logStatus, showNotification, localGeneratedPeerId,
            getPeerNicknames: () => appState.workspace.peers, // Read from state
            findPeerIdByNicknameFnc: findPeerIdByNickname, 
            getImportedWorkspaceState: () => importedWorkspaceState,
            clearImportedWorkspaceState: () => { importedWorkspaceState = null; },
            saveSpaceToLocalStorage: () => saveSpaceToLocalStorage(appState),
        };
        window.shareModuleRef = initShareFeatures(shareModuleDeps);
        
        const mediaModuleDeps = {
            roomApi, logStatus, showNotification, localGeneratedPeerId,
            getPeerNicknames: () => appState.workspace.peers, // Read from state
            getLocalNickname: () => appState.workspace.nickname, // Read from state
            initialVideoFlip: spacesSettings.videoFlip, initialPttEnabled: spacesSettings.pttEnabled,
            initialPttKey: spacesSettings.pttKey, initialPttKeyDisplay: spacesSettings.pttKeyDisplay,
            initialGlobalVolume: spacesSettings.globalVolume, 
            updateUserList: updateUserList, // This should be replaced by reactive UI
        };
        window.mediaModuleRef = initMediaFeatures(mediaModuleDeps);

        onChatMessage((data, peerId) => {
            window.shareModuleRef.handleChatMessage(data, peerId);
        });
        onPrivateMessage((data, peerId) => {
            window.shareModuleRef.handlePrivateMessage(data, peerId);
        });
        onFileMeta((data, peerId) => {
            window.shareModuleRef.handleFileMeta(data, peerId);
        });
        onFileChunk((data, peerId, chunkMeta) => window.shareModuleRef.handleFileChunk(data, peerId, chunkMeta));
        onDrawCommand((data, peerId) => {
            window.shareModuleRef.handleDrawCommand(data, peerId);
        });
        onInitialWhiteboard((data, peerId) => window.shareModuleRef.handleInitialWhiteboard(data, peerId));
        onKanbanUpdate((data, peerId) => {
            window.shareModuleRef.handleKanbanUpdate(data, peerId);
        });
        onInitialKanban((data, peerId) => window.shareModuleRef.handleInitialKanban(data, peerId));
        onChatHistory((data, peerId) => window.shareModuleRef.handleChatHistory(data, peerId));
        onInitialDocuments((data, peerId) => window.shareModuleRef.handleInitialDocuments(data, peerId));
        onCreateDocument((data, peerId) => {
            window.shareModuleRef.handleCreateDocument(data, peerId);
        });
        onRenameDocument((data, peerId) => {
            window.shareModuleRef.handleRenameDocument(data, peerId);
        });
        onDeleteDocument((data, peerId) => {
            window.shareModuleRef.handleDeleteDocument(data, peerId);
        });
        onDocumentContentUpdate((data, peerId) => {
            window.shareModuleRef.handleDocumentContentUpdate(data, peerId);
        });
        onCreateChannel((data, peerId) => {
            window.shareModuleRef.handleCreateChannel(data, peerId);
        });
        onInitialChannels((data, peerId) => window.shareModuleRef.handleInitialChannels(data, peerId));
        
        onNickname(async (nicknameData, peerId) => {
            const { nickname, initialJoin, isHost: peerIsHost } = nicknameData;
            const oldNickname = appState.workspace.peers[peerId];
            
            // Reactively update the peers object
            appState.workspace.peers = { ...appState.workspace.peers, [peerId]: nickname };

            if (initialJoin && peerId !== localGeneratedPeerId) {
                if (!oldNickname || oldNickname !== nickname) logStatus(`${escapeHtml(nickname)}${peerIsHost ? ' (Host)' : ''} has joined.`);
                if (sendNickname) await sendNickname({ nickname: appState.workspace.nickname, initialJoin: false, isHost: appState.workspace.isHost }, peerId);
            } else if (oldNickname && oldNickname !== nickname) {
                 logStatus(`${escapeHtml(oldNickname)} is now known as ${escapeHtml(nickname)}.`);
            }
            // No need to call updateUserList(), UI will react to state change.
            if (window.mediaModuleRef && window.mediaModuleRef.updatePeerNicknameInUI) window.mediaModuleRef.updatePeerNicknameInUI(peerId, nickname);
        });

        roomApi.onPeerJoin(async (joinedPeerId) => {
            logStatus(`Peer ${joinedPeerId.substring(0,6)}... joining, preparing to sync...`);
            if (sendNickname) await sendNickname({ nickname: appState.workspace.nickname, initialJoin: true, isHost: appState.workspace.isHost }, joinedPeerId);
            if (window.mediaModuleRef && typeof setupMediaForNewPeer === 'function') setupMediaForNewPeer(joinedPeerId);
            if (appState.workspace.isHost && window.shareModuleRef && window.shareModuleRef.sendFullStateToPeer) window.shareModuleRef.sendFullStateToPeer(joinedPeerId);
            // No need to call updateUserList()
        });

        roomApi.onPeerLeave(leftPeerId => {
            const departedUser = appState.workspace.peers[leftPeerId] || `Peer ${leftPeerId.substring(0, 6)}`;
            logStatus(`${escapeHtml(departedUser)} has left.`);
            
            // Reactively update the peers object
            const newPeers = { ...appState.workspace.peers };
            delete newPeers[leftPeerId];
            appState.workspace.peers = newPeers;

            if(typeof handleShareModulePeerLeave === 'function') handleShareModulePeerLeave(leftPeerId);
            if (window.mediaModuleRef && typeof cleanupMediaForPeer === 'function') cleanupMediaForPeer(leftPeerId);
            // No need to call updateUserList()
        });

        roomApi.onPeerStream((stream, peerId, metadata) => {
            if (window.mediaModuleRef && typeof handleMediaPeerStream === 'function') handleMediaPeerStream(stream, peerId, metadata);
        });
        logStatus("Finalizing workspace setup...");
        if(setupSection) setupSection.classList.add('hidden');
        if(inRoomInterface) inRoomInterface.classList.remove('hidden');
        
        // These will be replaced by reactive bindings in index.html
        if(currentRoomCodeSpan) currentRoomCodeSpan.textContent = appState.workspace.roomId; 
        if(currentNicknameSpan) currentNicknameSpan.textContent = escapeHtml(appState.workspace.nickname); 
        
        if (window.mediaModuleRef && window.mediaModuleRef.enableMediaButtons) window.mediaModuleRef.enableMediaButtons();
        if (sendNickname) await sendNickname({ nickname: appState.workspace.nickname, initialJoin: true, isHost: appState.workspace.isHost }, Object.keys(roomApi.getPeers()).filter(p => p !== localGeneratedPeerId));
        
        // No need to call updateUserList()
        logStatus(`You joined workspace: ${appState.workspace.roomId} as ${escapeHtml(appState.workspace.nickname)}${appState.workspace.isHost ? ' (Host)' : ''}.`);
        
        const shareModule = window.shareModuleRef;
        if (shareModule && shareModule.ensureDefaultDocument) {
            shareModule.ensureDefaultDocument();
        }

    } catch (error) {
        console.error("Error during room join or Trystero setup:", error);
        logStatus(`Error: ${error.message}. Could be incorrect password or network issue. Please try again.`, true); 
        appState.workspace.status = 'disconnected'; // Update state on error
        resetToSetupState(appState);
    }
}
async function leaveRoomAndCleanup(appState) {
    logStatus("Leaving workspace...");
    if (window.mediaModuleRef && typeof stopAllLocalMedia === 'function') await stopAllLocalMedia(false);
    if (roomApi) {
        try { await roomApi.leave(); logStatus("Left workspace successfully."); }
        catch (e) { console.warn("Error leaving room:", e); }
    }
    roomApi = null;
    sendChatMessage=onChatMessage=sendNickname=onNickname=sendPrivateMessage=onPrivateMessage=sendFileMeta=onFileMeta=sendFileChunk=onFileChunk=sendDrawCommand=onDrawCommand=sendInitialWhiteboard=onInitialWhiteboard=sendKanbanUpdate=onKanbanUpdate=sendInitialKanban=onInitialKanban=sendChatHistory=onChatHistory=sendInitialDocuments=onInitialDocuments=sendCreateDocument=onCreateDocument=sendRenameDocument=onRenameDocument=sendDeleteDocument=onDeleteDocument=sendDocumentContentUpdate=onDocumentContentUpdate=sendCreateChannel=onCreateChannel=sendInitialChannels=onInitialChannels=null;
    resetToSetupState(appState);
}
function resetToSetupState(appState) {
    if (appState) {
        appState.workspace = null; // The primary way to reset state now
    }

    if(inRoomInterface) inRoomInterface.classList.add('hidden');
    if(setupSection) setupSection.classList.remove('hidden');
    [createPartyBtn,joinWorkspaceBtn,importWorkspaceBtn,nicknameInput,roomIdInput,roomPasswordInput,joinPasswordInput,confirmCreateBtn,confirmJoinBtn].forEach(el=>el&&(el.disabled=false));
    if(createWorkspaceFields)createWorkspaceFields.classList.add('hidden');
    if(joinWorkspaceFields)joinWorkspaceFields.classList.add('hidden');
    if(roomIdInput)roomIdInput.value='';if(roomPasswordInput)roomPasswordInput.value='';if(joinPasswordInput)joinPasswordInput.value='';
    if(window.mediaModuleRef&&window.mediaModuleRef.resetMediaUIAndState)window.mediaModuleRef.resetMediaUIAndState();
    if(window.shareModuleRef&&typeof resetShareModuleStates==='function'){resetShareModuleStates();if(window.shareModuleRef.hideEmojiPicker)window.shareModuleRef.hideEmojiPicker();}
    if(userListUl)userListUl.innerHTML='';if(userCountSpan)userCountSpan.textContent='0';
    sidebarButtons.forEach(btn=>{if(btn.id!=='exportWorkspaceBtnSidebar')btn.classList.remove('active');clearNotification(btn.dataset.section);});
    if(settingsSection)settingsSection.classList.add('hidden');
    contentSections.forEach(section=>section.classList.add('hidden'));
    const defaultSectionButton=document.querySelector('.sidebar-button[data-section="chatSection"]');
    const defaultSection=document.getElementById('chatSection');
    if(defaultSectionButton)defaultSectionButton.classList.add('active');
    if(defaultSection)defaultSection.classList.remove('hidden');
    currentActiveSection='chatSection';
    peerNicknames={}; // This should be removed as it's in appState now
    importedWorkspaceState=null;
}

// Expose the function globally for use in other scripts
window.joinRoomAndSetup = joinRoomAndSetup;

async function initializeApp() {
    // Nickname is now handled by the Lightview state initialization in index.html
    // window.localNickname = localStorage.getItem('viewPartyNickname') || '';
    // if (nicknameInput) {
    //     nicknameInput.value = window.localNickname;
    //     nicknameInput.addEventListener('input', () => {
    //         localStorage.setItem('viewPartyNickname', nicknameInput.value.trim());
    //     });
    // }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) console.warn("Screen sharing not supported by your browser.");
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) console.warn("Video/Audio capture not supported by your browser.");
    await loadSettings();
    resetToSetupState(null); // Initial reset without state
    
    // On initial load, override resetToSetupState to show the intro page.
    if (setupSection) setupSection.classList.add('hidden');
    if (inRoomInterface) inRoomInterface.classList.remove('hidden');

    // Hide the default chat section shown by resetToSetupState and show the intro section.
    const chatSection = document.getElementById('chatSection');
    const introSection = document.getElementById('introSection');
    if (chatSection) chatSection.classList.add('hidden');
    if (introSection) introSection.classList.remove('hidden');
    
    console.log('Spaces: Welcome! Select an action from the sidebar to get started.');
}
initializeApp();
