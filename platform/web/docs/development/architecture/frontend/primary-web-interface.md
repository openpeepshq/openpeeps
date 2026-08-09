# Primary Web Interface Layout

The OpenPeeps primary web interface is a React SPA (`platform/web` +
`@openpeeps/react`), using a mobile-first responsive design approach. This
document explains the layout structure and how responsiveness is achieved.

## Layout Architecture

### Overall Structure

The application uses a hierarchical layout system:

```
Root (React Router layout)
  └── RootLayout
      ├── SideBar (Desktop only)
      ├── HeaderMobile (Mobile only)
      ├── Content Area
      │   ├── ContentHeader
      │   ├── Breadcrumbs
      │   ├── Infos
      │   ├── Page Content (children)
      │   └── PlusButton
      └── FooterMobile (Mobile only)
```

### Layout Components

**Location**: `platform/react/src/components/layout/` and
`platform/react/src/components/navigation/`

- **`Root.tsx`** (`RootLayout`) - Main application layout shell
- **`Auth.tsx`** - Authentication pages layout
- **`Infos.tsx`** - Information banners (e.g., email verification)
- **`SideBar` / `HeaderMobile` / `FooterMobile`** - Navigation chrome

## Responsive Design Strategy

### Mobile-First Approach

The interface follows a **mobile-first** design philosophy:

1. **Base styles** target mobile devices
2. **Desktop styles** are added with `md:` breakpoint modifiers
3. **Components adapt** based on screen size

### Breakpoints

The application uses Tailwind CSS breakpoints:

- **Mobile**: Default (no prefix) - `< 768px`
- **Tablet/Desktop**: `md:` - `≥ 768px`

### Key Responsive Patterns

#### 1. Sidebar Navigation

**Desktop**: Sticky sidebar on the left  
**Mobile**: Hidden sidebar, opened from the header as a dialog drawer

```tsx
<aside className="bg-card w-70 hidden shrink-0 border-r md:sticky md:top-0 md:flex md:h-screen md:self-start">
  <SideBar mainMenu={sideBar?.mainMenu?.()} profileMenu={sideBar?.profileMenu?.()} />
</aside>

<div className="bg-card flex min-h-screen min-w-0 flex-1 flex-col border-r">
  {/* Content */}
</div>
```

**Key classes:**

- `hidden` / `md:flex` - Hidden on mobile, visible on desktop
- `w-70` - Fixed sidebar width (17.5rem / 280px)
- `md:sticky md:top-0 md:h-screen` - Desktop rail stays in view while scrolling

#### 2. Header Navigation

**Desktop**: No top header (navigation lives in the sidebar)  
**Mobile**: Sticky header at top

```tsx
<div className="bg-background sticky top-0 z-10 flex px-4 py-2 md:hidden">
  {/* Avatar / menu trigger, logo, messages */}
</div>
```

**Key classes:**

- `md:hidden` - Hidden on desktop
- `sticky top-0` - Sticks to top when scrolling
- `z-10` - Above other content

#### 3. Footer Navigation

**Desktop**: No footer (navigation in sidebar)  
**Mobile**: Bottom navigation bar

```tsx
<div className="bottom-0 w-full flex-grow-0 md:hidden">
  <FooterMobile onNewPost={openNewPost} />
</div>
```

## Layout Components

### RootLayout

**Location**: `platform/react/src/components/layout/Root.tsx`

The main layout component that wraps authenticated pages.

**Structure (simplified from source):**

```tsx
export const RootLayout = ({ children, sideBar }: RootLayoutProps) => (
  <div className="flex h-full w-full flex-col overflow-x-hidden">
    <div className="min-w-0 flex-grow">
      <div className="mx-auto h-1 w-full min-w-0 flex-grow md:max-w-[950px]">
        <div className="flex w-full min-w-0 flex-col md:flex-row">
          <aside className="bg-card w-70 hidden shrink-0 border-r md:sticky md:top-0 md:flex md:h-screen md:self-start">
            <SideBar
              mainMenu={sideBar?.mainMenu?.()}
              profileMenu={sideBar?.profileMenu?.()}
            />
          </aside>
          <div className="bg-card flex min-h-screen min-w-0 flex-1 flex-col border-r">
            <HeaderMobile sideBar={sideBar} />
            <ContentHeader />
            <Breadcrumbs />
            <Infos />
            {children}
            <PlusButton />
          </div>
        </div>
      </div>
    </div>
    <div className="bottom-0 w-full flex-grow-0 md:hidden">
      <MobileFooter />
    </div>
  </div>
);
```

**Key Features:**

- **Max width container**: `md:max-w-[950px]` centers content on large screens
- **Row on desktop**: `md:flex-row` places sidebar and main column side by side
- **Overflow handling**: Vertical scroll on the main column; horizontal overflow clipped
- **Slot props**: `sideBar.mainMenu` / `sideBar.profileMenu` inject app-specific menus

### SideBar

**Location**: `platform/react/src/components/navigation/SideBar.tsx`

Desktop navigation sidebar (also reused inside the mobile drawer).

**Features:**

- Logo and branding
- Profile menu
- Main navigation menu
- Action affordances (e.g., new post)
- Community information

**Responsive Behavior:**

- **Desktop**: Always visible, sticky
- **Mobile**: Rendered inside a full-height dialog from `HeaderMobile`

### HeaderMobile

**Location**: `platform/react/src/components/navigation/HeaderMobile.tsx`

Mobile header with essential navigation.

**Features:**

- Profile avatar (opens sidebar dialog) or menu icon for guests
- Community logo
- Messages icon

