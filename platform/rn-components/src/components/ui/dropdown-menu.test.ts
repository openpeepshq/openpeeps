/**
 * Placement math for the shared `DropdownMenuContent` (issue #1858 — "Edit
 * Post is not accessible when your post is on the bottom of a thread").
 *
 * Before this fix `DropdownMenuContent` only clamped the *horizontal* position
 * and placed the menu at a raw `top:` below the trigger with no viewport clamp
 * and no flip. A trigger near the bottom edge opened the menu below the
 * viewport, so the bottom items (Edit / Delete / …) were unreachable.
 *
 * `computeMenuPlacement` is the extracted, pure placement helper: it flips a
 * `side="bottom"` menu to `top` when there is less room below than above
 * (Radix-style collision handling from the trigger position), never flips an
 * explicit `side="top"` back down, and caps the menu at the viewport space on
 * its chosen side (`maxHeight`) so an overlong menu scrolls instead of leaving
 * the screen. These tests pin that contract.
 *
 * The helper is pure, so the suite only needs the module to *load*; the
 * react-native / portal / themed-view imports are stubbed (node jest env, no
 * native modules) and the render tests follow this file's own stub-host
 * convention — stub host elements that forward `style`/`className` so the
 * placed menu's `maxHeight` and flip are readable on the rendered tree.
 */
import ReactTestRenderer from 'react-test-renderer';
import {
  DropdownContext,
  DropdownMenuContent,
  computeMenuPlacement,
  type MenuTriggerLayout,
} from './dropdown-menu';

const React = require('react');

// React 19 act() requires the act environment flag, or it warns on every act().
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('react-native', () => {
  // Forward every prop (including `style` / `className`) onto the host element
  // so the render tests can read the placed menu's `maxHeight`, `top`/`bottom`,
  // `left` and `width` on the rendered tree.
  const host = (tag: string) => {
    const C = (props: Record<string, unknown>) =>
      React.createElement(tag, props, props.children);
    return C;
  };
  return {
    Dimensions: { get: () => ({ width: 375, height: 812 }) },
    Pressable: host('Pressable'),
    ScrollView: host('ScrollView'),
    StyleSheet: {
      create: (s: Record<string, unknown>) => s,
      absoluteFill: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      },
    },
    Text: host('Text'),
    View: host('View'),
  };
});
jest.mock('@rn-primitives/portal', () => ({
  Portal: (props: { children?: unknown }) =>
    React.createElement('Portal', null, props.children),
}));
jest.mock('./themed-view', () => ({
  ThemedView: (props: Record<string, unknown>) =>
    React.createElement(
      'ThemedView',
      {
        className: `bg-background ${String(props.className ?? '')}`,
        style: props.style,
      },
      props.children
    ),
}));

// iPhone 11 window (the issue's device).
const SCREEN = { screenHeight: 812, screenWidth: 375 };
const MENU_WIDTH = 200;

const at = (
  triggerLayout: MenuTriggerLayout,
  extra: Record<string, unknown> = {}
) =>
  computeMenuPlacement({
    triggerLayout,
    screenHeight: SCREEN.screenHeight,
    screenWidth: SCREEN.screenWidth,
    ...extra,
  });

test('1. trigger near the bottom flips to `top` (the #1858 repro)', () => {
  const p = at({ x: 100, y: 750, width: 40, height: 40 });
  // spaceBelow = 812 - 750 - 40 - 4 - 8 = 10; spaceAbove = 750 - 4 - 8 = 738.
  expect(p.effectiveSide).toBe('top');
  expect(p.bottom).toBe(812 - 750 + 4); // 66
  expect(p.top).toBeUndefined();
  expect(p.maxHeight).toBe(738);
});

test('2. trigger near the top stays `bottom`, clamped to the space below', () => {
  const p = at({ x: 100, y: 50, width: 40, height: 40 });
  // spaceBelow = 812 - 50 - 40 - 4 - 8 = 710; spaceAbove = 50 - 4 - 8 = 38.
  expect(p.effectiveSide).toBe('bottom');
  expect(p.top).toBe(50 + 40 + 4); // 94
  expect(p.bottom).toBeUndefined();
  expect(p.maxHeight).toBe(710);
});

test('3. explicit `side="top"` is never flipped back down (and floors at the min height)', () => {
  // Near the top edge: the "more room" heuristic would pick `bottom`
  // (spaceBelow 710 > spaceAbove 38), but an explicit drop-up must stay up.
  const p = at({ x: 100, y: 50, width: 40, height: 40 }, { side: 'top' });
  expect(p.effectiveSide).toBe('top');
  expect(p.bottom).toBe(812 - 50 + 4); // 766
  expect(p.top).toBeUndefined();
  // spaceAbove (38) is below the two-item floor, so maxHeight is the min.
  expect(p.maxHeight).toBe(120);
});

