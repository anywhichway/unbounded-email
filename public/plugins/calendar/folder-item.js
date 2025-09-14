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
                        // For account folders, count events from that specific account
                        count = appState.events.filter(e => e.sourceAccount === accountEmail).length;
                    } else if (tagName) {
                        // For tag folders, count events with that tag
                        let eventsToCheck = appState.currentAccount ?
                            appState.events.filter(e => e.sourceAccount === appState.currentAccount) :
                            appState.events;
                        count = eventsToCheck.filter(e => e.tags && e.tags.includes(tagName)).length;
                    } else if (folder.name === "All Calendars") {
                        // For "All Calendars", show total count of all events
                        count = appState.events.length;
                    }

                    return count;
                }]
            }
        ]
    });
};

// Make FolderItem globally available
window.FolderItem = FolderItem;