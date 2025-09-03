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


const createFolderItem = (folder, isSubfolder = false, accountEmail = null, folderName = null, categoryName = null, currentAccount = null) => {
    // Generate unique ID for this folder item
    let folderId = '';
    if (accountEmail && folderName) {
        folderId = `account-${accountEmail.replace('@', '-at-')}-${folderName}`;
    } else if (categoryName) {
        folderId = `category-${categoryName}`;
    } else if (accountEmail) {
        folderId = `account-${accountEmail.replace('@', '-at-')}`;
    } else {
        if (window.accountEmails && window.accountEmails.includes(folder.name)) {
            folderId = `account-${folder.name.replace('@', '-at-')}`;
        } else {
            folderId = `folder-${folder.name}`;
        }
    }
    
    const folderItem = {
        "tagName": "div",
        "attributes": {
            "class": isSubfolder ? "folder-item subfolder" : "folder-item",
            "id": folderId,
            "data-account": accountEmail || "",
            "data-folder": folderName || "",
            "data-category": categoryName || ""
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
                "children": [folder.count !== undefined ? folder.count.toString() : "0"]
            }
        ]
    };

    // Add selected class if this is the currently selected folder or account
    if (window.selectedFolderId === folderId || (accountEmail && currentAccount === accountEmail)) {
        folderItem.attributes.class += " active";
    }

    if (accountEmail && folderName) {
        folderItem.attributes.onclick = `filterEmailsByAccountFolder('${accountEmail}', '${folderName}')`;
    } else if (categoryName) {
        folderItem.attributes.onclick = `filterEmailsByCategory('${folder.originalTag || categoryName}')`;
    } else if (accountEmail) {
        folderItem.attributes.onclick = `filterEmailsByAccount('${accountEmail}')`;
    } else {
        // top-level
        if (folder.name === 'Categories') {
            // no onclick
        } else if (folder.name === 'Starred') {
            folderItem.attributes.onclick = `filterEmailsByStarred()`;
        } else if (folder.name === 'Snoozed') {
            folderItem.attributes.onclick = `filterEmailsBySnoozed()`;
        } else if (window.accountEmails && window.accountEmails.includes(folder.name)) {
            folderItem.attributes.onclick = `filterEmailsByAccount('${folder.name}')`;
        } else {
            folderItem.attributes.onclick = `filterEmailsByFolder('${folder.name}')`;
        }
    }
    
    return folderItem;
}
