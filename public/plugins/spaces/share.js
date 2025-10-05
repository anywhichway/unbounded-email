let { state } = Lightview();

let incomingFileBuffers = new Map();
let currentReplyParentId = null; // NEW: To track which message we are replying to
const MAX_THREAD_DEPTH = 4; // NEW: Max reply depth

let appStateDep; // Central app state - references appState.workspace

import { debounce } from './utils.js';
import {
    initKanbanFeatures,
    getShareableData as getKanbanData,
    loadShareableData as loadKanbanData,
    resetKanbanState,
    handleKanbanUpdate as handleKanbanUpdateInternal,
    handleInitialKanban as handleInitialKanbanInternal,
    sendInitialKanbanStateToPeer,
    renderKanbanBoardIfActive as renderKanbanBoardIfActiveInternal
} from './kanban.js';

import {
    initWhiteboardFeatures,
    getShareableData as getWhiteboardHistory,
    loadShareableData as loadWhiteboardData,
    resetWhiteboardState,
    handleDrawCommand as handleDrawCommandInternal,
    handleInitialWhiteboard as handleInitialWhiteboardInternal,
    sendInitialWhiteboardStateToPeer,
    redrawWhiteboardFromHistoryIfVisible as redrawWhiteboardFromHistoryIfVisibleInternal,
    resizeWhiteboardAndRedraw as resizeWhiteboardAndRedrawInternal
} from './whiteboard.js';

import {
    initDocumentFeatures,
    getShareableData as getDocumentShareData,
    loadShareableData as loadDocumentData,
    resetDocumentState,
    handleInitialDocuments as handleInitialDocumentsInternal,
    handleCreateDocument as handleCreateDocumentInternal,
    handleRenameDocument as handleRenameDocumentInternal,
    handleDeleteDocument as handleDeleteDocumentInternal,
    handleDocumentContentUpdate as handleDocumentContentUpdateInternal,
    sendInitialDocumentsStateToPeer,
    renderDocumentsIfActive as renderDocumentsIfActiveInternal,
    ensureDefaultDocument as ensureDefaultDocumentInternal
} from './document.js';

let sendChatMessageDep, sendPrivateMessageDep, sendFileMetaDep, sendFileChunkDep;
let sendDrawCommandDep, sendInitialWhiteboardDep, sendKanbanUpdateDep, sendInitialKanbanDep;
let sendChatHistoryDep, sendInitialDocumentsDep, sendCreateDocumentDep, sendRenameDocumentDep;
let sendDeleteDocumentDep, sendDocumentContentUpdateDep;
let sendCreateChannelDep, onCreateChannelDep;
let sendInitialChannelsDep, onInitialChannelsDep;


let logStatusDep, showNotificationDep;
let localGeneratedPeerIdDep;
let getPeerNicknamesDep, getIsHostDep, getLocalNicknameDep, findPeerIdByNicknameDepFnc;
let currentRoomIdDep;

let chatArea, messageInput, sendMessageBtn, emojiIcon, emojiPickerPopup, triggerFileInput, chatFileInput;
let channelListDiv, newChannelNameInput, addChannelBtn;
let replyingToBanner, replyingToText, cancelReplyBtn; // NEW: For reply UI

let kanbanModuleRef, whiteboardModuleRef, documentModuleRef;

const IMAGE_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/avif',
    'image/svg+xml'
];
const MIN_PREVIEW_DIM = 140;
const MAX_PREVIEW_DIM = 240;

function selectChatDomElements() {
    chatArea = document.getElementById('chatArea');
    messageInput = document.getElementById('messageInput');
    sendMessageBtn = document.getElementById('sendMessageBtn');
    emojiIcon = document.querySelector('.emoji-icon');
    emojiPickerPopup = document.getElementById('emojiPickerPopup');
    triggerFileInput = document.getElementById('triggerFileInput');
    chatFileInput = document.getElementById('chatFileInput');

    channelListDiv = document.getElementById('channelList');
    newChannelNameInput = document.getElementById('newChannelNameInput');
    addChannelBtn = document.getElementById('addChannelBtn');

    // NEW: Select reply UI elements
    replyingToBanner = document.getElementById('replyingToBanner');
    replyingToText = document.getElementById('replyingToText');
    cancelReplyBtn = document.getElementById('cancelReplyBtn');
}


