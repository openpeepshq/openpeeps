package com.allpeep.reactnativecomponents

import android.graphics.Color
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.ReactNativeComponentsViewManagerInterface
import com.facebook.react.viewmanagers.ReactNativeComponentsViewManagerDelegate

@ReactModule(name = ReactNativeComponentsViewManager.NAME)
class ReactNativeComponentsViewManager : SimpleViewManager<ReactNativeComponentsView>(),
  ReactNativeComponentsViewManagerInterface<ReactNativeComponentsView> {
  private val mDelegate: ViewManagerDelegate<ReactNativeComponentsView>

  init {
    mDelegate = ReactNativeComponentsViewManagerDelegate(this)
  }

  override fun getDelegate(): ViewManagerDelegate<ReactNativeComponentsView>? {
    return mDelegate
  }

  override fun getName(): String {
    return NAME
  }

  public override fun createViewInstance(context: ThemedReactContext): ReactNativeComponentsView {
    return ReactNativeComponentsView(context)
  }

  @ReactProp(name = "color")
  override fun setColor(view: ReactNativeComponentsView?, color: String?) {
    view?.setBackgroundColor(Color.parseColor(color))
  }

  companion object {
    const val NAME = "ReactNativeComponentsView"
  }
}
