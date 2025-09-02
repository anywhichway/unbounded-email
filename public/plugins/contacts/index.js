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
                        contact.screenName ||= contact.email,
                        contact.accountType = account.type,
                        contact.sourceAccount = accountEmail
                        contacts.push(contact);
                    });
                }
            });
        }
        
        return contacts;
    }

const createFolderItem = (folder, isSubfolder = false, accountEmail = null) => {
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
    };        if (accountEmail) {
            folderItem.attributes.onclick = `filterContactsByAccount('${accountEmail}')`;
        } else {
            folderItem.attributes.onclick = `filterContactsByFolder('${folder.name}')`;
        }
        
        return folderItem;
    }