function getContactsFromAccounts(userData) {
    const contacts = [];
    
    if (userData && userData.accounts) {
        // Iterate through each account
        Object.keys(userData.accounts).forEach(accountEmail => {
            const account = userData.accounts[accountEmail];
            
            // Add contacts from the account's contacts array
            if (account.contacts && Array.isArray(account.contacts)) {
                account.contacts.forEach(contact => {
                    const normalizedContact = {
                        email: contact.email,
                        screenName: contact.screenName || contact.email,
                        phone: contact.phone || '',
                        address: contact.address || '',
                        accountType: account.type || 'unknown',
                        sourceAccount: accountEmail,
                        starred: contact.starred || false,
                        frequentlyContacted: contact.frequentlyContacted || false,
                        scheduled: contact.scheduled || false,
                        scheduledDate: contact.scheduledDate || null,
                        editingSchedule: false,
                        tags: contact.tags || []
                    };
                    contacts.push(normalizedContact);
                });
            }
        });
    }
    
    return contacts;
}
