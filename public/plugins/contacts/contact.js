const Contact = async (contact, appState) => {
    // Get tagIcons from appState or default to empty object
    const tagIcons = appState.tagIcons || {};
    
    return render({
        tagName: "div",
        attributes: {
            class() { 
                let classes = 'contact-item';
                if (contact.starred) classes += ' starred';
                if (contact.scheduled) classes += ' scheduled';
                return classes;
            },
            'data-email': contact.email,
            onclick(event) {
                // Prevent detail view from opening when clicking star or calendar icons
                if (!event.target.closest('.star-icon') && !event.target.closest('.calendar-icon') && !event.target.closest('.edit-icon')) {
                    // Log contact interaction (placeholder for future detail view)
                    console.log('Contact clicked:', contact.email);
                }
            }
        },
        children: [
            {
                tagName: "div",
                attributes: {
                    class: "contact-avatar"
                },
                children() {
                    if (contact.avatar) {
                        return [{
                            tagName: "img",
                            attributes: {
                                src: contact.avatar,
                                alt: contact.screenName || contact.email,
                                style: "width: 100%; height: 100%; border-radius: 50%; object-fit: cover;"
                            }
                        }];
                    } else {
                        return [() => (contact.screenName || contact.email).charAt(0).toUpperCase()];
                    }
                }
            },
            {
                tagName: "div",
                attributes: {
                    class: "contact-info"
                },
                children: [
                    {
                        tagName: "div",
                        attributes: {
                            class: "contact-name"
                        },
                        children: [
                            {
                                tagName: "span",
                                attributes: {
                                    class: "contact-name-text"
                                },
                                children: [() => contact.screenName || contact.email]
                            },
                            {
                                tagName: "span",
                                attributes: {
                                    class: "contact-details"
                                },
                                children: [() => {
                                    const phone = contact.phone || '';
                                    const email = contact.email || '';
                                    if (phone && email) {
                                        return ' ' + phone + ' | ' + email;
                                    } else if (phone) {
                                        return ' ' + phone;
                                    } else if (email) {
                                        return ' ' + email;
                                    } else {
                                        return '';
                                    }
                                }]
                            }
                        ]
                    },
                    {
                        tagName: "div",
                        attributes: {
                            class: "contact-address"
                        },
                        children: [() => contact.address || '']
                    }
                ]
            },
            {
                tagName: "div",
                attributes: {
                    class: "contact-bottom-row"
                },
                children: [
                    {
                        tagName: "div",
                        attributes: {
                            class: "contact-type"
                        },
                        children: [() => contact.accountType]
                    },
                    {
                        tagName: "div",
                        attributes: {
                            class: "contact-categories"
                        },
                        children: () => {
                            const children = [];
                            
                            // Add existing tags
                            if (contact.tags && contact.tags.length > 0) {
                                contact.tags.forEach(tag => {
                                    children.push({
                                        tagName: "span",
                                        attributes: {
                                            class: "category-tag"
                                        },
                                        children: [
                                            {
                                                tagName: "i",
                                                attributes: {
                                                    class: tagIcons[tag] 
                                                        ? tagIcons[tag] 
                                                        : "fas fa-tag"
                                                }
                                            },
                                            {
                                                tagName: "span",
                                                attributes: {
                                                    class: "category-name"
                                                },
                                                children: [tag.charAt(1).toUpperCase() + tag.slice(2)]
                                            },
                                            {
                                                tagName: "button",
                                                attributes: {
                                                    class: "tag-delete-btn",
                                                    onclick(event) {
                                                        event.stopPropagation();
                                                        removeTagFromContact(contact, tag, appState);
                                                    },
                                                    title: `Remove ${tag} tag`
                                                },
                                                children: ["×"]
                                            }
                                        ]
                                    });
                                });
                            }
                            
                            // Add input field for new tags
                            children.push({
                                tagName: "input",
                                attributes: {
                                    type: "text",
                                    class: "tag-input",
                                    placeholder: "Add tag...",
                                    onkeydown(event) {
                                        handleTagInputKeydown(event, contact, appState);
                                    },
                                    oninput(event) {
                                        handleTagInput(event, contact, appState);
                                    },
                                    onblur(event) {
                                        // Hide suggestions when input loses focus
                                        setTimeout(() => {
                                            const suggestions = document.querySelector('.tag-suggestions');
                                            if (suggestions) suggestions.style.display = 'none';
                                        }, 150);
                                    },
                                    onclick(event) {
                                        event.stopPropagation();
                                    }
                                }
                            });
                            
                            return children;
                        }
                    }
                ]
            },
            {
                tagName: "div",
                attributes: {
                    class: "schedule-container"
                },
                children: [
                    {
                        tagName: "div",
                        attributes: {
                            class: "schedule-input-container",
                            style() {
                                return contact.editingSchedule || contact.scheduledDate ? "display: flex;" : "display: none;";
                            }
                        },
                        children: [
                            {
                                tagName: "input",
                                attributes: {
                                    type: "datetime-local",
                                    class: "schedule-input",
                                    value() {
                                        return contact.scheduledDate || "";
                                    },
                                    min() {
                                        // Set minimum to current date/time
                                        const now = new Date();
                                        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                                        return now.toISOString().slice(0, 16);
                                    },
                                    onchange(event) {
                                        setContactSchedule(contact, appState, event.target.value);
                                        contact.editingSchedule = false;
                                    },
                                    onblur(event) {
                                        // If no date was set, go back to icon
                                        if (!event.target.value) {
                                            contact.editingSchedule = false;
                                        }
                                    },
                                    onkeydown(event) {
                                        // Allow Escape to cancel editing
                                        if (event.key === 'Escape') {
                                            contact.editingSchedule = false;
                                            event.preventDefault();
                                        }
                                        // Allow Enter to confirm
                                        if (event.key === 'Enter') {
                                            event.target.blur();
                                        }
                                    },
                                    onclick(event) {
                                        event.stopPropagation();
                                    }
                                }
                            }
                        ]
                    },
                    // Calendar icon (shown when no date is set and not editing)
                    {
                        tagName: "div",
                        attributes: {
                            class: "calendar-icon",
                            style() {
                                return (!contact.scheduledDate && !contact.editingSchedule) ? "display: flex;" : "display: none;";
                            },
                            onclick(event) {
                                event.stopPropagation();
                                contact.editingSchedule = true;
                                const contactItem = event.target.closest('.contact-item');
                                const input = contactItem.querySelector('.schedule-input');
                                if (input) {
                                    input.focus();
                                }
                            }
                        },
                        children: [
                            {
                                tagName: "i",
                                attributes: {
                                    class: "far fa-calendar"
                                }
                            }
                        ]
                    }
                ]
            },
            {
                tagName: "div",
                attributes: {
                    class: "star-icon",
                    onclick(event) {
                        event.stopPropagation();
                        toggleContactStar(contact, appState);
                    }
                },
                children: [
                    {
                        tagName: "i",
                        attributes: {
                            class() {
                                return contact.starred ? "fas fa-star starred" : "far fa-star";
                            }
                        }
                    }
                ]
            },
            {
                tagName: "div",
                attributes: {
                    class: "edit-icon",
                    onclick(event) {
                        event.stopPropagation();
                        
                        // Show dialog procedurally
                        const dialog = document.querySelector('.dialog-overlay');
                        if (dialog) {
                            dialog.style.display = 'flex';
                            
                            // Populate form fields with contact data
                            const avatarInput = dialog.querySelector('#dialog-avatar');
                            const nameInput = dialog.querySelector('#dialog-name');
                            const phoneInput = dialog.querySelector('#dialog-phone');
                            const emailInput = dialog.querySelector('#dialog-email');
                            const addressInput = dialog.querySelector('#dialog-address');
                            const notesInput = dialog.querySelector('#dialog-notes');
                            
                            if (avatarInput) avatarInput.value = contact.avatar || '';
                            if (nameInput) nameInput.value = contact.screenName || '';
                            if (phoneInput) phoneInput.value = contact.phone || '';
                            if (emailInput) emailInput.value = contact.email || '';
                            if (addressInput) addressInput.value = contact.address || '';
                            if (notesInput) notesInput.value = contact.notes || '';
                            
                            // Store reference to current contact for saving
                            dialog._currentContact = contact;
                            dialog._appState = appState;
                        }
                    }
                },
                children: [
                    {
                        tagName: "i",
                        attributes: {
                            class: "fas fa-pencil-alt"
                        }
                    }
                ]
            }
        ]
    });
}

