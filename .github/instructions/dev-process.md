# Webmail Client Development Process

## Process Overview
This document outlines the systematic approach to building the webmail client application. The development process follows a structured methodology where each section must be completed and approved before proceeding to the next.

## Development Workflow

### Critical Process Rules
**IMPORTANT**: You must wait for explicit user approval ("proceed to next section" or similar) before moving from one major section to the next. Do not automatically advance sections or make architectural/design decisions without user consent.
Each section gets its own .md file to control the development in the .clinerule directory
There is also a todo.md. As work is being done updated the [] boxes in todo.md with percentages complete. Also add tasks as necessary. Always confirm these changes.

### Section Progression
The development follows these sections in order:
1. **Scope** - Define project scope and features
2. **Requirements** - Gather detailed functional and non-functional requirements
3. **Architecture** - Design system architecture and choose technology stack
4. **Design** - Create functional layout wireframes first, then aesthetic UX designs
5. **Coding** - Implement the actual functionality
6. **Testing** - Set up testing frameworks and write tests
7. **Operations** - Configure deployment and operations

## Section Guidelines

### For Each Section:
1. **Review existing context** from previous sections
2. **Ask clarifying questions** to gather specific preferences
3. **Present options** where choices exist
4. **Wait for user approval** before proceeding
5. **Create/update** the associated .md file with results
6. **Update todo.md** to mark completion

### Design Section - Two-Phase Approach
**Phase 1: Functional Layout Wireframes**
- Focus on positional UX and functional layout
- Minimal aesthetic considerations
- Emphasis on component placement and workflow
- User approval required before Phase 2

**Phase 2: Aesthetic & UX Enhancement**
- Add visual styling and aesthetic considerations
- Implement responsive design
- Enhance user experience with CSS and animations
- Build upon approved functional layouts

### Question-Answer Protocol
- Always ask questions when user preferences are needed
- Present technology choices with pros/cons
- Provide multiple options for architectural decisions
- Wait for explicit "yes", "proceed", or "next section" before advancing

### File Management
- Each section gets its own .md file (scope.md, requirements.md, architecture.md, etc.)
- Update todo.md after completing each section
- All decisions and specifications go into the appropriate .md file
- **Automatic Sync**: Any changes to scope.md, requirements.md, design.md, etc. must be reflected in todo.md
- **Change Tracking**: When modifying any section file, immediately update the corresponding todo.md items
- **Process Maintenance**: Add new todo items for any scope/requirements/design changes discovered during development

## Current Status
- ✅ **Scope**: Completed - Detailed feature specifications created and reorganized with Account Management section
- ✅ **Requirements**: Completed - Functional and non-functional requirements documented with AI support
- ⏳ **Architecture**: Pending - Awaiting user preferences and approval

## Next Steps
For the Architecture section, you should:
1. Present technology stack options
2. Discuss architectural patterns
3. Get user approval for choices
4. Only then create architecture.md

## Design Section Process
When reaching the Design section:
1. **Phase 1**: Create functional layout wireframes focusing on:
   - Component positioning and layout
   - User workflow and navigation
   - Information architecture
   - Basic responsive breakpoints
2. **User Approval**: Get explicit approval for functional layouts
3. **Phase 2**: Enhance with aesthetic considerations:
   - Visual styling and themes
   - Color schemes and typography
   - Interactive elements and animations
   - Accessibility enhancements

## Example Questions for Architecture Section:
- "What frontend framework would you prefer? (React, Vue, Angular, or vanilla JS?)"
- "Do you have preferences for the backend technology? (Node.js, Python, etc.)"
- "Should we use a SQL or NoSQL database?"
- "Any specific cloud platform preferences?"

Remember: **Never proceed to the next section without explicit user approval.**
