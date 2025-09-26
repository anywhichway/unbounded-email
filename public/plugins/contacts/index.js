// Function to get all contacts as references (no flattening or copying)
// This returns original contact objects from user.accounts to maintain reactivity
function getAllContacts(user) {
    // flatMap is used here to flatten the nested structure:
    // user.accounts is an object with account emails as keys, each containing a contacts array
    // We need to flatten all contacts into a single array for UI rendering and filtering
    // But we return REFERENCES to the original objects, not copies, to preserve reactivity
    // Modified to include accountEmail for accurate filtering
    return Object.entries(user.accounts).flatMap(([accountEmail, account]) => 
        (account.contacts || []).map(contact => ({ contact, accountEmail }))
    );
}

// Function to compute filtered contacts reactively (no copies)
function updateFilteredContacts(appState) {
    const user = appState.user;
    const allContacts = getAllContacts(user);
    appState.filteredContacts = allContacts.filter(({ contact, accountEmail }) => {
        // First filter by account if one is selected
        if (appState.currentAccount && accountEmail !== appState.currentAccount) {
            return false;
        }
        
        // Then apply additional filters based on current selection
        if (appState.currentTag) {
            return contact.tags && contact.tags.includes(appState.currentTag);
        } else if (appState.currentFolder) {
            const lowerCaseFolder = appState.currentFolder.toLowerCase();
            switch (lowerCaseFolder) {
                case 'starred':
                    return contact.starred;
                case 'frequently contacted':
                    return contact.frequentlyContacted;
                case 'scheduled':
                    return contact.scheduled;
                default:
                    return true;
            }
        }
        
        return true;
    }).map(({ contact }) => contact); // Extract just the contact for appState.filteredContacts
}


const getContactsCount = ({ folder, accountEmail, tagName, state }) => {
    let count = 0;
    const getAllContacts = () => Object.values(state.user.accounts).flatMap(account => account.contacts || []);
    
    if (accountEmail) {
        const account = state.user.accounts[accountEmail];
        count = account ? (account.contacts || []).length : 0;
    } else if (tagName) {
        let contactsToCheck = state.currentAccount ? (state.user.accounts[state.currentAccount]?.contacts || []) : getAllContacts();
        count = contactsToCheck.filter(c => c.tags && c.tags.includes(tagName)).length;
    } else if (folder.name === "All Contacts") {
        count = getAllContacts().length;
    } else if (folder.name === "Categories") {
        let contactsToCheck = state.currentAccount ? (state.user.accounts[state.currentAccount]?.contacts || []) : getAllContacts();
        const uniqueTags = new Set(contactsToCheck.flatMap(c => c.tags || []));
        count = uniqueTags.size;
    } else if (folder.name === "Starred") {
        let contactsToCheck = state.currentAccount ? (state.user.accounts[state.currentAccount]?.contacts || []) : getAllContacts();
        count = contactsToCheck.filter(c => c.starred).length;
    } else if (folder.name === "Frequently Contacted") {
        let contactsToCheck = state.currentAccount ? (state.user.accounts[state.currentAccount]?.contacts || []) : getAllContacts();
        count = contactsToCheck.filter(c => c.frequentlyContacted).length;
    } else if (folder.name === "Scheduled") {
        let contactsToCheck = state.currentAccount ? (state.user.accounts[state.currentAccount]?.contacts || []) : getAllContacts();
        count = contactsToCheck.filter(c => c.scheduled).length;
    }
    return count;
};

const tagToName = (tag) => {
    return tag.charAt(1).toUpperCase() + tag.slice(2);
}

