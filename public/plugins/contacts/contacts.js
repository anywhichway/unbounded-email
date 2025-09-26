const Contacts = async (state) => {
    return render({
        tagName: "div",
        attributes: {
            class: "plugin-wrapper"
        },
        children: [
            {
                tagName: "div",
                attributes: {
                    class: "plugin-header"
                },
                children: [
                    {
                        tagName: "h1",
                        children() {
                            const parts = [state.currentTag ? tagToName(state.currentTag) : "Contacts"];
                            if (state.currentAccount) {
                                parts.push(" - ");
                                parts.push({
                                    tagName: 'a',
                                    attributes: {
                                        href: '#',
                                        onclick(event) {
                                            event.preventDefault();
                                            navigate('../account/index.html?account=' + encodeURIComponent(state.currentAccount), window.location.href);
                                        }
                                    },
                                    children: [state.currentAccount]
                                });
                            }
                            return parts;
                        }
                    },
                    {
                        tagName: "div",
                        attributes: {
                            class: "plugin-header-controls"
                        },
                        children: [
                            {
                                tagName: "span",
                                attributes: {
                                    class: "plugin-count"
                                },
                                children: [() => {
                                    const count = state.filteredContacts.length;
                                    return `${count} contact${count !== 1 ? 's' : ''}`;
                                }]
                            },
                            {
                                tagName: "button",
                                attributes: {
                                    class: "plugin-compose-btn",
                                    title: "Add New Contact",
                                    onclick: () => {
                                        state.editingContact = {}; // Initialize for adding a new contact
                                    }
                                },
                                children: [
                                    {
                                        tagName: "i",
                                        attributes: {
                                            class: "fas fa-plus"
                                        }
                                    }
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                tagName: "div",
                attributes: {
                    class: "plugin-container"
                },
                children: [
                    {
                        tagName: "div",
                        attributes: {
                            class: "plugin-sidebar"
                        },
                        async children() {
                            // Generate folder items dynamically based on current state
                            const accountEmails = Object.keys(state.user?.accounts || {}).filter(key => !key.startsWith('_'));
                            
                            // Get all unique tags from ALL contacts, not just the filtered ones
                            const allContacts = Object.values(state.user.accounts).flatMap(account => account.contacts || []);
                            const allTags = new Set();
                            allContacts.forEach(contact => {
                                if (contact.tags) {
                                    contact.tags.forEach(tag => allTags.add(tag));
                                }
                            });
                            const tags = Array.from(allTags).sort();
                            
                            // Check for dynamic categories based on tags
                            const hasSnoozed = tags.includes('#snoozed');
                            const hasScheduled = tags.includes('#scheduled');
                            const hasContactReachout = tags.includes('#contact-reachout');
                            
                            const folderItems = await Promise.all([
                                // All Contacts folder
                                FolderItem({ folder: { name: "All Contacts", icon: "fas fa-users" }, isSubfolder: false, accountEmail: null, tagName: null, state }),
                                // All Contacts subfolders (accounts)
                                ...(accountEmails.length > 0 ? await Promise.all(accountEmails.map(email =>
                                    FolderItem({ folder: { email: email, name: email, icon: state.getAccountIconClass(email) }, isSubfolder: true, accountEmail: email, tagName: null, state })
                                )) : []),
                                // Categories folder
                                FolderItem({ folder: { name: "Categories", icon: "fas fa-tags" }, isSubfolder: false, accountEmail: null, tagName: null, state }),
                                // Categories subfolders (tags)
                                ...(tags.length > 0 ? await Promise.all(tags.map(tag =>
                                    FolderItem({ folder: { name: tag.charAt(1).toUpperCase() + tag.slice(2), originalTag: tag, icon: state.tagIcons[tag] || "fas fa-tag" }, isSubfolder: true, accountEmail: null, tagName: tag, state })
                                )) : []),
                                // Dynamic categories (only if relevant tags exist)
                                ...(hasSnoozed ? [FolderItem({ folder: { name: "Snoozed Emails", icon: "fas fa-clock" }, isSubfolder: false, accountEmail: null, tagName: "#snoozed", state })] : []),
                                ...(hasScheduled ? [FolderItem({ folder: { name: "Scheduled Emails", icon: "fas fa-calendar-alt" }, isSubfolder: false, accountEmail: null, tagName: "#scheduled", state })] : []),
                                ...(hasContactReachout ? [FolderItem({ folder: { name: "Contact Reachout", icon: "fas fa-user-friends" }, isSubfolder: false, accountEmail: null, tagName: "#contact-reachout", state })] : [])
                            ]);
                            
                            return folderItems;
                        }
                    },
                    {
                        tagName: "div",
                        attributes: {
                            class: "plugin-main"
                        },
                        children: [
                            {
                                tagName: "div",
                                attributes: {
                                    class: "contacts-list"
                                },
                                async children() {
                                    // Use the getter which computes filtered contacts
                                    const filteredContacts = state.filteredContacts;
                                    
                                    if (filteredContacts.length > 0) {
                                        return await Promise.all(filteredContacts.map(contact => Contact(contact, state)));
                                    } else {
                                        return [{
                                            tagName: "div",
                                            attributes: {
                                                class: "no-contacts"
                                            },
                                            children: ["No contacts found"]
                                        }];
                                    }
                                }
                            }
                        ]
                    }
                ]
            },
            // Edit Contact Dialog (always rendered but hidden by default)
            () => {
                if (!state.editingContact) return null;
                return ComposeContact(state);
            }
        ]
    });
};
