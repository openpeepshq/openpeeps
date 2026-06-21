# Primary Web Interface Layout

The AllPeeP primary web interface is built with SvelteKit and Svelte 5, using a mobile-first responsive design approach. This document explains the layout structure and how responsiveness is achieved.

## Layout Architecture

### Overall Structure

The application uses a hierarchical layout system:

```
Root Layout (+layout.svelte)
  └── RootLayout Component
      ├── Sidebar (Desktop only)
      ├── HeaderMobile (Mobile only)
      ├── Content Area
      │   ├── ContentHeader
      │   ├── Breadcrumbs
      │   ├── Infos
      │   └── Page Content
      └── FooterMobile (Mobile only)
```

### Layout Components

**Location**: `platform/svelte/src/lib/components/layout/`

- **`Root.svelte`** - Main application layout
- **`Auth.svelte`** - Authentication pages layout
- **`Infos.svelte`** - Information banners (e.g., email verification)

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

**Desktop**: Fixed sidebar on the left
**Mobile**: Hidden sidebar, accessible via drawer

```svelte
<!-- Sidebar: Hidden on mobile, visible on desktop -->
<div class="bg-surface-50 w-70 fixed hidden h-screen border-r md:flex">
  <SideBar>
    <!-- Sidebar content -->
  </SideBar>
</div>

<!-- Content area: Full width on mobile, offset on desktop -->
<div class="bg-surface-50 md:ml-70 flex h-fit min-h-screen flex-col border-r">
  <!-- Content -->
</div>
```

**Key classes:**

- `hidden` - Hidden by default (mobile)
- `md:flex` - Visible on desktop
- `w-70` - Fixed width (17.5rem / 280px)
- `md:ml-70` - Margin left on desktop to account for sidebar

#### 2. Header Navigation

**Desktop**: No header (navigation in sidebar)
**Mobile**: Sticky header at top

```svelte
<!-- Mobile header: Visible only on mobile -->
<div class="bg-background sticky top-0 z-10 flex px-4 py-2 md:hidden">
  <!-- Header content -->
</div>
```

**Key classes:**

- `md:hidden` - Hidden on desktop
- `sticky top-0` - Sticks to top when scrolling
- `z-10` - Above other content

#### 3. Footer Navigation

**Desktop**: No footer (navigation in sidebar)
**Mobile**: Fixed bottom navigation bar

```svelte
<!-- Mobile footer: Visible only on mobile -->
<div class="bottom-0 w-full flex-grow-0 md:hidden">
  <FooterMobile />
</div>
```

**Key classes:**

- `md:hidden` - Hidden on desktop
- `bottom-0` - Fixed to bottom
- `flex-grow-0` - Doesn't grow to fill space

## Layout Components

### RootLayout

**Location**: `platform/svelte/src/lib/components/layout/Root.svelte`

The main layout component that wraps all authenticated pages.

**Structure:**

```svelte
<div class="flex h-full w-full flex-col">
  <div class="flex-grow">
    <div class="flex min-h-full w-full flex-col overflow-y-auto">
      <div class="mx-auto h-1 w-full flex-grow md:max-w-[950px]">
        <!-- Sidebar (Desktop) -->
        <div class="bg-surface-50 w-70 fixed hidden h-screen border-r md:flex">
          <SideBar />
        </div>

        <!-- Content Area -->
        <div
          class="bg-surface-50 md:ml-70 flex h-fit min-h-screen flex-col border-r"
        >
          <HeaderMobile />
          <ContentHeader />
          <Breadcrumbs />
          <Infos />
          {@render children?.()}
        </div>
      </div>
    </div>
  </div>

  <!-- Footer (Mobile) -->
  <div class="bottom-0 w-full flex-grow-0 md:hidden">
    <FooterMobile />
  </div>
</div>
```

**Key Features:**

- **Max width container**: `md:max-w-[950px]` centers content on large screens
- **Flexbox layout**: Uses flex for vertical and horizontal alignment
- **Overflow handling**: `overflow-y-auto` for scrollable content
- **Responsive spacing**: Sidebar margin only on desktop

### Sidebar

**Location**: `platform/svelte/src/lib/components/navigation/SideBar.svelte`

Desktop navigation sidebar.

**Features:**

- Logo and branding
- Profile menu
- Main navigation menu
- Action button (e.g., "New Post")
- Community information

**Responsive Behavior:**

- **Desktop**: Always visible, fixed position
- **Mobile**: Hidden, accessible via drawer

### HeaderMobile

**Location**: `platform/svelte/src/lib/components/navigation/HeaderMobile.svelte`

Mobile header with essential navigation.

**Features:**

- Profile avatar (opens sidebar drawer)
- Community logo
- Messages icon

**Implementation:**

```svelte
<div class="bg-background sticky top-0 z-10 flex px-4 py-2 md:hidden">
  <div class="flex w-full items-center justify-between">
    <button onclick={() => drawerStore.open()}>
      <Avatar {profile} />
    </button>
    <img src={logoSmall} alt="logo" />
    <button onclick={() => goto('/conversations')}>
      <MessageSquareText />
    </button>
  </div>
</div>
```

### FooterMobile

**Location**: `platform/svelte/src/lib/components/navigation/FooterMobile.svelte`

Bottom navigation bar for mobile devices.

**Navigation Items:**

- Home (`/feeds/local`)
- My Feed (`/feeds/my`)
- New Post (opens modal)
- Groups (`/groups`)
- Notifications (`/notifications`)

**Implementation:**

