Tech stack dependencies mobile


#Guidelines for this project libraries and architecture#

1. React Native Core
* Components: View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar
* Patterns
    * import gesture handler located at the app root in index.js:
		import 'react-native-gesture-handler';
- Use functional components + hooks (useState, useEffect)
- Semicolons on every statement and import
- Prefer SafeAreaView from react-native-safe-area-context at your app root or on full-screen layouts

2. Navigation (React Navigation v7)
* Packages:
    * @react-navigation/native (v7.1.x)
    * @react-navigation/native-stack (v7.3.x)
    * @react-navigation/bottom-tabs (v7.3.x)
    * react-native-gesture-handler, react-native-screens, react-native-safe-area-context
* Patterns
    * One <NavigationContainer> at the app root ( Navigation/index.js)
    * Use native-stack (createNativeStackNavigator()) instead of @react-navigation/stack
    * Nest your Tab.Navigator inside a Stack screen (e.g. MainApp)
    * Wrap login flows with navigation.replace('…') to clear history
    * Import and register gesture handler once, not per screen

3. Styling (NativeWind v4 + Tailwind CSS)
* Library: nativewind@4.1.x + tailwindcss@3.4.x
* Config:
    * tailwind.config.js uses
		presets: [ require('nativewind/preset') ]
    - Theme tokens sourced from src/brand/tokens.js
Patterns
* No <TailwindProvider> wrapper at runtime (v4 moved to compile-time)
* No styled() helper — apply classes via the className prop on core RN views/text
* For dynamic or complex colors, compute inline styles (e.g. custom opacity) and combine with className
* Restart Metro with --reset-cache after any change to Babel or Tailwind config

4. UI Library (Tamagui v1.89.x)
* Packages:
    * tamagui, @tamagui/babel-plugin, @tamagui/web
    * (Peered with react-native-svg, react-native-reanimated)
* Patterns
    * Enable codegen only in production (via disableExtraction in Babel plugin)
    * Keep @tamagui/babel-plugin before any other plugins except Reanimated’s
    * Install @tamagui/web so the static extractor can run (even in RN-only apps)
    * Consume Tamagui components (e.g. <YStack>, <Text>) only if you need advanced layout/perf; otherwise stick to core RN + NativeWind

5. Animations (Reanimated v3.18.x)
* Package: react-native-reanimated + Babel plugin
* Patterns
    * Plugin must be last in babel.config.js:plugins: [  /* other plugins */,  'react-native-reanimated/plugin']
* Wrap entry file (for worklets) with Reanimated’s setup if you use hooks like useSharedValue
* Always rebuild native code (pod install + Xcode build) after installing Reanimated

6. State & Data
* Requests: axios + jwt-decode
* State: zustand@4.5.x
* Patterns
    * Centralize API calls in a /services or /api folder
    * Decode and store JWTs in a secure store or React context
    * Expose Zustand stores via custom hooks, e.g. useAuthStore()
    * Keep UI components pure: pass store state and actions via props or hooks
7. Assets & SVGs
* Packages: react-native-svg, react-native-svg-transformer
* Patterns
    * Configure metro.config.js to handle .svg imports as components
    * Import icons or illustrations directly: import Logo from './assets/logo.svg';
* No rebuild of pods needed for JS-only asset tools

##Bringing It All Together##
1. Entry:
index.js → App.tsx  
  ↳ GestureHandlerImport  
  ↳ SafeAreaProvider  
  ↳ NavigationContainer  
    ↳ RootStack  
      ↳ Splash → Login → MainApp(TabNavigator)
2. Styling: Spend 90% of your time in JSX with className="…"—no inline styles unless dynamic.

3. Native Modules: Only run pod install and Xcode builds when you add/remove native-code libraries (Reanimated, SafeAreaContext, SVG, navigation).

4. Dev Loop:
    JS changes → Metro + Fast Refresh (⌘+R)
    Native changes → clean pods + Xcode build (or npx react-native run-ios)

5. Releases:
    Use npx react-native run-ios --configuration Release 

With these guidelines, every new screen or feature you build will follow the same patterns and use the same core components—keeping your codebase consistent, maintainable, and performant.