test('4. mid-screen trigger with more room below does not flip', () => {
  const p = at({ x: 100, y: 300, width: 40, height: 40 });
  // spaceBelow = 460 >= spaceAbove = 288 → stays `bottom`.
  expect(p.effectiveSide).toBe('bottom');
  expect(p.top).toBe(300 + 40 + 4); // 344
  expect(p.maxHeight).toBe(460);
});

test('5. exactly-tied space (spaceBelow === spaceAbove) stays `bottom`', () => {
  // spaceBelow = 812 - y - 40 - 4 - 8 = 760 - y; spaceAbove = y - 4 - 8 = y - 12.
  // 760 - y === y - 12 → y = 386, where both spaces are exactly 374.
  // The `>=` tie-break keeps `bottom` (the pre-fix behavior for mid-screen
  // menus); a future `>` change would flip such menus and this test would fail.
  const p = at({ x: 100, y: 386, width: 40, height: 40 });
  expect(p.effectiveSide).toBe('bottom');
  expect(p.top).toBe(386 + 40 + 4); // 430
  expect(p.bottom).toBeUndefined();
  expect(p.maxHeight).toBe(374);
});

test('6. horizontal clamping is unchanged for each align mode', () => {
  // end-aligned trigger near the right edge clamps to screenWidth - width - margin.
  const end = at({ x: 320, y: 400, width: 50, height: 40 });
  expect(end.left).toBe(SCREEN.screenWidth - MENU_WIDTH - 8); // 167

  // start-aligned trigger at the left edge clamps to the margin.
  const start = at({ x: 0, y: 300, width: 50, height: 40 }, { align: 'start' });
  expect(start.left).toBe(8);

  // center-aligned trigger in the middle is not clamped.
  const center = at(
    { x: 112.5, y: 300, width: 50, height: 40 },
    { align: 'center' }
  );
  expect(center.left).toBe(37.5);
});

test('7. sideOffset and margin are respected on the chosen side', () => {
  const base = at({ x: 100, y: 300, width: 40, height: 40 });
  const offset = at(
    { x: 100, y: 300, width: 40, height: 40 },
    { sideOffset: 16 }
  );
  // A larger sideOffset pushes the menu down and shrinks the space it may use.
  expect(offset.top).toBe(base.top! + 12);
  expect(offset.maxHeight).toBe(base.maxHeight - 12);

  // A larger margin widens the left-edge clamp (start-aligned at x=0).
  const wideMargin = at(
    { x: 0, y: 300, width: 50, height: 40 },
    {
      align: 'start',
      margin: 20,
    }
  );
  expect(wideMargin.left).toBe(20);
});

// ---------------------------------------------------------------------------
// Width assumption + component-level wiring (render tests).
// ---------------------------------------------------------------------------

type TreeNode = {
  type: string;
  props?: Record<string, unknown>;
  children?: (string | TreeNode)[];
};

const walk = (node: TreeNode): TreeNode[] => [
  node,
  ...(node.children ?? [])
    .filter((child): child is TreeNode => typeof child !== 'string')
    .flatMap((child) => walk(child)),
];

const findByType = (node: TreeNode, type: string): TreeNode => {
  const found = walk(node).find((n) => n.type === type);
  if (!found) throw new Error(`No ${type} node in rendered tree`);
  return found;
};

/** Flattens a style prop (array or object; RN style arrays hold `false` slots). */
const flattenedStyle = (style: unknown): Record<string, number | string> =>
  (Array.isArray(style) ? style : [style]).reduce(
    (acc: Record<string, number | string>, s: unknown) =>
      s && typeof s === 'object' ? { ...acc, ...s } : acc,
    {}
  );

// The base `styles.content` object always contributes these layout/visual props
// to the content view. The placement spread must add ONLY `left` / `top|bottom`
// / `maxHeight` / `width` on top of them — nothing else (this is what pins
// that the `effectiveSide` diagnostic no longer leaks into the view style).
const CONTENT_BASE_KEYS = [
  'position',
  'borderRadius',
  'borderWidth',
  'overflow',
  'paddingVertical',
  'shadowColor',
  'shadowOffset',
  'shadowOpacity',
  'shadowRadius',
  'elevation',
  'zIndex',
].sort();

/**
 * Renders an open `DropdownMenuContent` with a fixed trigger layout,
 * following this file's stub-host convention (host elements forward `style`
 * / `className` so the placement is readable on the rendered tree).
 */
