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
                    
                    // Helper function to get all contacts from user.accounts
                    const getAllContacts = () => {
                        return Object.values(appState.user.accounts).flatMap(account => account.contacts || []);
                    };
                    
                    if (accountEmail) {
                        // For account folders, count contacts from that specific account
                        const account = appState.user.accounts[accountEmail];
                        count = account ? (account.contacts || []).length : 0;
                    } else if (tagName) {
                        // For tag folders, count contacts with that tag
                        // If an account is currently selected, only count from that account
                        let contactsToCheck = appState.currentAccount ? 
                            (appState.user.accounts[appState.currentAccount]?.contacts || []) : 
                            getAllContacts();
                        count = contactsToCheck.filter(c => c.tags && c.tags.includes(tagName)).length;
                    } else if (folder.name === "All Contacts") {
                        // For "All Contacts", show total count of all contacts
                        count = getAllContacts().length;
                    } else if (folder.name === "Categories") {
                        // Count unique tags from contacts (respecting account filter if active)
                        let contactsToCheck = appState.currentAccount ? 
                            (appState.user.accounts[appState.currentAccount]?.contacts || []) : 
                            getAllContacts();
                        const uniqueTags = new Set(contactsToCheck.flatMap(c => c.tags || []));
                        count = uniqueTags.size;
                    } else if (folder.name === "Starred") {
                        // Count starred contacts (respecting account filter if active)
                        let contactsToCheck = appState.currentAccount ? 
                            (appState.user.accounts[appState.currentAccount]?.contacts || []) : 
                            getAllContacts();
                        count = contactsToCheck.filter(c => c.starred).length;
                    } else if (folder.name === "Frequently Contacted") {
                        // Count frequently contacted (respecting account filter if active)
                        let contactsToCheck = appState.currentAccount ? 
                            (appState.user.accounts[appState.currentAccount]?.contacts || []) : 
                            getAllContacts();
                        count = contactsToCheck.filter(c => c.frequentlyContacted).length;
                    } else if (folder.name === "Scheduled") {
                        // Count scheduled contacts (respecting account filter if active)
                        let contactsToCheck = appState.currentAccount ? 
                            (appState.user.accounts[appState.currentAccount]?.contacts || []) : 
                            getAllContacts();
                        count = contactsToCheck.filter(c => c.scheduled).length;
                    }
                    
                    const result = count > 0 ? count.toString() : "";
                    
                    return result;
                }]
            }
        ]
    });
};

// Make FolderItem globally available
window.FolderItem = FolderItem;