export function initShareFeatures(dependencies) {
    selectChatDomElements();

    appStateDep = dependencies.workspace; // Get the workspace object directly

    const saveSpaceToLocalStorageDep = dependencies.saveSpaceToLocalStorage;
    const debouncedSave = debounce(() => {
        if (appStateDep.isHost) {
            saveSpaceToLocalStorageDep();
        }
    }, 1000);

    // Chat, channel, and feature state is now managed in appStateDep (workspace object)
    // No need for a separate workspaceState object

    logStatusDep = dependencies.logStatus;
    showNotificationDep = dependencies.showNotification;
    localGeneratedPeerIdDep = dependencies.localGeneratedPeerId;
    getPeerNicknamesDep = dependencies.getPeerNicknames;
    getIsHostDep = () => appStateDep.isHost; // Read from centralized workspace state
    getLocalNicknameDep = () => appStateDep.nickname; // Read from centralized workspace state
    findPeerIdByNicknameDepFnc = dependencies.findPeerIdByNicknameFnc;
    currentRoomIdDep = () => appStateDep.roomId; // Read from centralized workspace state

    
    sendChatMessageDep = dependencies.sendChatMessage;
    sendPrivateMessageDep = dependencies.sendPrivateMessage;
    sendFileMetaDep = dependencies.sendFileMeta;
    sendFileChunkDep = dependencies.sendFileChunk;
    sendChatHistoryDep = dependencies.sendChatHistory;
    sendCreateChannelDep = dependencies.sendCreateChannel;
    sendInitialChannelsDep = dependencies.sendInitialChannels;
    sendDrawCommandDep = dependencies.sendDrawCommand;
    sendInitialWhiteboardDep = dependencies.sendInitialWhiteboard;
    sendKanbanUpdateDep = dependencies.sendKanbanUpdate;
    sendInitialKanbanDep = dependencies.sendInitialKanban;
    sendInitialDocumentsDep = dependencies.sendInitialDocuments;
    sendCreateDocumentDep = dependencies.sendCreateDocument;
    sendRenameDocumentDep = dependencies.sendRenameDocument;
    sendDeleteDocumentDep = dependencies.sendDeleteDocument;
    sendDocumentContentUpdateDep = dependencies.sendDocumentContentUpdate;

    const commonSubModuleDeps = {
        logStatus: logStatusDep,
        showNotification: showNotificationDep,
        getPeerNicknames: getPeerNicknamesDep,
        localGeneratedPeerId: localGeneratedPeerIdDep,
        getIsHost: getIsHostDep,
    };

    const onKanbanUpdate = () => {
        if (kanbanModuleRef) appStateDep.kanbanData = kanbanModuleRef.getShareableData();
    };

    kanbanModuleRef = initKanbanFeatures({
        ...commonSubModuleDeps,
        sendKanbanUpdate: sendKanbanUpdateDep,
        sendInitialKanban: sendInitialKanbanDep,
        onUpdate: onKanbanUpdate
            });

    const onWhiteboardUpdate = () => {
        if (whiteboardModuleRef) appStateDep.whiteboardHistory = whiteboardModuleRef.getShareableData();
    };

    whiteboardModuleRef = initWhiteboardFeatures({
        ...commonSubModuleDeps,
        sendDrawCommand: sendDrawCommandDep,
        sendInitialWhiteboard: sendInitialWhiteboardDep,
        onUpdate: onWhiteboardUpdate
    });

    const onDocumentUpdate = () => {
        if (documentModuleRef) {
            const docData = documentModuleRef.getShareableData();
            appStateDep.documents = docData.documents;
            appStateDep.currentActiveDocumentId = docData.currentActiveDocumentId;
        }
    };

    documentModuleRef = initDocumentFeatures({
        ...commonSubModuleDeps,
        sendInitialDocuments: sendInitialDocumentsDep,
        sendCreateDocument: sendCreateDocumentDep,
        sendRenameDocument: sendRenameDocumentDep,
        sendDeleteDocument: sendDeleteDocumentDep,
        sendDocumentContentUpdate: sendDocumentContentUpdateDep,
        onUpdate: onDocumentUpdate
    });
    
    initChat();
    
    const importedState = dependencies.getImportedWorkspaceState();
    if (importedState) {
        console.log("Host importing workspace state from file/storage...");
        loadShareableData(importedState);
        dependencies.clearImportedWorkspaceState();
    }
    
    if (getIsHostDep && getIsHostDep()) {
        if (appStateDep.channels.length === 0) {
            _createAndBroadcastChannel('#general', true);
        }
        documentModuleRef.ensureDefaultDocument();
    } else {
        if (sendInitialChannelsDep) sendInitialChannelsDep({}, null, { to: 'host' });
        if (sendInitialDocumentsDep) sendInitialDocumentsDep({}, null, { to: 'host' });
    }


    renderChannelList();
    displayChatForCurrentChannel();

    return { 
      
        handleChatMessage, handlePrivateMessage, handleFileMeta, handleFileChunk,
        handleChatHistory, 
        handleCreateChannel, handleInitialChannels, 

        
        handleDrawCommand: (data, peerId) => {
            whiteboardModuleRef.handleDrawCommand(data, peerId);
            if (whiteboardModuleRef) appStateDep.whiteboardHistory = whiteboardModuleRef.getWhiteboardHistory();
        },
        handleInitialWhiteboard: (data, peerId) => {
            whiteboardModuleRef.handleInitialWhiteboard(data, peerId, getIsHostDep);
            if (whiteboardModuleRef) appStateDep.whiteboardHistory = whiteboardModuleRef.getWhiteboardHistory();
        },
        handleKanbanUpdate: (data, peerId) => {
            kanbanModuleRef.handleKanbanUpdate(data, peerId, localGeneratedPeerIdDep);
            if (kanbanModuleRef) appStateDep.kanbanData = kanbanModuleRef.getKanbanData();
        },
        handleInitialKanban: (data, peerId) => {
            kanbanModuleRef.handleInitialKanban(data, peerId, getIsHostDep, localGeneratedPeerIdDep);
            if (kanbanModuleRef) appStateDep.kanbanData = kanbanModuleRef.getKanbanData();
        },
        handleInitialDocuments: (data, peerId) => {
            documentModuleRef.handleInitialDocuments(data, peerId);
            if (documentModuleRef) {
                const docData = documentModuleRef.getDocumentShareData();
                appStateDep.documents = docData.docs;
                appStateDep.currentActiveDocumentId = docData.activeId;
            }
        },
        handleCreateDocument: (data, peerId) => {
            documentModuleRef.handleCreateDocument(data, peerId);
            if (documentModuleRef) {
                const docData = documentModuleRef.getDocumentShareData();
                appStateDep.documents = docData.docs;
                appStateDep.currentActiveDocumentId = docData.activeId;
            }
        },
        handleRenameDocument: (data, peerId) => {
            documentModuleRef.handleRenameDocument(data, peerId);
            if (documentModuleRef) {
                const docData = documentModuleRef.getDocumentShareData();
                appStateDep.documents = docData.docs;
                appStateDep.currentActiveDocumentId = docData.activeId;
            }
        },
        handleDeleteDocument: (data, peerId) => {
            documentModuleRef.handleDeleteDocument(data, peerId);
            if (documentModuleRef) {
                const docData = documentModuleRef.getDocumentShareData();
                appStateDep.documents = docData.docs;
                appStateDep.currentActiveDocumentId = docData.activeId;
            }
        },
        handleDocumentContentUpdate: (data, peerId) => {
            documentModuleRef.handleDocumentContentUpdate(data, peerId);
            if (documentModuleRef) {
                const docData = documentModuleRef.getDocumentShareData();
                appStateDep.documents = docData.docs;
                appStateDep.currentActiveDocumentId = docData.activeId;
            }
        },

        redrawWhiteboardFromHistoryIfVisible: (force) => whiteboardModuleRef.redrawWhiteboardFromHistoryIfVisible(force),
        resizeWhiteboardAndRedraw: () => whiteboardModuleRef.resizeWhiteboardAndRedraw(),
        renderKanbanBoardIfActive: (force) => kanbanModuleRef.renderKanbanBoardIfActive(force),
        renderDocumentsIfActive: (force) => documentModuleRef.renderDocumentsIfActive(force),
        ensureDefaultDocument: () => documentModuleRef.ensureDefaultDocument(), 

        sendFullStateToPeer,
        displaySystemMessage,
        updateChatMessageInputPlaceholder,
        primePrivateMessage,
        hideEmojiPicker,
        initializeEmojiPicker,
        setShareModulePeerInfo, 
        handleShareModulePeerLeave 
    };
}

