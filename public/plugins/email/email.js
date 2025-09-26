const Email = async (email, appState, options = {}) => {
    const { isMaximized } = options;
    // Get tagIcons from appState or default to empty object
    const tagIcons = appState.tagIcons || {};

    // Add expanded state to email object for persistence across re-renders
    email.expanded = email.expanded || false;

    // Helper to get plain text from HTML
    function extractTextFromHtml(html) {
        const div = document.createElement("div");
        div.innerHTML = html || "";
        return div.textContent || div.innerText || "";
    }

    // Compute preview text
    const previewText = (() => {
        if (email.preview?.trim()) return email.preview;
        if (email.htmlBody) {
            const text = extractTextFromHtml(email.htmlBody).replace(/\s+/g, " ").trim();
            if (text.length > 128) {
                return text.slice(0, 128) + "…";
            }
            return text;
        }
        if (email.textBody) {
            const text = email.textBody.replace(/\s+/g, " ").trim();
            if (text.length > 128) {
                return text.slice(0, 128) + "…";
            }
            return text;
        }
        return "";
    })();

    // Helper for minimize/maximize buttons
    function getMinimizeMaximizeButtons() {
        return [
            {
                tagName: "button",
                attributes: {
                    class: "email-action-btn",
                    title: "Minimize",
                    onclick: (event) => {
                        event.stopPropagation();
                        email.expanded = false; // Always collapse the email
                        if (isMaximized) {
                            appState.closeMaximized(); // Also close the modal
                        }
                    }
                },
                children: [{ tagName: "i", attributes: { class: "fas fa-minus" } }]
            },
            {
                tagName: "button",
                attributes: {
                    class: "email-action-btn",
                    title: isMaximized ? "Restore" : "Maximize",
                    onclick: (event) => {
                        event.stopPropagation();
                        if (isMaximized) {
                            appState.closeMaximized();
                        } else {
                            appState.maximizeEmail(email);
                        }
                    }
                },
                children: [{ tagName: "i", attributes: { class: isMaximized ? "far fa-window-restore" : "far fa-clone" } }]
            }
        ];
    }

    // For showing the ellipsis as a clickable span
    function getPreviewChildren(update) {
        if (email.expanded || isMaximized) {
            return [
                {
                    tagName: "div",
                    attributes: {
                        class: "email-expanded-content",
                        style: `position: relative; height:${isMaximized ? '60vh' : '200px'};overflow:auto;margin-top:4px;background:#fafbfc;border:1px solid #eee;padding:8px;border-radius:4px;`
                    },
                    children: [
                        {
                            tagName: "div",
                            // Use dangerouslySetInnerHTML pattern for HTML content
                            innerHTML: email.htmlBody || "<em>No content</em>"
                        },
                        {
                            tagName: "div",
                            attributes: {
                                style: "position: absolute; top: 8px; right: 8px; display: flex; gap: 4px; z-index: 1;"
                            },
                            children: getMinimizeMaximizeButtons()
                        }
                    ]
                }
            ];
        } else {
            // If preview ends with ellipsis, make it clickable
            if (
                (email.htmlBody || email.textBody) &&
                (previewText.endsWith("…") || previewText.length === 128 + 1)
            ) {
                return [
                    previewText.slice(0, -1),
                    {
                        tagName: "span",
                        attributes: {
                            class: "email-preview-ellipsis",
                            style: "color:#0078d4;font-weight:bold;",
                        },
                        children: ["…"]
                    }
                ];
            }
            return [previewText || "No preview available"];
        }
    }

    return render({
        tagName: "div",
        attributes: {
            class() {
                let classes = 'email-item';
                if (email.unread) classes += ' unread';
                if (email.starred) classes += ' starred';
                if (email.scheduled) classes += ' scheduled';
                if (email.snoozed) classes += ' snoozed';
                if (email.expanded || isMaximized) classes += ' expanded';
                return classes;
            },
            style: "position: relative; display: flex; flex-direction: column;" + ((email.expanded && !isMaximized) ? " height: 300px;" : ""),
            'data-id': email.id,
            onclick(event) {
                // Prevent detail view from opening when clicking action buttons or the preview area
                if (
                    event.target.closest('.email-action-btn') ||
                    event.target.closest('.email-preview') ||
                    event.target.closest('.email-delete-btn')
                ) {
                    return;
                }
                // Log email interaction (placeholder for future detail view)
                console.log('Email clicked:', email.id);
            }
        },
        children: [
            {
                tagName: "div",
                attributes: {
                    class: "email-info",
                    style: "display: flex; flex-direction: row; flex: 1;"
                },
                children: [
                    {
                        tagName: "div",
                        attributes: {
                            class: "email-avatar-container",
                            style: email.expanded ? "flex: 0; min-width: 40px; display: flex; align-items: flex-start; flex-direction: row; padding: 8px;" : "height: 100%; flex: 0; min-width: 40px; display: flex; align-items: flex-start; flex-direction: row; padding: 8px;"
                        },
                        children: [
                            {
                                tagName: "div",
                                attributes: {
                                    class: "email-avatar",
                                    style: "display: flex; align-items: center; justify-content: center;"
                                },
                                children: [() => (email.from || 'Unknown').charAt(0).toUpperCase()]
                            }
                        ]
                    },
                    {
                        tagName: "div",
                        attributes: {
                            class: "email-details",
                            style: "display: flex; flex-direction: column; flex: 1;"
                        },
                        children: [
                            {
                                tagName: "div",
                                attributes: {
                                    class: "email-header",
                                    style: "display: flex; flex-direction: row;"
                                },
                                children: [
                                    {
                                        tagName: "div",
                                        attributes: {
                                            class: "email-subject",
                                            style: "flex: 1;"
                                        },
                                        children: [() => email.subject || 'No Subject']
                                    },
                                    {
                                        tagName: "div",
                                        attributes: {
                                            class: "email-actions",
                                            style: "flex: 0; margin-left: auto; display: flex; gap: 4px;"
                                        },
                                        children: [
                                            {
                                                tagName: "button",
                                                attributes: {
                                                    class: "email-action-btn",
                                                    title: "Star",
                                                    onclick() {
                                                        email.starred = !email.starred;
                                                    }
                                                },
                                                children: [
                                                    {
                                                        tagName: "i",
                                                        attributes: {
                                                            class: () => email.starred ? "fas fa-star" : "far fa-star"
                                                        }
                                                    }
                                                ]
                                            },
                                            {
                                                tagName: "button",
                                                attributes: {
                                                    class: "email-action-btn",
                                                    title: "Snooze",
                                                    onclick() {
                                                        // Simple snooze for 1 hour
                                                        const snoozeTime = new Date();
                                                        snoozeTime.setHours(snoozeTime.getHours() + 1);
                                                        appState.updateSnooze(email.id, snoozeTime.toISOString());
                                                    }
                                                },
                                                children: [
                                                    {
                                                        tagName: "i",
                                                        attributes: {
                                                            class: "fas fa-clock"
                                                        }
                                                    }
                                                ]
                                            },
                                            {
                                                tagName: "button",
                                                attributes: {
                                                    class: "email-action-btn",
                                                    title: "Schedule",
                                                    onclick() {
                                                        // Simple schedule for tomorrow
                                                        const scheduleTime = new Date();
                                                        scheduleTime.setDate(scheduleTime.getDate() + 1);
                                                        appState.updateSchedule(email.id, scheduleTime.toISOString());
                                                    }
                                                },
                                                children: [
                                                    {
                                                        tagName: "i",
                                                        attributes: {
                                                            class: "fas fa-calendar-alt"
                                                        }
                                                    }
                                                ]
                                            },
                                            {
                                                tagName: "button",
                                                attributes: {
                                                    class: "email-action-btn",
                                                    title: "Reply",
                                                    onclick() {
                                                        // Placeholder for reply action
                                                        alert(`Reply to: ${email.from}`);
                                                    }
                                                },
                                                children: [
                                                    {
                                                        tagName: "i",
                                                        attributes: {
                                                            class: "fas fa-reply"
                                                        }
                                                    }
                                                ]
                                            },
                                            {
                                                tagName: "button",
                                                attributes: {
                                                    class: "email-action-btn",
                                                    title: "Reply All",
                                                    onclick() {
                                                        // Placeholder for reply all action
                                                        alert(`Reply all to: ${email.from} and others`);
                                                    }
                                                },
                                                children: [
                                                    {
                                                        tagName: "i",
                                                        attributes: {
                                                            class: "fas fa-reply-all"
                                                        }
                                                    }
                                                ]
                                            },
                                            {
                                                tagName: "button",
                                                attributes: {
                                                    class: "email-action-btn",
                                                    title: "Forward",
                                                    onclick() {
                                                        // Placeholder for forward action
                                                        alert(`Forward email: ${email.subject}`);
                                                    }
                                                },
                                                children: [
                                                    {
                                                        tagName: "i",
                                                        attributes: {
                                                            class: "fas fa-share"
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
                                    class: "email-from-date",
                                    style: "display: flex; flex-direction: row;"
                                },
                                children: [
                                    {
                                        tagName: "div",
                                        attributes: {
                                            class: "email-from",
                                            style: "flex: 1;"
                                        },
                                        children: [() => email.from || 'Unknown Sender']
                                    },
                                    {
                                        tagName: "div",
                                        attributes: {
                                            class: "email-date",
                                            style: "flex: 0; white-space: nowrap;"
                                        },
                                        children: [() => {
                                            const date = new Date(email.date);
                                            const now = new Date();
                                            const diffTime = Math.abs(now - date);
                                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                            if (diffDays === 1) {
                                                return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                                            } else if (diffDays <= 7) {
                                                return date.toLocaleDateString([], {weekday: 'short'});
                                            } else {
                                                return date.toLocaleDateString([], {month: 'short', day: 'numeric'});
                                            }
                                        }]
                                    }
                                ]
                            },
                            {
                                tagName: "div",
                                attributes: {
                                    class: "email-to"
                                },
                                children: [() => email.to || 'No To']
                            },
                            {
                                tagName: "div",
                                attributes: {
                                    class: "email-preview",
                                    style: "cursor: pointer; width: 100%; margin-top: 4px;",
                                    onclick() {
                                        if (!email.expanded) {
                                            email.expanded = true;
                                        }
                                    }
                                },
                                children(update) {
                                    return getPreviewChildren(update);
                                }
                            }
                        ]
                    }
                ]
            },
            {
                tagName: "div",
                attributes: {
                    class: "email-footer",
                    style: "display: flex; justify-content: flex-end; margin-top: auto; padding: 8px; width: 100%"
                },
                children: [
                    {
                        tagName: "button",
                        attributes: {
                            class: "email-delete-btn",
                            title: "Delete",
                            onclick() {
                                appState.deleteEmail(email.id);
                            }
                        },
                        children: [
                            {
                                tagName: "i",
                                attributes: {
                                    class: "fas fa-trash"
                                }
                            }
                        ]
                    }
                ]
            }
        ]
    });
};