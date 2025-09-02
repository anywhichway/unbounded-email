async function getEmailsFromAccounts(userData) {
    const emails = [];
    
    if (userData && userData.accounts) {
        const accounts = userData.accounts;
        
        // Iterate through each account
        Object.keys(accounts).forEach(accountEmail => {
            const account = accounts[accountEmail];
            
            if (account.emails && Array.isArray(account.emails)) {
                account.emails.forEach(email => {
                    email.id ||= Date.now() + Math.random();
                    email.from ||= 'Unknown Sender';
                    email.subject ||= 'No Subject';
                    email.preview ||= email.body?.substring(0, 100) || 'No preview available';
                    email.date ||= new Date().toISOString();
                    email.unread = email.unread !== undefined ? email.unread : true;
                    email.accountType = account.type;
                    email.sourceAccount = accountEmail;
                    emails.push(email);
                });
            }
        });
    }
    
    // Sort emails by date (newest first)
    return emails.sort((a, b) => new Date(b.date) - new Date(a.date));
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
    };

    if (accountEmail) {
        folderItem.attributes.onclick = `filterEmailsByAccount('${accountEmail}')`;
    } else {
        folderItem.attributes.onclick = `filterEmailsByFolder('${folder.name}')`;
    }
    
    return folderItem;
}