export function setShareModulePeerInfo(peerNicknames) {
  
}

export function handleShareModulePeerLeave(peerId) {
    const keysToDelete = [];
    for (const [key, value] of incomingFileBuffers.entries()) {
        if (key.startsWith(`${peerId}_`)) {
            const peerNickname = (getPeerNicknamesDep && getPeerNicknamesDep()[peerId]) ? getPeerNicknamesDep()[peerId] : peerId.substring(0,6);
            if(logStatusDep) logStatusDep(`File transfer for ${value.meta.name} from departing peer ${peerNickname} cancelled.`);
            
            const safeSenderNickname = peerNickname.replace(/\W/g, '');
            const safeFileName = value.meta.name.replace(/\W/g, '');
            const progressId = `file-progress-${safeSenderNickname}-${safeFileName}`;
            const progressElem = document.getElementById(progressId);
            if (progressElem) progressElem.textContent = ` (Cancelled)`;
            keysToDelete.push(key);
        }
    }
    keysToDelete.forEach(key => incomingFileBuffers.delete(key));

  
}


function initChat() {
    if (!sendMessageBtn || !messageInput || !triggerFileInput || !chatFileInput || !emojiIcon || !emojiPickerPopup) return;
    if (!addChannelBtn || !newChannelNameInput || !channelListDiv) return; 

    sendMessageBtn.addEventListener('click', handleSendMessage);
    messageInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSendMessage(); });

    triggerFileInput.addEventListener('click', () => chatFileInput.click());
    chatFileInput.addEventListener('change', handleChatFileSelected);
    
    // NEW: Add listener for the cancel reply button
    if (cancelReplyBtn) {
        cancelReplyBtn.addEventListener('click', cancelReply);
    }

    emojiIcon.addEventListener('click', (event) => {
        event.stopPropagation();
        const isHidden = emojiPickerPopup.classList.toggle('hidden');
        if (!isHidden && emojiPickerPopup.children.length === 0) {
            populateEmojiPicker();
        }
        messageInput.focus();
    });
    document.addEventListener('click', (event) => {
        if (emojiPickerPopup && !emojiPickerPopup.classList.contains('hidden') && !emojiPickerPopup.contains(event.target) && event.target !== emojiIcon) {
            emojiPickerPopup.classList.add('hidden');
        }
    });
    if (emojiPickerPopup) {
        emojiPickerPopup.addEventListener('mouseleave', () => {
            emojiPickerPopup.classList.add('hidden');
        });
    }
    addChannelBtn.addEventListener('click', handleAddChannelUI);
}

// NEW: Function to start a reply to a specific message
function startReplyToMessage(msgId) {
    const parentMessage = appStateDep.chatHistory.find(m => m.msgId === msgId);
    if (!parentMessage) return;

    currentReplyParentId = msgId;

    let contentPreview = parentMessage.message || `File: ${parentMessage.fileMeta.name}`;
    if (contentPreview.length > 50) {
        contentPreview = contentPreview.substring(0, 47) + '...';
    }
    
    if (replyingToText) replyingToText.textContent = `Replying to ${parentMessage.senderNickname}: "${contentPreview}"`;
    if (replyingToBanner) replyingToBanner.classList.remove('hidden');
    if (messageInput) messageInput.focus();
}

// NEW: Function to cancel the current reply
function cancelReply() {
    currentReplyParentId = null;
    if (replyingToBanner) replyingToBanner.classList.add('hidden');
    if (replyingToText) replyingToText.textContent = '';
}

export function initializeEmojiPicker() {
    if(emojiPickerPopup && emojiPickerPopup.children.length === 0) populateEmojiPicker();
}

function populateEmojiPicker() {
    if (!emojiPickerPopup) return;
    emojiPickerPopup.innerHTML = '';
    const emojis = ['😊', '😂', '❤️', '👍', '🙏', '🎉', '🔥', '👋', '✅', '🤔', '😢', '😮', '😭', '😍', '💯', '🌟', '✨', '🎁', '🎈', '🎂', '🍕', '🚀', '💡', '🤷', '🤦'];
    emojis.forEach(emoji => {
        const emojiSpan = document.createElement('span');
        emojiSpan.textContent = emoji;
        emojiSpan.setAttribute('role', 'button');
        emojiSpan.title = `Insert ${emoji}`;
        emojiSpan.addEventListener('click', () => {
            insertEmojiIntoInput(emoji);
            emojiPickerPopup.classList.add('hidden');
        });
        emojiPickerPopup.appendChild(emojiSpan);
    });
}

