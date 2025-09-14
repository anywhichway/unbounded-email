const Emails = async (state, folderData) => {
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
                            const parts = ["Email"];
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
                            // Use the getter which computes filtered emails
                            const count = state.filteredEmails.length;
                            return `${count} email${count !== 1 ? 's' : ''}`;
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

                            // Get all unique tags from current emails
                            const allTags = new Set();
                            state.emails.forEach(email => {
                                if (email.tags) {
                                    email.tags.forEach(tag => allTags.add(tag));
                                }
                            });
                            const tags = Array.from(allTags).sort();

                            const folderItems = await Promise.all([
                                // Inbox folder
                                FolderItem({ folder: { name: "Inbox", icon: "fas fa-inbox" }, isSubfolder: false, accountEmail: null, tagName: null, appState: state }),
                                // Inbox subfolders (accounts)
                                ...(accountEmails.length > 0 ? await Promise.all(accountEmails.map(email =>
                                    FolderItem({ folder: { email: email, name: email, icon: "fas fa-envelope" }, isSubfolder: true, accountEmail: email, tagName: null, appState: state })
                                )) : []),
                                // Other standard email folders
                                FolderItem({ folder: { name: "Starred", icon: "fas fa-star" }, isSubfolder: false, accountEmail: null, tagName: null, appState: state }),
                                FolderItem({ folder: { name: "Snoozed", icon: "fas fa-clock" }, isSubfolder: false, accountEmail: null, tagName: null, appState: state }),
                                FolderItem({ folder: { name: "Scheduled", icon: "fas fa-calendar-alt" }, isSubfolder: false, accountEmail: null, tagName: null, appState: state }),
                                FolderItem({ folder: { name: "Drafts", icon: "fas fa-edit" }, isSubfolder: false, accountEmail: null, tagName: null, appState: state }),
                                FolderItem({ folder: { name: "Sent", icon: "fas fa-paper-plane" }, isSubfolder: false, accountEmail: null, tagName: null, appState: state }),
                                FolderItem({ folder: { name: "Spam", icon: "fas fa-exclamation-triangle" }, isSubfolder: false, accountEmail: null, tagName: null, appState: state }),
                                FolderItem({ folder: { name: "Trash", icon: "fas fa-trash" }, isSubfolder: false, accountEmail: null, tagName: null, appState: state }),
                                // Categories folder
                                FolderItem({ folder: { name: "Categories", icon: "fas fa-tags" }, isSubfolder: false, accountEmail: null, tagName: null, appState: state }),
                                // Categories subfolders (tags)
                                ...(tags.length > 0 ? await Promise.all(tags.map(tag =>
                                    FolderItem({ folder: { name: tag.charAt(1).toUpperCase() + tag.slice(2), originalTag: tag, icon: state.tagIcons[tag] || "fas fa-tag" }, isSubfolder: true, accountEmail: null, tagName: tag, appState: state })
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
            }
        ]
    });
};