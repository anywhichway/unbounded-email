# Webmail Client Architecture Specification

## Overview
This document outlines the serverless architecture for a comprehensive webmail client built using LightView.js as the frontend framework and deployed on Cloudflare's edge computing platform.

## Technology Stack

### Frontend Architecture
**Primary Framework**: LightView.js (Custom lightweight framework)
- **Core Components**:
  - `lightview.js` - Main reactive DOM manipulation library
  - `lvDOM` - Client-side rendering with state management
  - `lvHTML` - Server-side rendering capabilities
  - **Planned Extensions**:
    - `lightview-ui.js` - UI component library (buttons, forms, modals, etc.)
    - `lightview-route.js` - Client-side routing for SPA navigation
    - `lightview-fetch.js` - Enhanced fetch with automatic header injection and test stubbing

**UI Framework**: Font Awesome for icons
**Styling**: CSS Grid and Flexbox for responsive layouts
**Icons**: Font Awesome for consistent iconography

### Backend Architecture
**Platform**: Cloudflare Workers (Serverless edge functions)
- **Runtime**: V8 JavaScript isolates
- **Global Distribution**: 300+ edge locations worldwide
- **Cold Start**: Near-zero latency

**Database**: Cloudflare KV (Key-Value storage)
- **Global Replication**: Automatic data replication across edge locations
- **Read Performance**: Sub-millisecond reads
- **Write Performance**: ~1 second global propagation
- **Storage Limit**: 25MB per key, 1GB per namespace

**Local Caching**: IndexedDB in browsers
- **Caching Layer**: Established KV abstraction over IndexedDB
- **Offline Support**: Full offline functionality with sync
- **Data Sync**: Background synchronization with Cloudflare KV

### Authentication & Security
**Authentication Provider**: LogTo.io
- **Protocol**: OpenID Connect (OIDC)
- **Features**: Multi-factor authentication, social login, enterprise SSO
- **Integration**: JWT tokens with automatic refresh

**Encryption**: jose.js (JavaScript Object Signing and Encryption)
- **Standards**: JWE (JSON Web Encryption) for data at rest
- **Key Management**: Automatic key rotation and management
- **Client-Side**: End-to-end encryption for sensitive data

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   LightView.js   │  │   Font Awesome   │  │ IndexedDB  │ │
│  │   (lvDOM/lvHTML) │  │    Icons        │  │   (Cache)  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Edge Layer                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   Cloudflare    │  │   Cloudflare    │  │   LogTo    │ │
│  │    Workers      │  │       KV        │  │    Auth    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Service Architecture Details

### Edge Functions Architecture
**Cloudflare Workers** handle all backend logic:
- **Email Worker**: IMAP/SMTP proxy, email processing, encryption/decryption
- **Calendar Worker**: Event management, recurrence calculations, timezone handling
- **Contacts Worker**: Contact CRUD operations, search, deduplication
- **Chat Worker**: Message storage, history, search (deferred real-time)
- **Key Worker**: Key management, encryption operations using jose.js
- **AI Worker**: Email analysis, task/event creation (background processing)

### Data Storage Strategy

#### Cloudflare KV Structure
```
Namespace: webmail-client
├── users:{userId}                    # User profiles and settings
├── emails:{userId}:{emailId}         # Email metadata and content
├── folders:{userId}:{folderId}       # Folder structure
├── events:{userId}:{eventId}         # Calendar events
├── contacts:{userId}:{contactId}     # Contact information
├── messages:{userId}:{chatId}        # Chat messages
├── keys:{userId}                     # Encryption keys
├── files:{fileId}                    # File metadata
└── cache:{type}:{key}               # Cached data
```

#### IndexedDB Local Schema
```
Database: WebmailClient
├── users               # User authentication data
├── emails              # Cached email data
├── folders             # Folder structure cache
├── events              # Calendar events cache
├── contacts            # Contact cache
├── messages            # Chat history cache
├── files               # Cached attachments
└── sync_queue          # Pending sync operations
```

