function getContactsFromAccounts(userData) {
    const contacts = [];
    
    if (userData && userData.accounts) {
        // Iterate through each account
        Object.keys(userData.accounts).forEach(accountEmail => {
            const account = userData.accounts[accountEmail];
            
            // Add contacts from the account's contacts array
            if (account.contacts && Array.isArray(account.contacts)) {
                account.contacts.forEach(contact => {
                    // Normalize the original contact object in place
                    contact.screenName ||= contact.email;
                    contact.phone ||= contact.phone || '';
                    contact.address ||= '';
                    contact.accountType ||= account.type || 'unknown';
                    contact.sourceAccount ||= accountEmail;
                    contact.starred ||= false;
                    contact.frequentlyContacted ||= false;
                    contact.scheduled ||= false;
                    contact.scheduledDate ||= null;
                    contact.editingSchedule ||= false;
                    contact.tags ||= [];
                    contacts.push(contact);
                });
            }
        });
    }
    
    return contacts;
}