```svelte
<div
  class="bg-surface-50 flex h-20 w-full items-center justify-evenly md:hidden"
>
  <MobileMenuItem icon={Home} action="/feeds/local" />
  <MobileMenuItem icon={Newspaper} action="/feeds/my" />
  <MobileMenuItem icon={PlusSquare} action={triggerNewPostModal} />
  <MobileMenuItem icon={Users} action="/groups" />
  <MobileMenuItem icon={Bell} action="/notifications" />
</div>
```

## Responsive Techniques

### 1. Conditional Rendering

Components render differently based on screen size:

```svelte
<!-- Desktop component -->
<div class="hidden md:block">
  <DesktopComponent />
</div>

<!-- Mobile component -->
<div class="block md:hidden">
  <MobileComponent />
</div>
```

### 2. Responsive Utilities

Tailwind CSS utilities for responsive design:

**Visibility:**

- `hidden` - Hidden on all screens
- `md:flex` - Flex on desktop
- `md:hidden` - Hidden on desktop

**Spacing:**

- `p-4 md:p-8` - Padding increases on desktop
- `text-sm md:text-lg` - Text size increases on desktop
- `gap-2 md:gap-4` - Gap increases on desktop

**Layout:**

- `flex-col md:flex-row` - Column on mobile, row on desktop
- `w-full md:w-1/2` - Full width on mobile, half on desktop
- `max-w-full md:max-w-[950px]` - Constrained width on desktop

### 3. Custom Spacing

The application defines custom spacing:

```typescript
// tailwind.config.ts
spacing: {
  '70': '17.5rem',  // Sidebar width
  '128': '32rem',
}
```

Used for consistent sidebar width: `w-70`, `md:ml-70`

### 4. Drawer for Mobile Navigation

Mobile uses Skeleton UI's Drawer component for sidebar access:

```svelte
<Drawer>
  <SideBar />
</Drawer>

<button onclick={() => drawerStore.open()}>
  <!-- Opens drawer with sidebar -->
</button>
```

## Content Area Structure

### ContentHeader

Page-level header with title and actions.

### Breadcrumbs

Navigation breadcrumbs for hierarchical pages.

### Infos

Information banners (e.g., email verification prompts).

### Page Content

Main page content, rendered via `{@render children?.()}`

## Styling System

### Tailwind CSS

**Configuration**: `platform/app/tailwind.config.ts`

**Features:**

- Custom spacing values
- Skeleton UI theme integration
- Dark mode support (`darkMode: 'selector'`)
- Form and typography plugins

### PostCSS

**Location**: `platform/app/src/routes/app.postcss`

**Custom Styles:**

- Global scrollbar styling
- Participant area styles (for video calls)
- Font face definitions
- Custom transitions

### Theme System

Uses Skeleton UI's theme system with custom AllPeeP themes:

- `AllPeepLight` - Light theme
- `AllPeepDark` - Dark theme

## Responsive Patterns in Practice

### Example: Post Feed

```svelte
<div class="mx-auto w-full p-4 md:max-w-2xl md:p-8">
  <!-- Full width on mobile, constrained on desktop -->
  <!-- Padding increases on desktop -->
</div>
```

### Example: Card Component

```svelte
<div class="flex flex-col gap-4 p-4 md:flex-row">
  <!-- Stacked on mobile, side-by-side on desktop -->
  <!-- Consistent gap and padding -->
</div>
```

### Example: Image Sizing

```svelte
<img src={logo} class="h-6 md:h-10" alt="logo" />
<!-- Smaller on mobile, larger on desktop -->
```

## Mobile-Specific Features

### Touch Interactions

- Large touch targets (minimum 44x44px)
- Swipe gestures for navigation
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
- Fixed position
- Scrollable content area

### Wider Layouts

- Max width constraint (`md:max-w-[950px]`)
- Centered content
- More horizontal space utilization

## Best Practices

### 1. Mobile-First CSS

Always write mobile styles first, then add desktop modifiers:

```svelte
<!-- ✅ Good -->
<div class="p-4 md:p-8">

<!-- ❌ Avoid -->
<div class="md:p-8 p-4">
```

### 2. Consistent Breakpoints

Always use `md:` for desktop breakpoint (768px).

### 3. Test on Real Devices

Test on actual mobile devices, not just browser dev tools.

### 4. Touch-Friendly Targets

Ensure interactive elements are at least 44x44px on mobile.

### 5. Progressive Enhancement

Start with mobile experience, enhance for desktop.

## Common Responsive Patterns

### Hide/Show Pattern

```svelte
<!-- Mobile only -->
<div class="md:hidden">Mobile Content</div>

<!-- Desktop only -->
<div class="hidden md:block">Desktop Content</div>
```

### Flexible Layout

```svelte
<!-- Stack on mobile, row on desktop -->
<div class="flex flex-col gap-4 md:flex-row">
  <div>Item 1</div>
  <div>Item 2</div>
</div>
```

### Responsive Typography

```svelte
<h1 class="text-2xl md:text-4xl">Title</h1>
<p class="text-sm md:text-base">Body text</p>
```

### Responsive Spacing

```svelte
<div class="p-4 md:p-8 lg:p-12">
  <!-- Progressive padding -->
</div>
```

## Testing Responsiveness

### Browser DevTools

Use Chrome/Firefox responsive design mode:

- Test various screen sizes
- Test portrait/landscape orientations
- Simulate touch interactions

### Real Devices

Test on:

- iOS devices (iPhone, iPad)
- Android devices
- Various screen sizes

### Breakpoint Testing

Verify behavior at:

- 320px (small mobile)
- 375px (standard mobile)
- 768px (tablet/desktop breakpoint)
- 1024px (desktop)
- 1440px (large desktop)

## Related Documentation

- [Frontend Architecture](/docs/development/architecture/frontend) - Overall frontend structure
- [Code Style](/docs/development/code-style) - Coding standards
- [Routes](/docs/development/routes) - URL structure
