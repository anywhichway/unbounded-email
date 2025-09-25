const Contacts = async (appState) => {
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
                            const parts = ["Contacts"];
                            if (appState.currentAccount) {
                                parts.push(" - ");
                                parts.push({
                                    tagName: 'a',
                                    attributes: {
                                        href: '#',
                                        onclick(event) {
                                            event.preventDefault();
                                            navigate('../account/index.html?account=' + encodeURIComponent(appState.currentAccount), window.location.href);
                                        }
                                    },
                                    children: [appState.currentAccount]
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
                                    const count = appState.filteredContacts.length;
                                    return `${count} contact${count !== 1 ? 's' : ''}`;
                                }]
                            },
                            {
                                tagName: "button",
                                attributes: {
                                    class: "plugin-compose-btn",
                                    title: "Add New Contact",
                                    onclick: () => {
                                        appState.editingContact = {}; // Initialize for adding a new contact
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
                            // Generate folder items dynamically based on current appState
                            const accountEmails = Object.keys(appState.user?.accounts || {}).filter(key => !key.startsWith('_'));
                            
                            // Get all unique tags from current filtered contacts
                            const allTags = new Set();
                            appState.filteredContacts.forEach(contact => {
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
                                FolderItem({ folder: { name: "All Contacts", icon: "fas fa-users" }, isSubfolder: false, accountEmail: null, tagName: null, appState }),
                                // All Contacts subfolders (accounts)
                                ...(accountEmails.length > 0 ? await Promise.all(accountEmails.map(email =>
                                    FolderItem({ folder: { email: email, name: email, icon: appState.getAccountIconClass(email) }, isSubfolder: true, accountEmail: email, tagName: null, appState: appState })
                                )) : []),
                                // Categories folder
                                FolderItem({ folder: { name: "Categories", icon: "fas fa-tags" }, isSubfolder: false, accountEmail: null, tagName: null, appState }),
                                // Categories subfolders (tags)
                                ...(tags.length > 0 ? await Promise.all(tags.map(tag =>
                                    FolderItem({ folder: { name: tag.charAt(1).toUpperCase() + tag.slice(2), originalTag: tag, icon: appState.tagIcons[tag] || "fas fa-tag" }, isSubfolder: true, accountEmail: null, tagName: tag, appState })
                                )) : []),
                                // Dynamic categories (only if relevant tags exist)
                                ...(hasSnoozed ? [FolderItem({ folder: { name: "Snoozed Emails", icon: "fas fa-clock" }, isSubfolder: false, accountEmail: null, tagName: "#snoozed", appState })] : []),
                                ...(hasScheduled ? [FolderItem({ folder: { name: "Scheduled Emails", icon: "fas fa-calendar-alt" }, isSubfolder: false, accountEmail: null, tagName: "#scheduled", appState })] : []),
                                ...(hasContactReachout ? [FolderItem({ folder: { name: "Contact Reachout", icon: "fas fa-user-friends" }, isSubfolder: false, accountEmail: null, tagName: "#contact-reachout", appState })] : [])
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
                                    const filteredContacts = appState.filteredContacts;
                                    
                                    if (filteredContacts.length > 0) {
                                        return await Promise.all(filteredContacts.map(contact => Contact(contact, appState)));
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
            EditContactDialog(appState)
        ]
    });
};

// Edit Contact Dialog Component
function EditContactDialog(appState) {
    // Always render but hidden by CSS by default
    // Use first filtered contact as default or create empty contact object
    const contact = (appState && appState.filteredContacts && appState.filteredContacts.length > 0) 
        ? appState.filteredContacts[0] 
        : {
            avatar: '',
            screenName: '',
            phone: '',
            email: '',
            address: '',
            notes: '',
            tags: []
        };
    
    return render({
        tagName: "div",
        attributes: {
            class: "dialog-overlay",
            onclick(event) {
                // Only close if clicking directly on the overlay (not on the modal)
                if (event.target.classList.contains('dialog-overlay')) {
                    event.currentTarget.style.display = 'none';
                }
            }
        },
        children: [
            {
                tagName: "div",
                attributes: {
                    class: "dialog-modal"
                },
                children: [
                    {
                        tagName: "div",
                        attributes: {
                            class: "dialog-header"
                        },
                        children: [
                            {
                                tagName: "h2",
                                children: ["Edit Contact"]
                            },
                            {
                                tagName: "button",
                                attributes: {
                                    class: "dialog-close",
                                    onclick() {
                                        event.currentTarget.closest('.dialog-overlay').style.display = 'none';
                                    }
                                },
                                children: ["×"]
                            }
                        ]
                    },
                    {
                        tagName: "div",
                        attributes: {
                            class: "dialog-body"
                        },
                        children: [
                            {
                                tagName: "div",
                                attributes: {
                                    class: "form-group"
                                },
                                children: [
                                    {
                                        tagName: "label",
                                        attributes: {
                                            for: "dialog-avatar"
                                        },
                                        children: ["Avatar URL:"]
                                    },
                                    {
                                        tagName: "input",
                                        attributes: {
                                            id: "dialog-avatar",
                                            type: "text",
                                            class: "form-input",
                                            value: contact.avatar || "",
                                            placeholder: "https://example.com/avatar.jpg"
                                        }
                                    }
                                ]
                            },
                            {
                                tagName: "div",
                                attributes: {
                                    class: "form-group"
                                },
                                children: [
                                    {
                                        tagName: "label",
                                        attributes: {
                                            for: "dialog-name"
                                        },
                                        children: ["Name:"]
                                    },
                                    {
                                        tagName: "input",
                                        attributes: {
                                            id: "dialog-name",
                                            type: "text",
                                            class: "form-input",
                                            value: contact.screenName || ""
                                        }
                                    }
                                ]
                            },
                            {
                                tagName: "div",
                                attributes: {
                                    class: "form-group"
                                },
                                children: [
                                    {
                                        tagName: "label",
                                        attributes: {
                                            for: "dialog-phone"
                                        },
                                        children: ["Phone:"]
                                    },
                                    {
                                        tagName: "input",
                                        attributes: {
                                            id: "dialog-phone",
                                            type: "tel",
                                            class: "form-input",
                                            value: contact.phone || ""
                                        }
                                    }
                                ]
                            },
                            {
                                tagName: "div",
                                attributes: {
                                    class: "form-group"
                                },
                                children: [
                                    {
                                        tagName: "label",
                                        attributes: {
                                            for: "dialog-email"
                                        },
                                        children: ["Email:"]
                                    },
                                    {
                                        tagName: "input",
                                        attributes: {
                                            id: "dialog-email",
                                            type: "email",
                                            class: "form-input",
                                            value: contact.email || ""
                                        }
                                    }
                                ]
                            },
                            {
                                tagName: "div",
                                attributes: {
                                    class: "form-group"
                                },
                                children: [
                                    {
                                        tagName: "label",
                                        attributes: {
                                            for: "dialog-address"
                                        },
                                        children: ["Address:"]
                                    },
                                    {
                                        tagName: "textarea",
                                        attributes: {
                                            id: "dialog-address",
                                            class: "form-textarea",
                                            rows: "3",
                                            value: contact.address || ""
                                        }
                                    }
                                ]
                            },
                            {
                                tagName: "div",
                                attributes: {
                                    class: "form-group"
                                },
                                children: [
                                    {
                                        tagName: "label",
                                        attributes: {
                                            for: "dialog-notes"
                                        },
                                        children: ["Notes:"]
                                    },
                                    {
                                        tagName: "textarea",
                                        attributes: {
                                            id: "dialog-notes",
                                            class: "form-textarea",
                                            rows: "3",
                                            value: contact.notes || ""
                                        }
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        tagName: "div",
                        attributes: {
                            class: "dialog-footer"
                        },
                        children: [
                            {
                                tagName: "button",
                                attributes: {
                                    class: "btn-cancel",
                                    onclick() {
                                        event.currentTarget.closest('.dialog-overlay').style.display = 'none';
                                    }
                                },
                                children: ["Cancel"]
                            },
                            {
                                tagName: "button",
                                attributes: {
                                    class: "btn-save",
                                    onclick() {
                                        const dialog = event.currentTarget.closest('.dialog-overlay');
                                        const contact = dialog._currentContact;
                                        const appState = dialog._appState;
                                        
                                        if (contact && appState) {
                                            saveContactEdits(dialog, contact, appState);
                                            dialog.style.display = 'none';
                                        }
                                    }
                                },
                                children: ["Save"]
                            }
                        ]
                    }
                ]
            }
        ]
    });
}

// Function to save contact edits from dialog (procedural approach)
function saveContactEdits(dialog, contact, appState) {
    // Get the form values from the dialog
    const avatarInput = dialog.querySelector('#dialog-avatar');
    const nameInput = dialog.querySelector('#dialog-name');
    const phoneInput = dialog.querySelector('#dialog-phone');
    const emailInput = dialog.querySelector('#dialog-email');
    const addressInput = dialog.querySelector('#dialog-address');
    const notesInput = dialog.querySelector('#dialog-notes');
    
    // Update contact properties
    contact.avatar = avatarInput ? avatarInput.value : contact.avatar;
    contact.screenName = nameInput ? nameInput.value : contact.screenName;
    contact.phone = phoneInput ? phoneInput.value : contact.phone;
    contact.email = emailInput ? emailInput.value : contact.email;
    contact.address = addressInput ? addressInput.value : contact.address;
    contact.notes = notesInput ? notesInput.value : contact.notes;
    
    // Since contact is now a reference to the original object in user.accounts,
    // changes here will automatically propagate back to the parent window via reactivity
    // No need to manually update appState.contacts
    
    console.log(`Contact ${contact.email} updated`);
}