const renderContent = (
  triggerLayout: MenuTriggerLayout,
  contentProps: Record<string, unknown> = {}
): TreeNode => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      React.createElement(
        DropdownContext.Provider,
        {
          value: {
            open: true,
            setOpen: () => {},
            triggerLayout,
            setTriggerLayout: () => {},
            portalName: 'test-portal',
          },
        },
        React.createElement(DropdownMenuContent, contentProps, 'Menu item')
      )
    );
  });
  expect(tree.toJSON()).not.toBeNull();
  return tree.toJSON() as unknown as TreeNode;
};

test('8. a wider call-site width (w-56) is assumed, not enforced, by the clamp', () => {
  // `DropdownMenuContent` renders at a fixed `width: MENU_WIDTH` (200) and the
  // helper clamps `left` against that same 200px width. Live call sites style
  // the content wider — `JamToolbarButton` passes `className="w-56"` (224px) —
  // but the fixed inline width wins (RN inline styles override tailwind
  // classes), so 200px is the real rendered width. Pin that assumption here so
  // the width mismatch cannot silently regress the fix for #1858.
  const trigger: MenuTriggerLayout = { x: 335, y: 400, width: 40, height: 40 };

  // The rendered width is the fixed MENU_WIDTH, never the wider call-site width.
  const root = renderContent(trigger, { className: 'w-56' });
  const content = flattenedStyle(findByType(root, 'ThemedView').props!.style);
  expect(content.width).toBe(MENU_WIDTH);

  // ...so clamping at the right edge keeps the (w-56-styled) menu on screen:
  const p = computeMenuPlacement({
    triggerLayout: trigger,
    screenHeight: SCREEN.screenHeight,
    screenWidth: SCREEN.screenWidth,
    menuWidth: MENU_WIDTH,
  });
  // left = min(335 + 40 - 200, 375 - 200 - 8) = 167.
  expect(p.left + MENU_WIDTH).toBe(SCREEN.screenWidth - 8);
  // A genuine 224px menu at that `left` would overflow the edge by 16px —
  // the fixed width is what keeps it inside.
  expect(p.left + 224).toBe(SCREEN.screenWidth + 16);
});

test('9. the component flips a bottom-edge trigger to `top` and caps it (#1858 wiring)', () => {
  // spaceBelow = 812 - 750 - 40 - 4 - 8 = 10 < spaceAbove = 750 - 4 - 8 = 738
  // → the menu flips above the trigger and is capped at the room above.
  const root = renderContent({ x: 100, y: 750, width: 40, height: 40 });
  const content = flattenedStyle(findByType(root, 'ThemedView').props!.style);
  expect(content.bottom).toBe(66);
  expect(content.top).toBeUndefined();
  expect(content.maxHeight).toBe(738);
  // The content view carries only the base content props plus the four
  // placement layout props: the `effectiveSide` diagnostic from the
  // placement helper must not leak into the style.
  expect(Object.keys(content).sort()).toEqual(
    [...CONTENT_BASE_KEYS, 'bottom', 'left', 'maxHeight', 'width'].sort()
  );
  // The scroll container inherits the same cap, so an overlong menu scrolls
  // instead of leaving the viewport unreachable, and does not stretch empty
  // space (flexGrow: 0 keeps the menu at its natural height when short).
  const scroll = findByType(root, 'ScrollView');
  const scrollStyle = flattenedStyle(scroll.props!.style);
  expect(scrollStyle.maxHeight).toBe(738);
  expect(flattenedStyle(scroll.props!.contentContainerStyle)).toEqual({
    flexGrow: 0,
  });
});

test('10. a top-edge trigger keeps `bottom`; the ScrollView is capped to the clamp', () => {
  // spaceBelow = 812 - 50 - 40 - 4 - 8 = 710 >= spaceAbove = 50 - 4 - 8 = 38
  // → stays below the trigger; the scroll container is capped at the space.
  const root = renderContent({ x: 100, y: 50, width: 40, height: 40 });
  const content = flattenedStyle(findByType(root, 'ThemedView').props!.style);
  expect(content.top).toBe(94);
  expect(content.bottom).toBeUndefined();
  expect(Object.keys(content).sort()).toEqual(
    [...CONTENT_BASE_KEYS, 'left', 'maxHeight', 'top', 'width'].sort()
  );
  const scroll = findByType(root, 'ScrollView');
  const scrollStyle = flattenedStyle(scroll.props!.style);
  expect(scrollStyle.maxHeight).toBe(710);
  expect(flattenedStyle(scroll.props!.contentContainerStyle)).toEqual({
    flexGrow: 0,
  });
});
