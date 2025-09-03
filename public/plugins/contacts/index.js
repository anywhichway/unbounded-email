async function getContactsFromAccounts(userData) {
        const contacts = [];
        
        if (userData && userData.accounts) {
            const accounts = await lvIFrame.local(userData.accounts);
            
            // Iterate through each account
            Object.keys(accounts).forEach(accountEmail => {
                const account = accounts[accountEmail];
                const accountContacts = account.contacts;
                // Add contacts from the account's contacts array
                if (account.contacts && Array.isArray(account.contacts)) {
                    account.contacts.forEach(contact => {
                        contact.screenName ||= contact.emai;
                        contact.accountType = account.type;
                        contact.sourceAccount = accountEmail;
                        contacts.push(contact);
                    });
                }
            });
        }
        
        return contacts;
    }

const createFolderItem = (folder, isSubfolder = false, accountEmail = null, tagName = null) => {
    const folderItem = {
        "tagName": "div",
        "attributes": {
            "class": isSubfolder ? "folder-item subfolder" : "folder-item"
        },
        "children": [
            {
                "tagName": "i",
                "attributes": {
                    "class": folder.icon || "fas fa-folder"
                }
            },
            {
                "tagName": "span",
                "children": [folder.name]
            },
            {
                "tagName": "span",
                "attributes": {
                    "class": "folder-count"
                },
                "children": [folder.count > 0 ? folder.count.toString() : ""]
            }
        ]
    };

    // Add data attributes for dynamic count updates
    folderItem.attributes['data-account'] = accountEmail || '';
    folderItem.attributes['data-folder'] = (folder.name && !tagName) ? folder.name : '';
    folderItem.attributes['data-category'] = tagName || '';

    // Add ID for visual selection
    if (isSubfolder && accountEmail) {
        folderItem.attributes.id = `account-${accountEmail.replace('@', '-at-')}`;
    } else if (folder.name && !tagName) {
        folderItem.attributes.id = `folder-${folder.name}`;
    } else if (tagName) {
        folderItem.attributes.id = `category-${tagName}`;
    }

    if (tagName) {
        folderItem.attributes.onclick = `filterContactsByTag('${folder.originalTag || tagName}')`;
    } else if (accountEmail) {
        folderItem.attributes.onclick = `filterContactsByAccount('${accountEmail}')`;
    } else {
        folderItem.attributes.onclick = `filterContactsByFolder('${folder.name}')`;
    }
    
    return folderItem;
}