### API Structure

#### Edge Function Endpoints
```
/api/v1/auth/*          # Authentication via LogTo.io
/api/v1/emails/*        # Email operations
/api/v1/calendar/*      # Calendar and event management
/api/v1/contacts/*      # Contact management
/api/v1/chat/*          # Chat and messaging
/api/v1/keys/*          # Key management with jose.js
/api/v1/ai/*            # AI services
/api/v1/files/*         # File upload and management
```

#### Data Flow
1. **Client Request** → LightView.js (lvDOM/lvHTML)
2. **Edge Function** → Cloudflare Worker
3. **Data Storage** → Cloudflare KV (with IndexedDB caching)
4. **Response** → JSON data to LightView.js
5. **Rendering** → Real-time DOM updates with lvDOM

### Security Implementation

#### Authentication Flow
1. **LogTo Integration**: OAuth2/OIDC flow
2. **Token Storage**: Secure IndexedDB storage
3. **Token Refresh**: Automatic refresh via LogTo
4. **Session Management**: Cloudflare Workers handle session validation

#### Encryption Strategy
**Client-Side**:
- **jose.js** for JWE encryption of sensitive data
- **End-to-end encryption** for chat messages
- **Selective encryption** for email content

**Server-Side**:
- **At-rest encryption** using Cloudflare KV encryption
- **Key rotation** handled by jose.js
- **Zero-knowledge architecture** - server never sees unencrypted sensitive data

### Performance Optimization

#### Edge Caching
- **Static Assets**: Cloudflare CDN caching
- **API Responses**: Edge caching with appropriate TTL
- **Database Queries**: KV read caching

#### Client-Side Optimization
- **IndexedDB Caching**: Aggressive local caching
- **Background Sync**: Offline-first with sync queue
- **Lazy Loading**: Progressive loading of email content
- **Service Worker**: Background sync and offline support

### Plugin Development Architecture

The webmail client supports a modular plugin system that allows for extensible functionality. Each plugin is self-contained and follows a standardized structure.

#### Plugin File Structure

Each plugin resides in its own subdirectory under the `public/plugins/` directory. The standard plugin structure consists of:

```
public/plugins/
├── [plugin-name]/
│   ├── index.html      # Main plugin interface and markup
│   ├── index.css       # Plugin-specific styles
│   └── index.js        # Plugin logic and functionality
```

#### Required Plugin Files

**index.html**
- Contains the plugin's HTML structure
- Loads required CSS and JavaScript files
- Uses LightView.js for dynamic rendering
- Follows the established pattern of inline initialization scripts

**index.css**
- Plugin-specific styling
- Responsive design considerations
- Consistent with overall application design language
- Uses CSS Grid and Flexbox for layouts

**index.js**
- Plugin business logic
- Data fetching and manipulation
- Event handling
- Integration with core LightView.js framework

#### Plugin Conventions

**Naming Standards**:
- File names follow the pattern: `index.[extension]`
- CSS classes use BEM methodology with plugin prefix

**Integration Points**:
- Plugins load core framework files from `../../assets/js/`
- Shared styles from `../index.css` (plugin base styles)
- Plugin-specific styles from `./index.css`
- Font Awesome icons via CDN

**Data Access**:
- Plugins use `lvIFrame.import()` for data loading
- Standardized data structures across plugins
- Consistent error handling patterns

#### Example Plugin Structure

The email plugin (`public/plugins/email/`) demonstrates the standard structure:

- **index.html**: Email interface with folder navigation and email list
- **index.css**: Email-specific styling including responsive layouts
- **index.js**: Email data fetching and rendering logic

This modular approach ensures:
- **Consistency**: All plugins follow the same structural pattern
- **Maintainability**: Clear separation of concerns
- **Scalability**: Easy addition of new plugins
- **Isolation**: Plugin changes don't affect core system