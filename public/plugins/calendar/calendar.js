const Calendar = async (state, folderData, user) => {
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
                            const parts = ["Calendar"];
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
                            class: "calendar-controls"
                        },
                        children: [
                            {
                                tagName: "button",
                                attributes: {
                                    class: "view-toggle",
                                    onclick() {
                                        state.currentView = 'monthly';
                                    }
                                },
                                children: ["Month"]
                            },
                            {
                                tagName: "button",
                                attributes: {
                                    class: "view-toggle",
                                    onclick() {
                                        state.currentView = 'weekly';
                                    }
                                },
                                children: ["Week"]
                            },
                            {
                                tagName: "button",
                                attributes: {
                                    class: "nav-button",
                                    onclick() {
                                        state.navigatePrevious();
                                    }
                                },
                                children: ["◀"]
                            },
                            {
                                tagName: "span",
                                attributes: {
                                    class: "current-period"
                                },
                                children: [() => state.headerTitle]
                            },
                            {
                                tagName: "button",
                                attributes: {
                                    class: "nav-button",
                                    onclick() {
                                        state.navigateNext();
                                    }
                                },
                                children: ["▶"]
                            }
                        ]
                    },
                    {
                        tagName: "span",
                        attributes: {
                            class: "plugin-count"
                        },
                        children: [() => {
                            const count = state.filteredEvents.length;
                            return `${count} event${count !== 1 ? 's' : ''}`;
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
                            const { accountEmails, tags, tagIcons } = folderData;
                            
                            const folderItems = await Promise.all([
                                // All Calendars folder
                                FolderItem({ folder: { name: "All Calendars", icon: "fas fa-calendar" }, isSubfolder: false, accountEmail: null, tagName: null, appState: state }),
                                // Account folders
                                ...(accountEmails.length > 0 ? await Promise.all(accountEmails.map(email => {
                                    return FolderItem({ 
                                        folder: { 
                                            email: email, 
                                            name: email, 
                                            icon: state.getAccountIconClass(email)
                                        }, 
                                        isSubfolder: true, 
                                        accountEmail: email, 
                                        tagName: null, 
                                        appState: state 
                                    });
                                })) : []),
                                // Categories folder
                                FolderItem({ folder: { name: "Categories", icon: "fas fa-tags" }, isSubfolder: false, accountEmail: null, tagName: null, appState: state }),
                                // Categories subfolders (tags)
                                ...(tags.length > 0 ? await Promise.all(tags.map(tag =>
                                    FolderItem({ folder: { name: tagNameToFolderName(tag), originalTag: tag, icon: tagIcons[tag] || "fas fa-tag" }, isSubfolder: true, accountEmail: null, tagName: tag, appState: state })
                                )) : []),
                                // Snoozed Emails category
                                //FolderItem({ folder: { name: "Snoozed Emails", icon: "fas fa-clock" }, isSubfolder: false, accountEmail: null, tagName: "snoozed", appState: state }),
                                // Scheduled Emails category
                                //FolderItem({ folder: { name: "Scheduled Emails", icon: "fas fa-calendar-alt" }, isSubfolder: false, accountEmail: null, tagName: "scheduled", appState: state }),
                                // Contact Reachout category
                                //FolderItem({ folder: { name: "Contact Reachout", icon: "fas fa-user-friends" }, isSubfolder: false, accountEmail: null, tagName: "contact-reachout", appState: state })
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
                                    class: "calendar-view"
                                },
                                children: [() => state.renderCalendarView()]
                            }
                        ]
                    }
                ]
            }
        ]
    });
};

function tagNameToFolderName(tag) {
    // Remove leading '#', replace dashes with spaces, and capitalize the first letter of each word
    const cleaned = tag.replace(/^#/, '').replace(/-/g, ' ');
    return cleaned.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}
