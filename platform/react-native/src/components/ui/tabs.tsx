import * as React from 'react';
import * as TabsPrimitive from '@rn-primitives/tabs';
import { cn } from '../../lib/utils';
import { ThemedText } from './themed-text';

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  TabsPrimitive.ListRef,
  TabsPrimitive.ListProps & { className?: string }
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn('flex flex-row space-x-2 bg-muted p-1 rounded-lg', className)}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  TabsPrimitive.TriggerRef,
  TabsPrimitive.TriggerProps & { className?: string }
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'px-4 py-2 text-muted-foreground rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground',
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  TabsPrimitive.ContentRef,
  TabsPrimitive.ContentProps & { className?: string }
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn('p-4', className)}
    {...props}
  />
)) as React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content> & { className?: string }
>;
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };

export const TabbedView = ({ tabs }: { tabs: TabData[] }) => {
  const [activeTab, setActiveTab] = React.useState(tabs[0].value);
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mx-auto flex-col gap-1.5 mt-5">
      <TabsList className="flex-row w-full bg-transparent border-muted rounded-none border-b p-0 px-3">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}
            onPress={() => {
              setActiveTab(tab.value);
            }}
            className={`${activeTab === tab.value
              ? 'border-b-2 border-foreground'
              : ''
              }`}>
            <ThemedText>{tab.label}</ThemedText>
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value} className="px-0 py-4">{tab.component}</TabsContent>
      ))}
    </Tabs>
  );
};

export type TabData = {
  label: string;
  value: string;
  component: React.ReactNode;
}
