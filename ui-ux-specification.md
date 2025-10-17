# UI/UX Specification

## Overall Layout

### Page Structure
```
┌─────────────────────────────────────────────────────────┐
│ Header (Optional)                                        │
├──────────┬──────────────────────────────────────────────┤
│          │                                              │
│  Menu    │              Main Content                    │
│  Bar     │                                              │
│          │                                              │
│          │                                              │
│          │                                              │
│          │                                              │
│          │                                              │
│          │                                              │
│          │                                              │
└──────────┴──────────────────────────────────────────────┘
```

### Left Menu Bar (Collapsible)
- **Width**: 250px (expanded), 50px (collapsed)
- **Transition**: Smooth slide animation (0.3s)
- **Toggle Button**: Hamburger icon at top
- **Menu Items**:
  - Tester Monitoring (active by default)
  - Configuration
  - Settings
  - About

### Main Content Area
- **Padding**: 20px
- **Background**: Light gray (#f5f5f5)
- **Overflow**: Auto for scrolling

## Tester Monitoring Dashboard

### Header Section
```
┌─────────────────────────────────────────────────────────┐
│ Tester Monitoring                    [Refresh] [Config] │
├─────────────────────────────────────────────────────────┤
│ Selected Testers: 3    Last Update: 10:41:00 AM        │
└─────────────────────────────────────────────────────────┘
```

### Tester Selection Panel
```
┌─────────────────────────────────────────────────────────┐
│ ☑ IST13    ☑ IST14    ☐ IST15    ☐ IST16    [Monitor]  │
└─────────────────────────────────────────────────────────┘
```

### Tester Cards Grid
- **Layout**: CSS Grid with configurable columns (1-5)
- **Gap**: 20px between cards
- **Responsive**: Adjusts to window size
- **Default**: 3 columns per row

## Tester Card Component

### Card Structure
```
┌─────────────────────────────────────────────────────────┐
│ IST13                                    [🔗]          │
│ ─────────────────────────────────────────────────────── │
│ TESTING | FAILING | PASSED | FAILED | ABORTED          │
│   12    |    0    |    3   |   1   |    0             │
│ ─────────────────────────────────────────────────────── │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ SLOT01       passed          SFT                   │ │
│ │ ────────────────────────────────────────────────── │ │
│ │ SN: 332404254207449      1:19:45                  │ │
│ │ ────────────────────────────────────────────────── │ │
│ │ Production  AZ3324_2025.10.08-01                  │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ SLOT02       failed          SFT                   │ │
│ │ ────────────────────────────────────────────────── │ │
│ │ SN: 332404254207450      0:45:12                  │ │
│ │ ────────────────────────────────────────────────── │ │
│ │ Production  AZ3324_2025.10.08-02                  │ │
│ └─────────────────────────────────────────────────────┘ │
│ [Scrollable container for more slots...]               │
└─────────────────────────────────────────────────────────┘
```

### Card Dimensions
- **Width**: 100% of grid cell
- **Min Height**: 400px
- **Max Height**: 600px
- **Border Radius**: 8px
- **Box Shadow**: 0 2px 8px rgba(0,0,0,0.1)

### Card Header
- **Background**: Dark blue (#1a237e)
- **Text Color**: White
- **Padding**: 12px 16px
- **Font Size**: 18px
- **Font Weight**: Bold
- **Link Icon**: Right-aligned, clickable

### Status Bar
- **Background**: Light gray (#e0e0e0)
- **Padding**: 8px 16px
- **Display**: Flex
- **Justify Content**: Space-between
- **Font Size**: 12px
- **Font Weight**: Bold

### Status Colors
- **TESTING**: Blue (#2196f3)
- **FAILING**: Orange (#ff9800)
- **PASSED**: Green (#4caf50)
- **FAILED**: Red (#f44336)
- **ABORTED**: Gray (#9e9e9e)

### Slot Cards Container
- **Max Height**: 400px
- **Overflow**: Auto
- **Padding**: 8px
- **Background**: White

### Slot Card
- **Margin**: 8px 0
- **Padding**: 8px 12px
- **Border**: 1px solid #e0e0e0
- **Border Radius**: 4px
- **Background**: White
- **Font Size**: 12px

## Configuration Modal

### Modal Structure
```
┌─────────────────────────────────────────────────────────┐
│ Configuration                              [×]          │
├─────────────────────────────────────────────────────────┤
│ ┌─ Testers ──────────────────────────────────────────┐ │
│ │ ┌─────────────────────────────────────────────────┐ │ │
│ │ │ ID: IST13    Display: IST13    [Edit] [Delete] │ │ │
│ │ │ URL: http://192.168.140.114:8080              │ │ │
│ │ └─────────────────────────────────────────────────┘ │ │
│ │ ┌─────────────────────────────────────────────────┐ │ │
│ │ │ ID: IST14    Display: IST14    [Edit] [Delete] │ │ │
│ │ │ URL: http://192.168.140.115:8080              │ │ │
│ │ └─────────────────────────────────────────────────┘ │ │
│ │ [Add New Tester]                                   │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─ Display Settings ──────────────────────────────────┐ │
│ │ Testers per row: [3▼] (1-5)                        │ │
│ │ Refresh interval: [15▼] seconds (min: 15)          │ │
│ └─────────────────────────────────────────────────────┘ │
│                                              [Save] [Cancel] │
└─────────────────────────────────────────────────────────┘
```

### Modal Dimensions
- **Width**: 600px
- **Max Height**: 80vh
- **Background**: White
- **Border Radius**: 8px
- **Box Shadow**: 0 4px 16px rgba(0,0,0,0.2)

### Form Elements
- **Input Fields**: 100% width, padding: 8px 12px
- **Buttons**: Primary (blue), Secondary (gray)
- **Dropdowns**: Standard select styling
- **Validation**: Red text for errors

## Responsive Design

### Breakpoints
- **Desktop**: > 1200px (3-5 columns)
- **Tablet**: 768px - 1200px (2-3 columns)
- **Mobile**: < 768px (1 column)

### Mobile Adaptations
- **Menu Bar**: Auto-collapsed, overlay style
- **Cards**: Full width, simplified layout
- **Slot Cards**: Compact view
- **Modal**: Full width with scrolling

## Interactions

### Hover Effects
- **Cards**: Slight elevation increase
- **Buttons**: Color darkening
- **Links**: Underline appearance

### Click Actions
- **Tester Card**: Open tester URL in new tab
- **Edit Button**: Enable inline editing
- **Delete Button**: Show confirmation dialog
- **Save Button**: Validate and save changes

### Loading States
- **Cards**: Skeleton loading animation
- **Buttons**: Disabled state with spinner
- **Refresh**: Rotating icon

### Error States
- **Network Errors**: Toast notification
- **Parsing Errors**: Card with error message
- **Configuration Errors**: Inline validation messages

## Animations

### Transitions
- **Menu Slide**: 0.3s ease-in-out
- **Card Hover**: 0.2s ease-in-out
- **Modal Fade**: 0.3s ease-in-out
- **Status Update**: 0.5s ease-in-out

### Micro-interactions
- **Button Press**: Slight scale down
- **Card Refresh**: Pulse animation
- **Status Change**: Color transition
- **New Data**: Slide in animation

## Accessibility

### ARIA Labels
- **Navigation**: aria-label, role="navigation"
- **Buttons**: aria-label for icon buttons
- **Status**: aria-live for dynamic updates
- **Links**: aria-describedby for context

### Keyboard Navigation
- **Tab Order**: Logical flow through elements
- **Focus Indicators**: Visible outline
- **Shortcuts**: Escape to close modal
- **Skip Links**: Jump to main content

### Contrast
- **Text Ratio**: Minimum 4.5:1
- **Interactive Elements**: Enhanced contrast
- **Status Colors**: Accompanied by text labels