// Function to handle tag input changes and show suggestions
function handleTagInput(event, contact, appState) {
    const input = event.target;
    const value = input.value.trim();
    
    // Remove existing suggestions
    let suggestionsContainer = document.querySelector('.tag-suggestions');
    if (suggestionsContainer) {
        suggestionsContainer.remove();
    }
    
    if (value.length === 0) return;
    
    // Get all available tags from the appState
    const allTags = getAllAvailableTags(appState);
    
    // Filter tags that match the input
    const matchingTags = allTags.filter(tag => 
        tag.toLowerCase().includes(value.toLowerCase()) && 
        !contact.tags.includes(tag)
    );
    
    if (matchingTags.length > 0) {
        // Create suggestions container
        suggestionsContainer = document.createElement('div');
        suggestionsContainer.className = 'tag-suggestions';
        suggestionsContainer.style.cssText = `
            position: absolute;
            background: white;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            max-height: 150px;
            overflow-y: auto;
            z-index: 1000;
            min-width: 200px;
        `;
        
        // Add suggestions
        matchingTags.forEach(tag => {
            const suggestion = document.createElement('div');
            suggestion.className = 'tag-suggestion';
            suggestion.style.cssText = `
                padding: 8px 12px;
                cursor: pointer;
                border-bottom: 1px solid #eee;
                display: flex;
                align-items: center;
                gap: 8px;
            `;
            suggestion.innerHTML = `
                <i class="${appState.tagIcons[tag] || 'fas fa-tag'}" style="color: #007acc;"></i>
                <span>${tag.charAt(1).toUpperCase() + tag.slice(2)}</span>
            `;
            suggestion.onclick = () => {
                addTagToContact(contact, tag, appState);
                input.value = '';
                suggestionsContainer.remove();
                input.focus();
            };
            suggestionsContainer.appendChild(suggestion);
        });
        
        // Position suggestions below the input
        const inputRect = input.getBoundingClientRect();
        suggestionsContainer.style.left = inputRect.left + 'px';
        suggestionsContainer.style.top = (inputRect.bottom + 2) + 'px';
        
        document.body.appendChild(suggestionsContainer);
    }
}