function insertEmojiIntoInput(emoji) {
    if (!messageInput) return;
    const cursorPos = messageInput.selectionStart;
    const textBefore = messageInput.value.substring(0, cursorPos);
    const textAfter = messageInput.value.substring(cursorPos);
    messageInput.value = textBefore + emoji + textAfter;
    messageInput.focus();
    const newCursorPos = cursorPos + emoji.length;
    messageInput.setSelectionRange(newCursorPos, newCursorPos);
}

export function hideEmojiPicker() {
    if(emojiPickerPopup) emojiPickerPopup.classList.add('hidden');
}

function _createAndBroadcastChannel(channelName, isDefault = false) {
    if (!channelName || !channelName.trim()) return;

    let userProvidedName = channelName.trim();
    if (userProvidedName.startsWith('#')) {
        userProvidedName = userProvidedName.substring(1);
    }

    if (userProvidedName.length > 16) {
        logStatusDep('Channel name max 16 chars.', true);
        return;
    }
    
    let saneChannelName = channelName.trim();
    if (!saneChannelName.startsWith('#')) {
        saneChannelName = '#' + saneChannelName;
    }
    saneChannelName = saneChannelName.replace(/\s+/g, '-').toLowerCase(); 

    if (appStateDep.channels.find(ch => ch.name === saneChannelName)) {
        logStatusDep(`Channel "${saneChannelName}" already exists.`);
        // If the channel exists, just switch to it.
        const existingChannel = appStateDep.channels.find(ch => ch.name === saneChannelName);
        if (existingChannel) {
            setActiveChannel(existingChannel.id);
        }
        return;
    }

    const newChannel = { id: `ch-${Date.now()}-${Math.random().toString(36).substring(2,5)}`, name: saneChannelName };
    appStateDep.channels.push(newChannel);
    
    if (sendCreateChannelDep) {
        sendCreateChannelDep(newChannel);
    }
    if (isDefault || appStateDep.channels.length === 1) {
        appStateDep.currentActiveChannelId = newChannel.id;
    }
    renderChannelList();
    return newChannel;
}


function handleAddChannelUI() {
    if (!newChannelNameInput) return;
    const channelName = newChannelNameInput.value;
    const createdChannel = _createAndBroadcastChannel(channelName);
    if (createdChannel) {
        newChannelNameInput.value = '';
        if(logStatusDep && !appStateDep.channels.find(ch => ch.id === createdChannel.id && ch.name === createdChannel.name && appStateDep.channels.indexOf(ch) < appStateDep.channels.length -1 )) {
            logStatusDep(`Channel "${createdChannel.name}" created.`);
        }
    }
}

function renderChannelList() {
    if (!channelListDiv) return;
    
    // Safety check: ensure channels array exists
    if (!appStateDep || !Array.isArray(appStateDep.channels)) {
        console.warn("appStateDep.channels is not an array, initializing to empty array");
        if (appStateDep) appStateDep.channels = [];
        channelListDiv.innerHTML = '';
        return;
    }
    
    channelListDiv.innerHTML = '';
    appStateDep.channels.forEach(channel => {
        const channelDiv = document.createElement('div');
        channelDiv.className = 'channel-list-item';  // Changed from 'channel-item' to match CSS
        channelDiv.textContent = channel.name;
        channelDiv.dataset.channelId = channel.id;
        if (channel.id === appStateDep.currentActiveChannelId) {
            channelDiv.classList.add('active');
        }
        if (channel.hasNotification) {
            channelDiv.classList.add('has-notification');
            // Add a notification dot for visual indicator
            const dot = document.createElement('span');
            dot.className = 'channel-notification-dot';
            channelDiv.appendChild(dot);
        }
        channelDiv.addEventListener('click', () => setActiveChannel(channel.id));
        channelListDiv.appendChild(channelDiv);
    });
}

function setActiveChannel(channelId, clearNotifications = true) {
    if (appStateDep.currentActiveChannelId === channelId && !clearNotifications) {
        return; // Already active, and we are not trying to clear notifications
    }
    appStateDep.currentActiveChannelId = channelId;
    cancelReply(); // NEW: Cancel reply when switching channels
    renderChannelList(); 
    displayChatForCurrentChannel();

    if (clearNotifications && channelListDiv) {
        const channel = appStateDep.channels.find(c => c.id === channelId);
        if (channel) channel.hasNotification = false;
        const channelDiv = channelListDiv.querySelector(`.channel-list-item[data-channel-id="${channelId}"]`);
        if (channelDiv) channelDiv.classList.remove('has-notification');
    }
    if(messageInput) {
        updateChatMessageInputPlaceholder();
        messageInput.focus();
    }
}

// MODIFIED: This function is now the entry point for rendering the entire chat, including threads.
function displayChatForCurrentChannel() {
    if (!chatArea) return;
    chatArea.innerHTML = '';
    if (!appStateDep || !appStateDep.currentActiveChannelId) {
        chatArea.innerHTML = '<div class="system-message">Select a channel to start chatting.</div>';
        return;
    }

    const messagesForChannel = appStateDep.chatHistory.filter(msg => msg.channelId === appStateDep.currentActiveChannelId);

    // NEW: Organize messages for threading
    const messagesById = new Map();
    const childrenByParentId = new Map();

    messagesForChannel.forEach(msg => {
        messagesById.set(msg.msgId, msg);
        if (msg.parentId) {
            if (!childrenByParentId.has(msg.parentId)) {
                childrenByParentId.set(msg.parentId, []);
            }
            childrenByParentId.get(msg.parentId).push(msg.msgId);
        }
    });

    // Render top-level messages
    messagesForChannel.forEach(msg => {
        if (!msg.parentId) {
            renderMessageAndThread(msg, 0, messagesById, childrenByParentId, chatArea);
        }
    });

    chatArea.scrollTop = chatArea.scrollHeight;
}

