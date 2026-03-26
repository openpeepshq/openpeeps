#import <React/RCTViewManager.h>
#import <React/RCTUIManager.h>
#import "RCTBridge.h"

@interface ReactNativeComponentsViewManager : RCTViewManager
@end

@implementation ReactNativeComponentsViewManager

RCT_EXPORT_MODULE(ReactNativeComponentsView)

- (UIView *)view
{
  return [[UIView alloc] init];
}

RCT_EXPORT_VIEW_PROPERTY(color, NSString)

@end
