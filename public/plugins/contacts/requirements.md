# Contacts Plugin Requirements

## Overview
The Contacts plugin is a key component of the Unbounded Email application that provides contact management functionality across multiple email accounts. It should display, organize, and allow interaction with contacts from various email providers.

## Technical Stack
- **Framework**: Baux-browser and  Lightview-frame
- **State Management**: Baux reactive state
- **Rendering**: Baux render function. pay careful attentio to its async nature when you crreate functions that use it
- **Integration**: lvIFrame for communication with parent application
- **Coding Style**: use a component orineted style, e.g. Contact(state), FoldderItem(state), etc.
- **HTML styles**: use .css from parent folder for common plugin styles, create a local

## Core Functionality

### 1. Contact Data Management
- **Data Source**: Extract contacts from `user.accounts` structure where each account may contain a `contacts` array
- **Contact Properties**:
  - `email` (required)
  - `screenName` (optional, defaults to email if not provided)
  - `accountType` (derived from source account)
  - `sourceAccount` (email of the account this contact belongs to)
  - `starred` (boolean, optional)
  - `frequentlyContacted` (boolean, optional)
  - `scheduled` (boolean, optional)
  - `tags` (array of strings, optional)

### 2. User Interface Structure
- **Layout**: Plugin wrapper with header, sidebar, and main content area
- **Header**: Title "Contacts" with optional account link and contact count
- **Sidebar**: Hierarchical folder/category navigation
- **Main Area**: Contact list with individual contact cards

### 3. Folder/Category System
The sidebar should display the following hierarchy:

#### Primary Folders:
1. **All Contacts**
   - Shows all contacts from all accounts
   - Subfolders: One for each email account showing that account's contacts
   - Icon: `fas fa-users`

2. **Categories** 
   - Groups contacts by tags
   - Subfolders: One for each unique tag found in contacts
   - Icon: `fas fa-tags`
   - Tag icons from `ui.tagIcons` configuration

3. **Starred**
   - Shows contacts marked as starred
   - Icon: `fas fa-star`

4. **Frequently Contacted**
   - Shows contacts marked as frequently contacted
   - Icon: `fas fa-history`

5. **Scheduled**
   - Shows contacts with scheduled interactions
   - Icon: `fas fa-clock`

### 4. Contact Display
Each contact should be displayed as a card with:
- **Avatar**: Circle with first letter of screenName/email
- **Name**: screenName or email if screenName not available
- **Email**: Contact's email address
- **Account Type**: Type of the source account
- **Click Handler**: Log contact interaction (placeholder for future detail view)

### 5. Filtering and State Management
- **Reactive State**: Use Baux state management for all UI updates
- **Filter Types**:
  - By account: Show contacts from specific email account
  - By tag: Show contacts with specific tag for the selected account
  - By folder: Show contacts matching folder criteria (starred, frequent, scheduled) for the selected account
- **Active Selection**: Visual indication of currently selected account and folder
- **Dynamic Counts**: Real-time count updates based on current filters

### 6. Navigation Integration
- **Account Links**: Clicking account name in header should navigate to account plugin
- **Parent Communication**: Use lvIFrame for navigation between plugins
- **URL Parameters**: Support account parameter for direct account filtering

## File Structure Requirements

### index.html
- Include Baux framework and lvIFrame
- Load Font Awesome icons
- Include plugin CSS files
- Initialize application with user data and UI configuration
- Create reactive state and folder structure
- Render main contacts component

### index.js
- `getContactsFromAccounts(userData)`: Extract and normalize contact data
- Handle folder selection logic and state updates

### contact.js
- `Contact(contact)`: Render individual contact card component
- Handle contact interaction events
- Display contact avatar, name, email, and account type

### contacts.js
- `Contacts(state)`: Main contacts container component
- Render header with title and count
- Render sidebar with folder navigation
- Render main area with contact list
- Handle empty state display

### folder-item.js
- `FolderItem(state)`: Main folder item compnent

Other files for componetns as necessary

### index.css
- Contact card styling with hover effects
- Avatar styling with centered initials
- Responsive design for mobile devices
- Folder navigation styling
- Empty state styling

## Integration Requirements
- **Data Format**: Compatible with existing user account structure
- **Navigation**: Integrate with parent application navigation system
- **Styling**: Consistent with overall application theme
- **Icons**: Use Font Awesome for consistent iconography
- **Responsive**: Work on both desktop and mobile devices

## Error Handling
- Handle missing contact data gracefully
- Display appropriate empty states
- Fallback values for missing contact properties
- Robust folder count calculations

## Performance Considerations
- Efficient filtering using computed properties
- Minimal re-renders through reactive state
- Lazy loading for large contact lists (future enhancement)

## Future Enhancements (Not Required for Initial Implementation)
- Contact detail view
- Contact editing functionality
- Contact search/filtering
- Contact import/export
- Contact synchronization
- Advanced contact grouping