// NEW: Recursive function to render a message and its replies.
function renderMessageAndThread(msgObject, depth, messagesById, childrenByParentId, container) {
    // Render the message itself
    const threadContainer = document.createElement('div');
    threadContainer.classList.add('message-thread-container');
    displayMessage(msgObject, msgObject.senderPeerId === localGeneratedPeerIdDep, msgObject.isSystem, threadContainer, depth);
    container.appendChild(threadContainer);
    
    // Render its replies
    const children = childrenByParentId.get(msgObject.msgId);
    if (children && children.length > 0) {
        const repliesContainer = document.createElement('div');
        repliesContainer.classList.add('thread-replies-container');
        threadContainer.appendChild(repliesContainer);

        children.forEach(reply => {
            renderMessageAndThread(reply, depth + 1, messagesById, childrenByParentId, repliesContainer);
        });
    }
}


// MODIFIED: displayMessage is now more of a pure renderer.
// It takes a container to append to and knows the thread depth.
function displayMessage(msgObject, isSelf = false, isSystem = false, container, depth = 0) {
    if (!container) return;
    const { msgId, senderNickname, message, pmInfo, fileMeta, timestamp } = msgObject;
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    const displayTimestamp = timestamp ? new Date(timestamp) : new Date();
    const hours = String(displayTimestamp.getHours()).padStart(2, '0');
    const minutes = String(displayTimestamp.getMinutes()).padStart(2, '0');
    const timestampStr = `${hours}:${minutes}`;
    const timestampSpan = document.createElement('span');
    timestampSpan.classList.add('timestamp');
    timestampSpan.textContent = timestampStr;

    if (isSystem) {
        messageDiv.classList.add('system-message');
        messageDiv.appendChild(document.createTextNode(message + " "));
    } else if (pmInfo) {
        // PMs are not threaded, so they are always top-level.
        messageDiv.classList.add('pm');
        messageDiv.classList.add(isSelf ? 'self' : 'other');
        const pmContextSpan = document.createElement('span');
        pmContextSpan.classList.add('pm-info');
        pmContextSpan.textContent = pmInfo.type === 'sent' ? `To ${pmInfo.recipient}:` : `From ${pmInfo.sender}:`;
        messageDiv.appendChild(pmContextSpan);
        messageDiv.appendChild(document.createTextNode(message + " "));
    } else if (fileMeta) {
        messageDiv.classList.add(isSelf ? 'self' : 'other');
        messageDiv.classList.add('file-message');
        
        const senderSpan = document.createElement('span'); senderSpan.classList.add('sender');
        senderSpan.textContent = isSelf ? 'You' : senderNickname;
        messageDiv.appendChild(senderSpan);

        const fileInfoContainer = document.createElement('div');
        fileInfoContainer.classList.add('file-info-container');

        const previewLink = document.createElement('a'); 
        previewLink.classList.add('chat-file-preview-link');
        previewLink.title = `Click to download ${fileMeta.name}`; 
        if (fileMeta.blobUrl) {
            previewLink.href = fileMeta.blobUrl;
            previewLink.download = fileMeta.name;
        } else {
            previewLink.href = "#"; 
            previewLink.onclick = (e) => e.preventDefault(); 
        }

        if (fileMeta.previewDataURL) {
            const previewImg = document.createElement('img');
            previewImg.src = fileMeta.previewDataURL;
            previewImg.alt = `Preview of ${fileMeta.name}`;
            previewImg.classList.add('chat-file-preview');
            previewLink.appendChild(previewImg); 
            fileInfoContainer.appendChild(previewLink);
        }

        const fileTextInfoSpan = document.createElement('span');
        fileTextInfoSpan.classList.add('file-text-info');
        const fileNameStrong = document.createElement('strong');
        fileNameStrong.textContent = fileMeta.name;
        const fileSizeSpan = document.createTextNode(` (${(fileMeta.size / 1024).toFixed(2)} KB) `);
        
        fileTextInfoSpan.appendChild(document.createTextNode("Shared: "));
        fileTextInfoSpan.appendChild(fileNameStrong);
        fileTextInfoSpan.appendChild(fileSizeSpan);
        
        if (!fileMeta.previewDataURL && fileMeta.blobUrl) { 
            const downloadLink = document.createElement('a');
            downloadLink.href = fileMeta.blobUrl;
            downloadLink.download = fileMeta.name;
            downloadLink.textContent = 'Download';
            fileTextInfoSpan.appendChild(downloadLink);
        } else if (fileMeta.receiving || (!fileMeta.blobUrl && !isSelf)) {
            const progressSpan = document.createElement('span');
            const safeSName = (isSelf ? (getLocalNicknameDep ? getLocalNicknameDep() : 'You') : senderNickname).replace(/\W/g, '');
            const safeFName = fileMeta.name.replace(/\W/g, '');
            progressSpan.id = `file-progress-${safeSName}-${safeFName}`;
            
            let initialProgressText = "";
            if (isSelf && fileMeta.receiving) initialProgressText = ` (Sending 0%)`;
            else if (!isSelf && !fileMeta.blobUrl) initialProgressText = ` (Receiving 0%)`;
            
            progressSpan.textContent = initialProgressText;
            if(initialProgressText) fileTextInfoSpan.appendChild(progressSpan);
        } else if (isSelf && !fileMeta.receiving && fileMeta.blobUrl && !fileMeta.previewDataURL) { 
             const sentSpan = document.createElement('span');
             sentSpan.textContent = " (Sent)";
             fileTextInfoSpan.appendChild(sentSpan);
        }

        fileInfoContainer.appendChild(fileTextInfoSpan);
        messageDiv.appendChild(fileInfoContainer);

    } else { 
        messageDiv.classList.add(isSelf ? 'self' : 'other');
        const senderSpan = document.createElement('span'); senderSpan.classList.add('sender');
        senderSpan.textContent = isSelf ? 'You' : senderNickname;
        messageDiv.appendChild(senderSpan);
        messageDiv.appendChild(document.createTextNode(message + " "));
    }

    messageDiv.appendChild(timestampSpan);

    // NEW: Add Reply button if not a system message and depth is not too great
    if (!isSystem && !pmInfo && depth < MAX_THREAD_DEPTH) {
        const replyBtn = document.createElement('button');
        replyBtn.textContent = '↪';
        replyBtn.title = 'Reply to this message';
        replyBtn.classList.add('reply-btn');
        replyBtn.onclick = () => startReplyToMessage(msgId);
        messageDiv.appendChild(replyBtn);
    }
    
    container.appendChild(messageDiv);
}


