const Emails = async (state) => {
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
                            const parts = [state.currentTag || state.currentFolder ? tagToName(state.currentTag || state.currentFolder,!!state.currentTag) : "Inbox"];
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
                                    // Use the getter which computes filtered emails
                                    const count = state.filteredEmails.length;
                                    return `${count} email${count !== 1 ? 's' : ''}`;
                                }]
                            },
                            {
                                tagName: "button",
                                attributes: {
                                    class: "plugin-compose-btn",
                                    title: "Add New Email",
                                    onclick: () => {
                                        state.editingEmail = {}; // Initialize for adding a new email
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

                            // Get all unique tags from current emails
                            const allTags = new Set();
                            state.emails.forEach(email => {
                                if (email.tags) {
                                    email.tags.forEach(tag => allTags.add(tag));
                                }
                            });
                            const tags = Array.from(allTags).sort();

                            // Check for dynamic folders based on email properties
                            const hasStarred = state.emails.some(e => e.starred);
                            const hasSnoozed = state.emails.some(e => e.snoozed);
                            const hasScheduled = state.emails.some(e => e.scheduled);

                            // Categories subfolders (tags and dynamic property-based folders)
                            const categorySubfolders = [
                                ...(tags.length > 0 ? tags.map(tag => ({
                                    name: tag.charAt(1).toUpperCase() + tag.slice(2),
                                    tagName: tag,
                                    icon: state.tagIcons[tag] || "fas fa-tag"
                                })) : []),
                                ...(hasStarred ? [{ name: "Starred", tagName: "starred", icon: "fas fa-star" }] : []),
                                ...(hasSnoozed ? [{ name: "Snoozed", tagName: "snoozed", icon: "fas fa-clock" }] : []),
                                ...(hasScheduled ? [{ name: "Scheduled", tagName: "scheduled", icon: "fas fa-calendar-alt" }] : [])
                            ];

                            const folderItems = await Promise.all([
                                // Inbox folder
                                FolderItem({ folder: { name: "Inbox", icon: "fas fa-inbox" }, isSubfolder: false, accountEmail: null, tagName: null,  state }),
                                // Inbox subfolders (accounts)
                                ...(accountEmails.length > 0 ? await Promise.all(accountEmails.map(email =>
                                    FolderItem({ folder: { email: email, name: email, icon: state.getAccountIconClass(email) }, isSubfolder: true, accountEmail: email, tagName: null,  state })
                                )) : []),
                                // Other standard email folders
                                FolderItem({ folder: { name: "Drafts", icon: "fas fa-edit" }, isSubfolder: false, accountEmail: null, tagName: null,  state }),
                                FolderItem({ folder: { name: "Sent", icon: "fas fa-paper-plane" }, isSubfolder: false, accountEmail: null, tagName: null,  state }),
                                FolderItem({ folder: { name: "Spam", icon: "fas fa-exclamation-triangle" }, isSubfolder: false, accountEmail: null, tagName: null,  state }),
                                FolderItem({ folder: { name: "Trash", icon: "fas fa-trash" }, isSubfolder: false, accountEmail: null, tagName: null,  state }),
                                // Categories folder
                                FolderItem({ folder: { name: "Categories", icon: "fas fa-tags" }, isSubfolder: false, accountEmail: null, tagName: null,  state }),
                                // Categories subfolders
                                ...(categorySubfolders.length > 0 ? await Promise.all(categorySubfolders.map(item =>
                                    FolderItem({ folder: { name: item.name, icon: item.icon }, isSubfolder: true, accountEmail: null, tagName: item.tagName,  state })
                                )) : [])
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
                                    class: "email-list"
                                },
                                async children() {
                                    // Use the getter which computes filtered emails
                                    const filteredEmails = state.filteredEmails;

                                    if (filteredEmails.length > 0) {
                                        return await Promise.all(filteredEmails.map(email => Email(email, state)));
                                    } else {
                                        return [{
                                            tagName: "div",
                                            attributes: {
                                                class: "no-emails"
                                            },
                                            children: ["No emails found"]
                                        }];
                                    }
                                }
                            }
                        ]
                    }
                ]
            },
            () => {
                if (!state.editingEmail) return null;
                return Compose(state);
            },
            () => {
                if (!state.maximizedEmail) return null;

                return {
                    tagName: "div",
                    attributes: {
                        class: "modal-overlay",
                        style: "display: flex; align-items: center; justify-content: center;",
                        onclick(event) {
                            if (event.target.classList.contains('modal-overlay')) {
                                state.closeMaximized();
                            }
                        }
                    },
                    children: [
                        {
                            tagName: "div",
                            attributes: {
                                class: "modal-content email-maximized-modal"
                            },
                            async children() {
                                return [await Email(state.maximizedEmail, state, { isMaximized: true })];
                            }
                        }
                    ]
                };
            }
        ]
    });
};