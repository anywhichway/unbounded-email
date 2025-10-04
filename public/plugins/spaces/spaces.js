const Spaces = async (state) => {
    return render({
        tagName: "div",
        attributes: {
            class: "container"
        },
        children: [
            {
                tagName: "div",
                attributes: {
                    class: "app-header"
                },
                children: [
                    {
                        tagName: "div",
                        attributes: {
                            class: "app-header-title-group"
                        },
                        children: [
                            {
                                tagName: "h1",
                                children: ["Spaces"]
                            },
                            {
                                tagName: "button",
                                attributes: {
                                    id: "cycleThemeBtn",
                                    class: "btn btn-outline theme-cycle-button",
                                    onclick: () => window.onClickCycleTheme()
                                },
                                children: [
                                    {
                                        tagName: "span",
                                        attributes: {
                                            class: "icon"
                                        },
                                        children: ["🎨"]
                                    },
                                    {
                                        tagName: "span",
                                        attributes: {
                                            id: "currentThemeNameSpan"
                                        },
                                        children: ["Light"]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                tagName: "div",
                attributes: {
                    id: "setupSection",
                    class: "setup-controls-container card"
                },
                children: [
                    {
                        tagName: "label",
                        attributes: {
                            for: "nicknameInput"
                        },
                        children: ["Username:"]
                    },
                    {
                        tagName: "input",
                        attributes: {
                            type: "text",
                            id: "nicknameInput",
                            placeholder: "Enter your username"
                        }
                    },
                    {
                        tagName: "div",
                        attributes: {
                            class: "button-group"
                        },
                        children: [
                            {
                                tagName: "button",
                                attributes: {
                                    id: "createPartyBtn",
                                    class: "btn",
                                    onclick: () => window.onClickCreatePartyBtn()
                                },
                                children: ["Create Workspace"]
                            },
                            {
                                tagName: "button",
                                attributes: {
                                    id: "joinWorkspaceBtn",
                                    class: "btn",
                                    onclick: () => window.onClickJoinWorkspaceBtn()
                                },
                                children: ["Join Workspace"]
                            },
                            {
                                tagName: "button",
                                attributes: {
                                    id: "importWorkspaceBtn",
                                    class: "btn",
                                    onclick: () => window.onClickImportWorkspace()
                                },
                                children: ["Import Workspace"]
                            }
                        ]
                    },
                    {
                        tagName: "input",
                        attributes: {
                            type: "file",
                            id: "importFilePicker",
                            class: "hidden",
                            accept: ".spaces_encrypted",
                            onchange: (event) => window.onChangeImportFilePicker(event)
                        }
                    }
                ]
            },
            {
                tagName: "div",
                attributes: {
                    id: "inRoomInterface",
                    class: "app-wrapper hidden"
                },
                children: [
                    {
                        tagName: "div",
                        attributes: {
                            class: "plugin-container"
                        },
                        children: [
                            {
                                tagName: "div",
                                attributes: {
                                    class: "plugin-sidebar"
                                },
                                async children() {
                                    // Generate folder items
                                    const accountEmails = Object.keys(state.user?.accounts || {}).filter(key => !key.startsWith('_'));

                                    const folderItems = await Promise.all([
                                        // Spaces folder
                                        FolderItem({ folder: { name: "Spaces", icon: "fas fa-cubes" }, isSubfolder: false, accountEmail: null, tagName: null, state }),
                                        // Spaces subfolders (accounts)
                                        ...(accountEmails.length > 0 ? await Promise.all(accountEmails.map(email =>
                                            FolderItem({ folder: { email: email, name: email, icon: state.getAccountIconClass(email) }, isSubfolder: true, accountEmail: email, tagName: null, state })
                                        )) : []),
                                        // Other sections
                                        FolderItem({ folder: { name: "Chat", icon: "fas fa-comments" }, isSubfolder: false, accountEmail: null, tagName: null, state }),
                                        FolderItem({ folder: { name: "Video Chat", icon: "fas fa-video" }, isSubfolder: false, accountEmail: null, tagName: null, state }),
                                        FolderItem({ folder: { name: "Audio Chat", icon: "fas fa-microphone" }, isSubfolder: false, accountEmail: null, tagName: null, state }),
                                        FolderItem({ folder: { name: "Screen Share", icon: "fas fa-desktop" }, isSubfolder: false, accountEmail: null, tagName: null, state }),
                                        FolderItem({ folder: { name: "Whiteboard", icon: "fas fa-paint-brush" }, isSubfolder: false, accountEmail: null, tagName: null, state }),
                                        FolderItem({ folder: { name: "Kanban", icon: "fas fa-columns" }, isSubfolder: false, accountEmail: null, tagName: null, state }),
                                        FolderItem({ folder: { name: "Documents", icon: "fas fa-file-alt" }, isSubfolder: false, accountEmail: null, tagName: null, state }),
                                        FolderItem({ folder: { name: "Settings", icon: "fas fa-cog" }, isSubfolder: false, accountEmail: null, tagName: null, state }),
                                        FolderItem({ folder: { name: "Export Workspace", icon: "fas fa-save" }, isSubfolder: false, accountEmail: null, tagName: null, state })
                                    ]);

                                    return folderItems;
                                }
                            },
                            {
                                tagName: "div",
                                attributes: {
                                    class: "plugin-main main-app-content",
                                    innerHTML: `
                                        <div class="header-context-area">
                                            <div id="headerRoomInfoDisplay">
                                                <p><strong>Workspace:</strong> <span id="currentRoomCodeSpan"></span><button id="copyRoomCodeBtn" class="copy-room-code-btn" title="Copy Room Code" onclick="onClickCopyRoomCodeBtn()">📋</button></p>
                                                <p class="room-info-separator">|</p>
                                                <p><strong>My Username:</strong> <span id="currentNicknameSpan"></span></p>
                                            </div>
                                        </div>

                                        <div id="chatSection" class="content-section active">
                                            <h2>Chat Room</h2>
                                            <div class="chat-section-content">
                                                <div class="chat-main section-pane">
                                                    <div id="chatArea"></div>
                                                    <div id="replyingToBanner" class="replying-to-banner hidden card">
                                                        <span id="replyingToText"></span>
                                                        <button id="cancelReplyBtn" title="Cancel Reply">✖</button>
                                                    </div>
                                                    <div class="chat-input-area">
                                                        <input type="text" id="messageInput" placeholder="Type message or /pm User message">
                                                        <span id="triggerFileInput" class="file-attach-icon" title="Attach File">📎</span>
                                                        <input type="file" id="chatFileInput" class="hidden">
                                                        <span class="emoji-icon">😊</span>
                                                        <div id="emojiPickerPopup" class="emoji-picker-popup hidden card"></div>
                                                        <button id="sendMessageBtn" class="btn">Send</button>
                                                    </div>
                                                </div>
                                                <div class="chat-sidebar section-pane">
                                                    <div class="channel-management">
                                                        <h3>Channels</h3>
                                                        <div id="channelList" class="channel-list-container card"></div>
                                                        <div class="add-channel-controls">
                                                            <input type="text" id="newChannelNameInput" placeholder="#new-channel-name" maxlength="16">
                                                            <button id="addChannelBtn" class="btn">Create Channel</button>
                                                        </div>
                                                    </div>
                                                    <div class="user-list-sidebar">
                                                         <h3>Users Online</h3>
                                                         <ul id="userList" class="card"></ul>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div id="videoChatSection" class="content-section hidden section-pane">
                                            <h2>Video Chat</h2>
                                            <div class="button-group">
                                                <button id="startVideoCallBtn" class="btn">Start Video Call</button>
                                                <button id="stopVideoCallBtn" class="btn" disabled>Stop Video Call</button>
                                                <div style="margin-left: auto; display: flex; align-items: center;">
                                                    <input type="checkbox" id="toggleLocalVideoPreviewCheckbox" checked style="margin-bottom: 0;">
                                                    <label for="toggleLocalVideoPreviewCheckbox" style="margin-left: var(--space-xs); margin-bottom: 0;">Show my preview in grid</label>
                                                </div>
                                            </div>
                                            <div id="remoteVideoChatContainer" class="remote-videos-grid">
                                            </div>
                                        </div>

                                        <div id="audioChatSection" class="content-section hidden section-pane">
                                            <h2>Audio Chat</h2>
                                            <div class="button-group">
                                                <button id="startAudioCallBtn" class="btn">Start Audio Call</button>
                                                <button id="stopAudioCallBtn" class="btn" disabled>Stop Audio Call</button>
                                            </div>
                                            <div id="audioChatStatus" class="hidden" style="padding: var(--space-xs) var(--space-sm); background-color: var(--info-bg); border-left: 2px solid var(--info-border); border-radius: var(--radius-sm); margin-top: var(--space-sm);">
                                                Audio call active.
                                            </div>
                                        </div>

                                        <div id="screenShareSection" class="content-section hidden section-pane">
                                            <h2>Shared Content (Screen)</h2>
                                            <div class="button-group">
                                                <button id="startShareBtn" class="btn">Start Sharing Screen</button>
                                                <button id="stopShareBtn" class="btn" disabled>Stop Sharing Screen</button>
                                            </div>
                                            <div id="localScreenSharePreviewContainer" class="hidden">
                                                <h4>My Screen Preview</h4>
                                                <video id="localScreenSharePreviewVideo" autoplay muted playsinline></video>
                                            </div>
                                            <div id="remoteVideosContainer" style="flex-grow: 1; min-height: 0; margin-top: var(--space-md);">
                                            </div>
                                        </div>

                                        <div id="whiteboardSection" class="content-section hidden section-pane">
                                            <h2>Collaborative Whiteboard</h2>
                                            <div class="button-group">
                                                <div class="wb-tool-palette card">
                                                    <button class="wb-tool-btn" data-tool="pen" title="Pen">✏️</button>
                                                    <button class="wb-tool-btn" data-tool="line" title="Line">📏</button>
                                                    <button class="wb-tool-btn" data-tool="rectangle" title="Rectangle">▭</button>
                                                    <button class="wb-tool-btn" data-tool="circle" title="Circle">⚪</button>
                                                    <button class="wb-tool-btn" data-tool="text" title="Text">T</button>
                                                    <button class="wb-tool-btn" data-tool="eraser" title="Eraser">🧼</button>
                                                </div>
                                                <label for="wbColorPicker">Color:</label> <input type="color" id="wbColorPicker" value="#000000">
                                                <label for="wbLineWidth">Width:</label> <input type="range" id="wbLineWidth" min="1" max="30" value="3">
                                                <span id="wbLineWidthValue" style="min-width: 30px; text-align: right;">3px</span>
                                                <button id="wbClearBtn" class="btn">Clear Board</button>
                                                <button id="wbExportPngBtn" class="btn">Export PNG</button>
                                            </div>
                                            <div id="wbTextInputArea" class="hidden">
                                                <input type="text" id="wbActualTextInput" placeholder="Enter text...">
                                                <button id="wbSubmitTextBtn" class="btn">Add Text</button>
                                            </div>
                                            <div class="whiteboard-canvas-container">
                                                <canvas id="whiteboardCanvas" width="640" height="360"></canvas>
                                            </div>
                                        </div>

                                        <div id="kanbanSection" class="content-section hidden section-pane">
                                            <h2>Kanban Board</h2>
                                            <div class="button-group">
                                                <input type="text" id="newColumnNameInput" placeholder="New column name">
                                                <button id="addColumnBtn" class="btn">Add Column</button>
                                            </div>
                                            <div id="kanbanBoard" class="kanban-board card"></div>
                                        </div>

                                        <div id="documentsSection" class="content-section hidden section-pane">
                                            <h2>Collaborative Documents</h2>
                                            <div class="document-management-bar card">
                                                <h3>Documents:</h3>
                                                <div id="documentList"></div>
                                                <div class="document-actions" style="display: flex; gap: var(--space-sm); margin-left: auto;">
                                                    <button id="newDocBtn" class="btn" title="New Document">New Doc</button>
                                                    <button id="renameDocBtn" class="btn" title="Rename Current Document">Rename</button>
                                                    <button id="deleteDocBtn" class="btn-danger" title="Delete Current Document">Delete</button>
                                                </div>
                                            </div>
                                            <div class="document-formatting-controls card button-group">
                                                <button id="docBoldBtn" class="btn" title="Bold"><b>B</b></button>
                                                <button id="docItalicBtn" class="btn" title="Italic"><i>I</i></button>
                                                <button id="docUnderlineBtn" class="btn" title="Underline"><u>U</u></button>
                                                <button id="docUlBtn" class="btn" title="Unordered List">UL</button>
                                                <button id="docOlBtn" class="btn" title="Ordered List">OL</button>
                                                <button id="downloadTxtBtn" class="btn">Download as text</button>
                                                <button id="printDocBtn" class="btn" title="Print to PDF">Print PDF</button>
                                            </div>
                                            <div id="collaborativeEditor" contenteditable="true" spellcheck="false" class="card"></div>
                                        </div>

                                        <div id="settingsSection" class="content-section hidden section-pane card">
                                            <h2>Settings</h2>
                                            
                                            <label for="settingsNicknameInput">Username:</label>
                                            <input type="text" id="settingsNicknameInput" style="margin-bottom: var(--space-md);">

                                            <div class="settings-option">
                                                <input type="checkbox" id="settingsVideoFlipCheckbox">
                                                <label for="settingsVideoFlipCheckbox">Flip my video horizontally</label>
                                            </div>

                                            <div class="settings-option">
                                                <input type="checkbox" id="settingsPttEnabledCheckbox" onchange="onChangeSettingsPttEnabled()">
                                                <label for="settingsPttEnabledCheckbox">Enable Push-to-Talk (Audio Chat)</label>
                                            </div>
                                            
                                            <div id="pttHotkeySettingsContainer" class="settings-option hidden" style="align-items: baseline;">
                                                <label for="settingsPttKeyBtn" style="margin-right: var(--space-sm); white-space: nowrap;">Hotkey:</label>
                                                <div>
                                                    <button id="settingsPttKeyBtn" class="btn btn-outline" onclick="onClickSettingsPttKey()">Space</button>
                                                    <span id="pttKeyInstructions" class="hidden">Press any key... (Esc to cancel)</span>
                                                </div>
                                            </div>

                                            <div class="settings-option">
                                                <label for="settingsGlobalVolumeSlider" style="white-space: nowrap;">Global Audio Volume:</label>
                                                <input type="range" id="settingsGlobalVolumeSlider" min="0" max="1" step="0.01" value="1" style="flex-grow: 1; margin-bottom:0;" oninput="onInputSettingsGlobalVolume()">
                                                <span id="globalVolumeValue" style="min-width: 40px; text-align: right;">100%</span>
                                            </div>

                                            <div class="settings-actions">
                                                <button id="settingsSaveBtn" class="btn" onclick="onClickSettingsSave()">Save Settings</button>
                                            </div>
                                        </div>
                                    `
                                }
                            }
                        ]
                    }
                ]
            }
        ]
    });
};