// MODIFIED: Add a message to history and re-render the chat
function addMessageToHistoryAndDisplay(msgData, isSelf = false, isSystem = false) {
    if (!msgData.channelId) {
        console.warn("Message without channelId, defaulting to current. Message:", msgData);
        msgData.channelId = appStateDep.currentActiveChannelId;
    }
    
    // Avoid duplicates
    if (appStateDep.chatHistory.some(m => m.msgId === msgData.msgId)) {
        return;
    }

    appStateDep.chatHistory.push(msgData);

    if (msgData.channelId === appStateDep.currentActiveChannelId) {
        displayChatForCurrentChannel();
    } else {
        const channel = appStateDep.channels.find(c => c.id === msgData.channelId);
        if (channel) {
            channel.hasNotification = true;
            renderChannelList();
        }
        showNotificationDep('chatSection');
    }
}

// MODIFIED: Handle sending a reply
function handleSendMessage() {
    const messageText = messageInput.value.trim();
    if (!messageText || !sendChatMessageDep) return;
    const timestamp = Date.now();
    const localCurrentNickname = getLocalNicknameDep ? getLocalNicknameDep() : 'You';
    const msgId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    if (messageText.toLowerCase().startsWith('/pm ')) {
         const parts = messageText.substring(4).split(' ');
        const targetNickname = parts.shift();
        const pmContent = parts.join(' ').trim();
        if (!targetNickname || !pmContent) {
            displaySystemMessage("Usage: /pm <nickname> <message>"); return;
        }
        if (targetNickname.toLowerCase() === localCurrentNickname.toLowerCase()) {
            displaySystemMessage("You can't PM yourself."); return;
        }
        const targetPeerId = findPeerIdByNicknameDepFnc ? findPeerIdByNicknameDepFnc(targetNickname) : null;
        if (targetPeerId && sendPrivateMessageDep) {
            sendPrivateMessageDep({ content: pmContent, timestamp }, targetPeerId);
            displaySystemMessage(`Sent PM to ${targetNickname}: ${pmContent}`);
        } else {
            displaySystemMessage(`User "${targetNickname}" not found or PM failed.`);
        }
    } else { 
        if (!appStateDep.currentActiveChannelId) {
            displaySystemMessage("Please select a channel to send a message.");
            return;
        }
        const msgData = { 
            message: messageText, 
            timestamp, 
            msgId,
            channelId: appStateDep.currentActiveChannelId,
            parentId: currentReplyParentId,
            nickname: localCurrentNickname, // ADD THIS LINE
            senderNickname: localCurrentNickname // Keep for local display
        };
        sendChatMessageDep(msgData);
        addMessageToHistoryAndDisplay({ senderNickname: localCurrentNickname, ...msgData }, true);
    }
    messageInput.value = '';
    cancelReply();
    if (emojiPickerPopup && !emojiPickerPopup.classList.contains('hidden')) emojiPickerPopup.classList.add('hidden');
}

