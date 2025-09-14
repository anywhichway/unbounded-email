const Contacts = async (state, folderData) => {
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
                        tagName: "span",
                        attributes: {
                            class: "plugin-count"
                        },
                        children: [() => {
                            // Use the getter which computes filtered contacts
                            const count = state.filteredContacts.length;
                            return `${count} contact${count !== 1 ? 's' : ''}`;
                        }]
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
                            const accountEmails = Object.keys(state.user?.accounts || {});
                            
                            // Get all unique tags from current contacts
                            const allTags = new Set();
                            state.contacts.forEach(contact => {
                                if (contact.tags) {
                                    contact.tags.forEach(tag => allTags.add(tag));
                                }
                            });
                            const tags = Array.from(allTags).sort();
                            
                            const folderItems = await Promise.all([
                                // All Contacts folder
                                FolderItem({ folder: { name: "All Contacts", icon: "fas fa-users" }, isSubfolder: false, accountEmail: null, tagName: null, appState: state }),
                                // All Contacts subfolders (accounts)
                                ...(accountEmails.length > 0 ? await Promise.all(accountEmails.map(email =>
                                    FolderItem({ folder: { email: email, name: email, icon: "fas fa-envelope" }, isSubfolder: true, accountEmail: email, tagName: null, appState: state })
                                )) : []),
                                // Categories folder
                                FolderItem({ folder: { name: "Categories", icon: "fas fa-tags" }, isSubfolder: false, accountEmail: null, tagName: null, appState: state }),
                                // Categories subfolders (tags)
                                ...(tags.length > 0 ? await Promise.all(tags.map(tag =>
                                    FolderItem({ folder: { name: tag.charAt(1).toUpperCase() + tag.slice(2), originalTag: tag, icon: state.tagIcons[tag] || "fas fa-tag" }, isSubfolder: true, accountEmail: null, tagName: tag, appState: state })
                                )) : []),
                                // Other folders
                                FolderItem({ folder: { name: "Starred", icon: "fas fa-star" }, isSubfolder: false, accountEmail: null, tagName: null, appState: state }),
                                FolderItem({ folder: { name: "Frequently Contacted", icon: "fas fa-history" }, isSubfolder: false, accountEmail: null, tagName: null, appState: state }),
                                FolderItem({ folder: { name: "Scheduled", icon: "fas fa-clock" }, isSubfolder: false, accountEmail: null, tagName: null, appState: state })
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
            EditContactDialog(state)
        ]
    });
}

// Edit Contact Dialog Component
function EditContactDialog(appState) {
    // Always render but hidden by CSS by default
    // Use first contact as default or create empty contact object
    const contact = (appState && appState.contacts && appState.contacts.length > 0) 
        ? appState.contacts[0] 
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
                                            saveContactEditsProcedural(dialog, contact, appState);
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
function saveContactEditsProcedural(dialog, contact, appState) {
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
    
    // Find and update in appState.contacts
    const contactIndex = appState.contacts.findIndex(c => 
        c.email === contact.email && c.sourceAccount === contact.sourceAccount
    );
    if (contactIndex !== -1) {
        appState.contacts[contactIndex] = { ...contact };
    }
    
    // Trigger re-render
    appState.contacts = [...appState.contacts];
    
    console.log(`Contact ${contact.email} updated`);
}
