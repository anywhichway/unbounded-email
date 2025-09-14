const FolderItem = async (props) => {
    const { folder, isSubfolder = false, accountEmail = null, tagName = null, appState } = props;

    // Add error handling for undefined folder
    if (!folder) {
        console.error('FolderItem: folder is undefined', props);
        return render({
            tagName: "div",
            attributes: { class: "folder-item error" },
            children: ["Error: Invalid folder"]
        });
    }

    return render({
        tagName: "div",
        attributes: {
            class() {
                let classes = isSubfolder ? "folder-item subfolder" : "folder-item";
                if (appState.selectedFolderId === (isSubfolder && accountEmail ? `account-${accountEmail.replace('@', '-at-')}` :
                    (folder && folder.name && !tagName ? `folder-${folder.name}` :
                    (tagName ? `category-${tagName}` : '')))) {
                    classes += " active";
                }
                return classes;
            },
            onclick() {
                if (tagName) {
                    appState.selectFolder('tag', folder.originalTag || tagName);
                } else if (accountEmail) {
                    appState.selectFolder('account', accountEmail);
                } else {
                    appState.selectFolder('folder', folder.name);
                }
            }
        },
        children: [
            {
                tagName: "i",
                attributes: {
                    class: (folder && folder.icon) || "fas fa-folder"
                }
            },
            {
                tagName: "span",
                attributes: {
                    class: "folder-name"
                },
                children: [(folder && folder.name) || "Unknown"]
            },
            {
                tagName: "span",
                attributes: {
                    class: "folder-count"
                },
                children: [() => {
                    let count = 0;

                    if (accountEmail) {
                        // For account folders (subfolders under Inbox), count inbox emails from that specific account
                        count = appState.emails.filter(e => e.sourceAccount === accountEmail && e.folder === 'Inbox').length;
                    } else if (tagName) {
                        // For tag folders, count emails with that tag
                        // If an account is currently selected, only count from that account
                        let emailsToCheck = appState.currentAccount ?
                            appState.emails.filter(e => e.sourceAccount === appState.currentAccount) :
                            appState.emails;
                        count = emailsToCheck.filter(e => e.tags && e.tags.includes(tagName)).length;
                    } else if (folder.name === "Inbox") {
                        // For Inbox, show total count of emails in inbox
                        let emailsToCheck = appState.currentAccount ?
                            appState.emails.filter(e => e.sourceAccount === appState.currentAccount) :
                            appState.emails;
                        count = emailsToCheck.filter(e => e.folder === 'Inbox').length;
                    } else if (folder.name === "Categories") {
                        // Count unique tags from emails (respecting account filter if active)
                        let emailsToCheck = appState.currentAccount ?
                            appState.emails.filter(e => e.sourceAccount === appState.currentAccount) :
                            appState.emails;
                        const uniqueTags = new Set(emailsToCheck.flatMap(e => e.tags || []));
                        count = uniqueTags.size;
                    } else if (folder.name === "Starred") {
                        // Count starred emails (respecting account filter if active)
                        let emailsToCheck = appState.currentAccount ?
                            appState.emails.filter(e => e.sourceAccount === appState.currentAccount) :
                            appState.emails;
                        count = emailsToCheck.filter(e => e.starred).length;
                    } else if (folder.name === "Snoozed") {
                        // Count snoozed emails (respecting account filter if active)
                        let emailsToCheck = appState.currentAccount ?
                            appState.emails.filter(e => e.sourceAccount === appState.currentAccount) :
                            appState.emails;
                        count = emailsToCheck.filter(e => e.snoozed).length;
                    } else if (folder.name === "Scheduled") {
                        // Count scheduled emails (respecting account filter if active)
                        let emailsToCheck = appState.currentAccount ?
                            appState.emails.filter(e => e.sourceAccount === appState.currentAccount) :
                            appState.emails;
                        count = emailsToCheck.filter(e => e.scheduled).length;
                    } else {
                        // For other folders like Drafts, Sent, Spam, Trash
                        let emailsToCheck = appState.currentAccount ?
                            appState.emails.filter(e => e.sourceAccount === appState.currentAccount) :
                            appState.emails;
                        count = emailsToCheck.filter(e => e.folder === folder.name).length;
                    }

                    return count.toString();
                }]
            }
        ]
    });
};