**Implementation (sketch):**

```tsx
<div className="bg-background sticky top-0 z-10 flex px-4 py-2 md:hidden">
  <div className="flex w-full items-center justify-between">
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button">
          {profile ? <Avatar profile={profile} size={2.5} borderless /> : <Menu />}
        </button>
      </DialogTrigger>
      <DialogContent className="…">
        <SideBar onClose={() => setOpen(false)} … />
      </DialogContent>
    </Dialog>
    {/* logo + messages */}
  </div>
</div>
```

### FooterMobile

**Location**: `platform/react/src/components/navigation/FooterMobile.tsx`

Bottom navigation bar for mobile devices.

**Navigation Items:**

- Home (`/feeds/local`)
- My Feed (`/feeds/my`)
- New Post (opens modal via `onNewPost`)
- Groups (`/groups`)
- Notifications (`/notifications`)

```tsx
<div className="bg-card flex h-20 w-full items-center justify-evenly md:hidden">
  <MobileMenuItem icon={Home} action="/feeds/local" />
  <MobileMenuItem icon={Newspaper} action="/feeds/my" />
  <MobileMenuItem icon={PlusSquare} action={onNewPost ?? '/posts/new'} />
  <MobileMenuItem icon={Users} action="/groups" />
  <MobileMenuItem icon={Bell} action="/notifications" />
</div>
```

## Responsive Techniques

### 1. Conditional Visibility

```tsx
{/* Desktop only */}
<div className="hidden md:block">
  <DesktopComponent />
</div>

{/* Mobile only */}
<div className="md:hidden">
  <MobileComponent />
</div>
```

### 2. Responsive Utilities

**Visibility:** `hidden`, `md:flex`, `md:hidden`  
**Spacing:** `p-4 md:p-8`, `gap-2 md:gap-4`  
**Layout:** `flex-col md:flex-row`, `w-full md:w-1/2`, `md:max-w-[950px]`

### 3. Custom Spacing

Sidebar width uses the `70` spacing token (`17.5rem`) as `w-70`.

### 4. Drawer for Mobile Navigation

Mobile opens the same `SideBar` inside a `@openpeeps/react-ui` `Dialog`
(full-height panel), not a separate navigation tree.

## Content Area Structure

### ContentHeader

Page-level header with title and actions.

### Breadcrumbs

Navigation breadcrumbs for hierarchical pages.

### Infos

Information banners (e.g., email verification prompts).

### Page Content

Main page content, rendered as React `{children}` of `RootLayout`.

## Styling System

### Tailwind CSS

Utility-first styles across `@openpeeps/web` and `@openpeeps/react`.

**Features:**

- Custom spacing (e.g. sidebar `w-70`)
- Dark mode via theme class / selector
- Shared tokens with `@openpeeps/react-ui`

### Theme System

`OpenpeepsThemeProvider` applies community + profile theme preferences
(light / dark / system) from config (`theme.light` / dark variants, logos,
primary color).

## Responsive Patterns in Practice

### Example: Post Feed

```tsx
<div className="mx-auto w-full p-4 md:max-w-2xl md:p-8">
  {/* Full width on mobile, constrained on desktop */}
</div>
```

### Example: Card Component

```tsx
<div className="flex flex-col gap-4 p-4 md:flex-row">
  {/* Stacked on mobile, side-by-side on desktop */}
</div>
```

### Example: Image Sizing

```tsx
<img src={logo} className="h-6 md:h-10" alt="logo" />
```

## Mobile-Specific Features

### Touch Interactions

- Large touch targets (minimum 44×44px)
- Bottom navigation for thumb reach

### Performance

- Lazy loading of images
- Code splitting by route
- Optimized bundle sizes

### Viewport Handling

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

## Desktop-Specific Features

### Sidebar Navigation

- Always visible
- Sticky position
- Scrollable content area

### Wider Layouts

- Max width constraint (`md:max-w-[950px]`)
- Centered content
- More horizontal space utilization

## Best Practices

### 1. Mobile-First CSS

Write mobile styles first, then add desktop modifiers:

```tsx
{/* ✅ Good */}
<div className="p-4 md:p-8" />

{/* ❌ Avoid */}
<div className="md:p-8 p-4" />
```

### 2. Consistent Breakpoints

Prefer `md:` for the desktop breakpoint (768px).

### 3. Test on Real Devices

Test on actual mobile devices, not just browser dev tools.

### 4. Touch-Friendly Targets

Ensure interactive elements are at least 44×44px on mobile.

### 5. Progressive Enhancement

Start with mobile experience, enhance for desktop.

## Common Responsive Patterns

### Hide/Show Pattern

```tsx
<div className="md:hidden">Mobile Content</div>
<div className="hidden md:block">Desktop Content</div>
```

### Flexible Layout

```tsx
<div className="flex flex-col gap-4 md:flex-row">
  <div>Item 1</div>
  <div>Item 2</div>
</div>
```

### Responsive Typography

```tsx
<h1 className="text-2xl md:text-4xl">Title</h1>
<p className="text-sm md:text-base">Body text</p>
```

## Testing Responsiveness

### Browser DevTools

Use Chrome/Firefox responsive design mode for sizes, orientation, and touch.

### Real Devices

Test on iOS and Android across common widths.

### Breakpoint Testing

Verify behavior at 320px, 375px, 768px, 1024px, and 1440px.

## Related Documentation

- [Frontend Architecture](/docs/development/architecture/frontend) - Overall frontend structure
- [Code Style](/docs/development/code-style) - Coding standards
- [Routes](/docs/development/routes) - URL structure