// Function to handle keydown events on tag input
function handleTagInputKeydown(event, contact, appState) {
    const input = event.target;
    
    if (event.key === 'Enter') {
        event.preventDefault();
        const value = input.value.trim();
        if (value) {
            addTagToContact(contact, value, appState);
            input.value = '';
            
            // Remove suggestions
            const suggestions = document.querySelector('.tag-suggestions');
            if (suggestions) suggestions.remove();
        }
    } else if (event.key === 'Escape') {
        input.value = '';
        const suggestions = document.querySelector('.tag-suggestions');
        if (suggestions) suggestions.remove();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        // Handle arrow key navigation in suggestions
        const suggestions = document.querySelectorAll('.tag-suggestion');
        if (suggestions.length > 0) {
            event.preventDefault();
            let currentIndex = -1;
            suggestions.forEach((suggestion, index) => {
                if (suggestion.classList.contains('selected')) {
                    currentIndex = index;
                    suggestion.classList.remove('selected');
                    suggestion.style.backgroundColor = '';
                }
            });
            
            if (event.key === 'ArrowDown') {
                currentIndex = currentIndex < suggestions.length - 1 ? currentIndex + 1 : 0;
            } else {
                currentIndex = currentIndex > 0 ? currentIndex - 1 : suggestions.length - 1;
            }
            
            suggestions[currentIndex].classList.add('selected');
            suggestions[currentIndex].style.backgroundColor = '#f0f8ff';
        }
    }
}

// Function to get all available tags from the appState
function getAllAvailableTags(appState) {
    const tags = new Set();
    
    // Add tags from all contacts in user.accounts
    Object.values(appState.user.accounts).forEach(account => {
        if (account.contacts) {
            account.contacts.forEach(contact => {
                if (contact.tags) {
                    contact.tags.forEach(tag => tags.add(tag));
                }
            });
        }
    });
    
    return Array.from(tags).sort();
}

