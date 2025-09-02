async function getEventsFromAccounts(userData, displayYear) {
    const events = [];
    
    if (userData && userData.accounts) {
        const accounts = await lvIFrame.local(userData.accounts);
        
        Object.keys(accounts).forEach(accountEmail => {
            const account = accounts[accountEmail];
            
            if (account.calendar && Array.isArray(account.calendar)) {
                account.calendar.forEach(event => {
                    events.push({
                        ...event,
                        sourceAccount: accountEmail,
                        accountType: account.type
                    });
                });
            }

            if (account.contacts && Array.isArray(account.contacts)) {
                account.contacts.forEach(contact => {
                    if (contact.birthdate) {
                        const parts = contact.birthdate.split('-');
                        let birthYear, month, day;

                        if (parts.length === 3) { // yyyy-mm-dd
                            birthYear = parseInt(parts[0], 10);
                            month = parseInt(parts[1], 10);
                            day = parseInt(parts[2], 10);
                        } else if (parts.length === 2) { // mm-dd
                            month = parseInt(parts[0], 10);
                            day = parseInt(parts[1], 10);
                        }

                        if (!isNaN(month) && !isNaN(day)) {
                            if (!birthYear || displayYear >= birthYear) {
                                const birthDateForDisplayYear = new Date(displayYear, month - 1, day);
                                events.push({
                                    title: `${contact.name || contact.screenName}'s Birthday`,
                                    date: birthDateForDisplayYear.toISOString().split('T')[0],
                                    recurring: 'yearly',
                                    category: 'Birthday',
                                    sourceAccount: accountEmail,
                                    accountType: account.type
                                });
                            }
                        }
                    }
                });
            }
        });
    }
    
    return events.sort((a, b) => new Date(a.date) - new Date(b.date));
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
        folderItem.attributes.onclick = `filterEventsByAccount('${accountEmail}')`;
    } else {
        folderItem.attributes.onclick = `filterEventsByFolder('${folder.name}')`;
    }
    
    return folderItem;
}