async function handleChatFileSelected(event) {
    const file = event.target.files[0];
    if (!file || !sendFileMetaDep || !sendFileChunkDep) return;
    const localCurrentNickname = getLocalNicknameDep ? getLocalNicknameDep() : 'You';

    if(logStatusDep) logStatusDep(`Preparing to send file: ${file.name}`);
    
    const previewDataURL = await generateImagePreview(file);
    const msgId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const fileMeta = { 
        name: file.name, 
        type: file.type, 
        size: file.size, 
        id: Date.now().toString(), // Legacy file id for chunking
        previewDataURL: previewDataURL 
    };
 
    const msgData = {
        senderNickname: localCurrentNickname,
        fileMeta: { ...fileMeta, receiving: true, blobUrl: URL.createObjectURL(file) },
        timestamp: Date.now(),
        msgId: msgId,
        channelId: appStateDep.currentActiveChannelId,
        parentId: currentReplyParentId
    };

    addMessageToHistoryAndDisplay(msgData, true);
    
    // FIXED: Remove meta argument - Trystero only allows meta with binary data
    sendFileMetaDep({
        ...fileMeta,
        msgId: msgId,
        channelId: appStateDep.currentActiveChannelId,
        parentId: currentReplyParentId
    });

    cancelReply();

    const CHUNK_SIZE = 16 * 1024;
    let offset = 0;
    const reader = new FileReader();

    reader.onload = (e) => {
        const chunkData = e.target.result;
        const isFinal = (offset + chunkData.byteLength) >= file.size;
        // FIXED: Remove the meta object wrapper, just pass the metadata as the third argument directly
        sendFileChunkDep(chunkData, null, { fileName: fileMeta.name, fileId: fileMeta.id, final: isFinal });
        
        const safeLocalNickname = localCurrentNickname.replace(/\W/g, '');
        const safeFileName = fileMeta.name.replace(/\W/g, '');
        const progressId = `file-progress-${safeLocalNickname}-${safeFileName}`;

        const progressElem = document.getElementById(progressId);
        if (progressElem) {
            progressElem.textContent = ` (Sending ${Math.min(100, Math.round(((offset + chunkData.byteLength) / file.size) * 100))}%)`;
        }

        if (!isFinal) {
            offset += chunkData.byteLength;
            readNextChunk();
        } else {
            if(logStatusDep) logStatusDep(`File ${file.name} sent.`);
            const localMsgEntry = appStateDep.chatHistory.find(m => m.msgId === msgId);
            if (localMsgEntry && localMsgEntry.fileMeta) {
                delete localMsgEntry.fileMeta.receiving; 
                if (progressElem) progressElem.textContent = ` (Sent 100%)`;
            }
        }
    };
    reader.onerror = (error) => {
        if(logStatusDep) logStatusDep(`Error reading file: ${error}`, true);
        const safeLocalNickname = localCurrentNickname.replace(/\W/g, '');
        const safeFileName = fileMeta.name.replace(/\W/g, '');
        const progressId = `file-progress-${safeLocalNickname}-${safeFileName}`;
        const progressElem = document.getElementById(progressId);
        if (progressElem) progressElem.textContent = ` (Error sending)`;
    };
    function readNextChunk() {
        const slice = file.slice(offset, offset + CHUNK_SIZE);
        reader.readAsArrayBuffer(slice);
    }
    readNextChunk();
    chatFileInput.value = '';
}

export function handleChatMessage(msgData, peerId) {
    // Basic validation
    if (!msgData || typeof msgData.message !== 'string' || typeof msgData.nickname !== 'string') {
        console.warn("Invalid message data received:", msgData); // ADD THIS for debugging
        return;
    }
    // Add senderNickname for display consistency
    msgData.senderNickname = msgData.nickname;
    addMessageToHistoryAndDisplay(msgData, false);
}
export function handlePrivateMessage(pmData, senderPeerId) {
    const sender = (getPeerNicknamesDep && getPeerNicknamesDep()[senderPeerId]) ? getPeerNicknamesDep()[senderPeerId] : `Peer ${senderPeerId.substring(0, 6)}`;
    // PMs are not part of threaded channels, just log them as a system message for now.
    displaySystemMessage(`Received PM from ${sender}: ${pmData.content}`);
    if (senderPeerId !== localGeneratedPeerIdDep && showNotificationDep) showNotificationDep('chatSection'); 
}
export function handleFileMeta(meta, peerId) {
    const fileTransferId = meta.fileTransferId;
    incomingFileBuffers.set(fileTransferId, {
        meta: meta,
        chunks: [],
        receivedBytes: 0,
        peerId: peerId
    });

    // Add a placeholder message to the chat
    const msgId = meta.msgId || `${peerId}-${meta.timestamp}`;
    const placeholderMsg = {
        ...meta,
        msgId: msgId,
        senderId: peerId,
        nickname: meta.nickname,
        timestamp: meta.timestamp,
        isHost: meta.isHost,
        channelId: meta.channelId || appStateDep.currentActiveChannelId,
        fileMeta: meta,
        isDownloading: true,
    };
    addMessageToHistoryAndDisplay(placeholderMsg, false);
}
export function handleFileChunk(chunk, peerId, chunkMeta) {
    const senderNickname = (getPeerNicknamesDep && getPeerNicknamesDep()[peerId]) ? getPeerNicknamesDep()[peerId] : `Peer ${peerId.substring(0, 6)}`;
    const bufferKey = `${peerId}_${chunkMeta.fileId}`;
    const fileBuffer = incomingFileBuffers.get(bufferKey);

    if (fileBuffer) {
        fileBuffer.chunks.push(chunk);
        fileBuffer.receivedBytes += chunk.byteLength;

        // Update the UI with progress
        const msgIndex = appStateDep.chatHistory.findIndex(m => m.msgId === fileBuffer.meta.msgId);
        if (msgIndex !== -1) {
            const progress = (fileBuffer.receivedBytes / fileBuffer.meta.size) * 100;
            appStateDep.chatHistory[msgIndex].downloadProgress = progress;
            
            // This direct mutation won't trigger Lightview's reactivity for nested objects.
            // A more robust way is to re-assign or use a method that signals a change.
            // For simplicity here, we'll just re-render the whole chat.
            if (appStateDep.chatHistory[msgIndex].channelId === appStateDep.currentActiveChannelId) {
                displayChatForCurrentChannel();
            }
        }

        if (fileBuffer.receivedBytes === fileBuffer.meta.size) {
            const fileBlob = new Blob(fileBuffer.chunks, { type: fileBuffer.meta.type });
            const fileUrl = URL.createObjectURL(fileBlob);
            
            const finalMsgIndex = appStateDep.chatHistory.findIndex(m => m.msgId === fileBuffer.meta.msgId);
            if (finalMsgIndex !== -1) {
                appStateDep.chatHistory[finalMsgIndex].isDownloading = false;
                appStateDep.chatHistory[finalMsgIndex].downloadProgress = 100;
                appStateDep.chatHistory[finalMsgIndex].fileUrl = fileUrl;
                
                if (appStateDep.chatHistory[finalMsgIndex].channelId === appStateDep.currentActiveChannelId) {
                    displayChatForCurrentChannel();
                }
            }
            incomingFileBuffers.delete(chunkMeta.fileTransferId);
        }
    } else {
        console.warn(`Received chunk for unknown file: ${chunkMeta.fileName} from ${senderNickname}`);
    }
}
export function handleChatHistory(history, peerId) {
    if (getIsHostDep()) return; // Hosts don't accept history, they send it.
    console.log(`Received chat history from ${peerId.substring(0,6)}...`);
    
    // A simple merge strategy: add messages we don't have.
    history.forEach(msg => {
        if (!appStateDep.chatHistory.some(m => m.msgId === msg.msgId)) {
            appStateDep.chatHistory.push(msg);
        }
    });

    // Sort by timestamp to be sure
    appStateDep.chatHistory.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    displayChatForCurrentChannel();
}
export function updateChatMessageInputPlaceholder() {
    if(messageInput) {
        const activeChannel = appStateDep.channels.find(c => c.id === appStateDep.currentActiveChannelId);
        messageInput.placeholder = `Message ${activeChannel?.name || (currentRoomIdDep || 'current channel')}`;
    }
}
export function primePrivateMessage(nickname) {
    if (messageInput) {
        messageInput.value = `/pm ${nickname} `;
        messageInput.focus();
    }
}