// Function to add a tag to a contact
function addTagToContact(contact, tag, appState) {
    // Initialize tags array if it doesn't exist
    if (!contact.tags) {
        contact.tags = [];
    }
    
    // Normalize tag format (ensure it starts with #)
    const normalizedTag = tag.startsWith('#') ? tag : '#' + tag;
    
    // Check if tag already exists
    if (contact.tags.includes(normalizedTag)) {
        return;
    }
    
    // Add tag to contact
    contact.tags = [...contact.tags, normalizedTag];
    
    
    // Update the global tag list and folder data
    updateGlobalTags(appState);
    
    console.log(`Added tag "${normalizedTag}" to contact ${contact.email}`);
}

// Function to update global tags and folder data
function updateGlobalTags(appState) {
    // Get all unique tags from all contacts in user.accounts
    const allTags = new Set();
    Object.values(appState.user.accounts).forEach(account => {
        if (account.contacts) {
            account.contacts.forEach(contact => {
                if (contact.tags) {
                    contact.tags.forEach(tag => allTags.add(tag));
                }
            });
        }
    });
    
    const uniqueTags = Array.from(allTags).sort();
    
    // Update tagIcons if needed (add default icon for new tags)
    uniqueTags.forEach(tag => {
        if (!appState.user.tagIcons[tag]) {
            appState.user.tagIcons[tag] = "fas fa-tag";
        }
    });
    
    // Force reactivity update by modifying the tagIcons object
    appState.user.tagIcons = { ...appState.user.tagIcons };
    
    console.log('Updated global tags:', uniqueTags);
}

// Function to remove a tag from a contact
function removeTagFromContact(contact, tagToRemove, appState) {
    // Initialize tags array if it doesn't exist
    if (!contact.tags) {
        contact.tags = [];
    }
    
    // Remove the tag from the contact's tags array
    contact.tags = contact.tags.filter(tag => tag !== tagToRemove);
    
    // Update the global tag list and folder data
    updateGlobalTags(appState);
    
    console.log(`Removed tag "${tagToRemove}" from contact ${contact.email}`);
}

// Function to toggle the starred state of a contact
function toggleContactStar(contact, appState) {
    // Toggle the starred state
    contact.starred = !contact.starred;
    console.log(`Contact ${contact.email} ${contact.starred ? 'starred' : 'unstarred'}`);
}

// Function to set the contact schedule with a specific date/time
// Since contact is now a reference to the original object in user.accounts,
// changes here will propagate back to the parent window via reactivity
function setContactSchedule(contact, appState, dateTimeValue) {
    if (dateTimeValue) {
        contact.scheduled = true;
        contact.scheduledDate = dateTimeValue;
    } else {
        contact.scheduled = false;
        contact.scheduledDate = null;
    }
    
    // Always exit editing mode when setting a schedule
    contact.editingSchedule = false;
    
    console.log(`Contact ${contact.email} scheduled for ${dateTimeValue || 'unscheduled'}`);
}

// Function to clear the contact schedule
function clearContactSchedule(contact, appState) {
    contact.scheduled = false;
    contact.scheduledDate = null;
    contact.editingSchedule = false;
    
    console.log(`Contact ${contact.email} schedule cleared`);
}

// Function to format the schedule date for display
function formatScheduleDate(dateTimeString) {
    if (!dateTimeString) return '';
    
    const date = new Date(dateTimeString);
    const now = new Date();
    
    // Check if it's today
    const isToday = date.toDateString() === now.toDateString();
    
    // Check if it's tomorrow
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    
    // Check if it's this week
    const daysDiff = Math.floor((date - now) / (1000 * 60 * 60 * 24));
    
    let dateText;
    if (isToday) {
        dateText = 'Today';
    } else if (isTomorrow) {
        dateText = 'Tomorrow';
    } else if (daysDiff >= 0 && daysDiff < 7) {
        dateText = date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
        dateText = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    
    const timeText = date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
    });
    
    return `${dateText} ${timeText}`;
}
