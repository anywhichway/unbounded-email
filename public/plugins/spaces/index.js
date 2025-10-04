// index.js - Global event handlers

window.onClickCycleTheme = function() {
    if (window.cycleTheme) window.cycleTheme();
};

window.onChangeSettingsPttEnabled = function() {
    const checkbox = document.getElementById('settingsPttEnabledCheckbox');
    const container = document.getElementById('pttHotkeySettingsContainer');
    if (container) container.classList.toggle('hidden', !checkbox.checked);
};

window.onClickSettingsPttKey = function() {
    if (window.isCapturingPttKey) return;
    window.isCapturingPttKey = true;
    const btn = document.getElementById('settingsPttKeyBtn');
    const instructions = document.getElementById('pttKeyInstructions');
    if (btn) btn.classList.add('hidden');
    if(instructions) instructions.classList.remove('hidden');
    document.addEventListener('keydown', window.handlePttKeyCapture, true);
};

window.onClickSettingsSave = function() {
    if (window.onClickSettingsSave) window.onClickSettingsSave();
};

window.onInputSettingsGlobalVolume = function() {
    const slider = document.getElementById('settingsGlobalVolumeSlider');
    const volume = parseFloat(slider.value);
    const valueSpan = document.getElementById('globalVolumeValue');
    if (valueSpan) valueSpan.textContent = `${Math.round(volume * 100)}%`;
    if (window.mediaModuleRef && window.mediaModuleRef.setGlobalVolume) {
        window.mediaModuleRef.setGlobalVolume(volume, true);
    }
};

window.onClickSidebarButton = function(button) {
    if (window.onClickSidebarButton) window.onClickSidebarButton(button);
};

window.onClickExportWorkspace = function() {
    if (window.onClickExportWorkspace) window.onClickExportWorkspace();
};

window.onClickImportWorkspace = function() {
    const picker = document.getElementById('importFilePicker');
    if(picker) picker.click();
};

window.onChangeImportFilePicker = function(event) {
    if (window.onChangeImportFilePicker) window.onChangeImportFilePicker(event);
};

window.onClickCreatePartyBtn = function() {
    const joinFields = document.getElementById('joinWorkspaceFields');
    if(joinFields) joinFields.classList.add('hidden');
    const createFields = document.getElementById('createWorkspaceFields');
    if(createFields) createFields.classList.remove('hidden');
    const passwordInput = document.getElementById('roomPasswordInput');
    if(passwordInput) passwordInput.focus();
};

window.onClickJoinWorkspaceBtn = function() {
    const createFields = document.getElementById('createWorkspaceFields');
    if(createFields) createFields.classList.add('hidden');
    const joinFields = document.getElementById('joinWorkspaceFields');
    if(joinFields) joinFields.classList.remove('hidden');
    const roomInput = document.getElementById('roomIdInput');
    if(roomInput) roomInput.focus();
};

window.onClickConfirmCreateBtn = function() {
    window.isHost = true;
    if (window.joinRoomAndSetup) window.joinRoomAndSetup();
};

window.onClickConfirmJoinBtn = function() {
    window.isHost = false;
    if (window.joinRoomAndSetup) window.joinRoomAndSetup();
};

window.onClickCancelCreateBtn = function() {
    const createFields = document.getElementById('createWorkspaceFields');
    if(createFields) createFields.classList.add('hidden');
    const passwordInput = document.getElementById('roomPasswordInput');
    if(passwordInput) passwordInput.value = '';
};

window.onClickCancelJoinBtn = function() {
    const joinFields = document.getElementById('joinWorkspaceFields');
    if(joinFields) joinFields.classList.add('hidden');
    const roomInput = document.getElementById('roomIdInput');
    if(roomInput) roomInput.value = '';
    const passwordInput = document.getElementById('joinPasswordInput');
    if(passwordInput) passwordInput.value = '';
};

window.onClickCopyRoomCodeBtn = function() {
    const btn = document.getElementById('copyRoomCodeBtn');
    if(window.currentRoomId && btn){
        navigator.clipboard.writeText(window.currentRoomId).then(() => {
            btn.textContent = '✅';
            btn.title = 'Copied!';
            setTimeout(() => {
                btn.textContent = '📋';
                btn.title = 'Copy Room Code';
            }, 1500);
        }).catch(err => {
            if (window.logStatus) window.logStatus('Failed to copy room code.', true);
            console.error('Failed to copy room code:', err);
        });
    }
};