export function handleCreateChannel(newChannelData, peerId) {
    if (!newChannelData || !newChannelData.id || !newChannelData.name) return;

    if (!appStateDep.channels.find(ch => ch.id === newChannelData.id)) {
        appStateDep.channels.push(newChannelData);
        renderChannelList();
        logStatusDep(`Channel "${newChannelData.name}" was created by ${getPeerNicknamesDep()[peerId] || 'a peer'}.`);
    }
}

export function handleInitialChannels(receivedChannels, peerId) {
    if (getIsHostDep()) return;
    console.log(`Received initial channels from host.`);
    
    // Ensure channels array exists before assignment
    if (!appStateDep) {
        console.error("appStateDep is not initialized");
        return;
    }
    
    // Simple overwrite, assuming host is the source of truth.
    appStateDep.channels = Array.isArray(receivedChannels.channels) ? receivedChannels.channels : [];
    appStateDep.currentActiveChannelId = receivedChannels.activeId || null;

    renderChannelList();
    displayChatForCurrentChannel();
}

export function getShareableData() {
    if (!appStateDep) return {};
    return {
        chatHistory: appStateDep.chatHistory,
        channels: appStateDep.channels,
        currentActiveChannelId: appStateDep.currentActiveChannelId,
        kanbanData: kanbanModuleRef.getShareableData(),
        whiteboardHistory: whiteboardModuleRef.getShareableData(),
        documents: documentModuleRef.getShareableData(),
    };
}
export function loadShareableData(data) {
    if (!appStateDep) return;

    // Use imported data if available
    appStateDep.chatHistory = data.chatHistory || [];
    appStateDep.channels = data.channels || [];
    appStateDep.currentActiveChannelId = data.currentActiveChannelId || null;

    // If no channels, create a default one
    if (getIsHostDep() && appStateDep.channels.length === 0) {
        const general = _createAndBroadcastChannel('#general', true);
        appStateDep.currentActiveChannelId = general.id;
    } else if (!appStateDep.currentActiveChannelId && appStateDep.channels.length > 0) {
        appStateDep.currentActiveChannelId = appStateDep.channels[0].id;
    }

    kanbanModuleRef.loadShareableData(data.kanbanData || { columns: [] });
    whiteboardModuleRef.loadShareableData(data.whiteboardHistory || []);
    documentModuleRef.loadShareableData(data.documents || {});

    renderChannelList();
    displayChatForCurrentChannel();
}
function loadChatHistoryFromImport(importedHistory) {
    // This function is now effectively merged into loadShareableData
    if (Array.isArray(importedHistory)) {
        appStateDep.chatHistory = importedHistory;
        displayChatForCurrentChannel();
    }
}


export function sendFullStateToPeer(peerId) {
    if (getIsHostDep && getIsHostDep()) {
      
        if (sendInitialChannelsDep) sendInitialChannelsDep(appStateDep.channels, peerId);
        if (sendChatHistoryDep) sendChatHistoryDep(appStateDep.chatHistory, peerId);
        if (sendInitialChannelsDep) sendInitialChannelsDep({
            channels: appStateDep.channels,
            activeId: appStateDep.currentActiveChannelId
        }, peerId);
        if (whiteboardModuleRef) whiteboardModuleRef.sendFullWhiteboardToPeer(peerId);
        if (kanbanModuleRef) kanbanModuleRef.sendFullKanbanToPeer(peerId);
        if (documentModuleRef) documentModuleRef.sendInitialDocumentsStateToPeer(peerId, getIsHostDep);
    }
}

export function displaySystemMessage(message) {
    const systemMsg = {
        msgId: `system-${Date.now()}`,
        message: message,
        timestamp: new Date().toISOString(),
        channelId: appStateDep.currentActiveChannelId,
    };
    addMessageToHistoryAndDisplay(systemMsg, false, true);
}

export function resetShareModuleStates(isCreatingHost = false) {
    // This function's purpose changes. It now just resets the UI components it manages.
    // The actual state is reset in main.js by setting appState.workspace to null.
    if (chatArea) chatArea.innerHTML = '';
    if (channelListDiv) channelListDiv.innerHTML = '';
    cancelReply();
    incomingFileBuffers.clear();
    
    // Reset sub-modules
    if (kanbanModuleRef) kanbanModuleRef.resetKanbanState();
    if (whiteboardModuleRef) whiteboardModuleRef.resetWhiteboardState();
    if (documentModuleRef) documentModuleRef.resetDocumentState();
}