# Pinecrest Golf: iPhone and Mac testing project

This unsigned Xcode project opens the current public Pinecrest Golf game using WKWebView. Internet access is required. The web game supplies the latest clubs, onboarding, character customization and course records. Persistent website cookies retain login sessions. Sign in to the same email account to access the website career. Guest careers are specific to this app's cookie store and do not automatically import from Safari. No Apple account credentials belong in this project.

The older bundled Game directory and native career adapter are retained in the repository for reference but excluded from this app's resources. The sync-game script is only for that legacy offline version. This build has no offline mode or native haptics.

## Run on your Mac

1. Unzip the project and open PinecrestGolf.xcodeproj in Xcode.
2. Select the PinecrestGolf app target. Under Signing & Capabilities, select your paid developer team and enable automatic signing.
3. The bundle identifier is com.dylanclark.pinecrest, matching your screenshot. Verify it belongs to your team. Use the same identifier in App Store Connect.
4. Connect your iPhone, select it as the run destination, and enable Developer Mode if requested. Press Run.
5. Test guest play, registration, email sign in, app relaunch, saved tokens and upgrades, all course difficulties, the tutorial and character editing. Test loss of internet, Retry, interruptions and long rounds. Check performance and layout on the smallest supported iPhone.

Swift has not been compiled in this Linux workspace. Fix compiler or device issues reported by Xcode before creating an archive. This is a testing handoff, not a signed IPA or submitted App Store app.

## Before App Review

* Test account deletion in the app. It requires password confirmation and removes account progress and course records.
* Review the published privacy policy at https://pinecrest-golf.dylan-clark-6614.chatgpt.site/privacy.html and verify the operator contact and hosting practices when completing App Store privacy disclosures.
* Provide public support and privacy URLs, screenshots from the running iPhone build, and review contact details. Supply a reviewer test account if review needs sign-in functionality.
* Complete age rating, content rights, encryption, pricing and availability answers for the final build. The included privacy manifest declares known game data for app functionality, without tracking. Check it against the final product and hosting setup.
* Apple evaluates minimum functionality and web content under its review guidelines. This package is a web game container, and acceptance has not been established.

## Upload after device testing

Create the app in App Store Connect using the final bundle identifier. In Xcode select a generic iOS device destination, then Product > Archive. Choose Distribute App > App Store Connect. Test the processed build with TestFlight. Submit the tested build to App Review only after addressing the items above.

References:
https://developer.apple.com/app-store/submitting/
https://developer.apple.com/support/offering-account-deletion-in-your-app/
https://developer.apple.com/app-store/review/guidelines/


## Run on Mac

This project now enables Mac Catalyst, retaining the iPhone app and adding iPad support required by Catalyst. Mac has a resizable window with a 900 by 700 minimum, persistent account sessions and outgoing network access. The existing web game supports mouse aim and keyboard controls. Internet is required. No native compilation or Mac runtime testing has been performed here.

Open the project, select your developer team, choose My Mac (Mac Catalyst) as the destination and press Run. Do not select a Designed for iPad destination. If the destination is absent, confirm Mac Catalyst is checked in the target's Supported Destinations. The project uses the same bundle identifier for Mac Catalyst and iOS. Check that your App Store Connect record and signing configuration match.

Test window resizing, Space to charge and strike, arrow keys to aim, club selection, login and relaunch. Test internet loss and Retry. Verify gameplay performance before distributing.

## Make a downloadable Mac app

1. Select My Mac (Mac Catalyst), then Product > Archive.
2. In Organizer, choose Distribute App. Use the Developer ID / Direct Distribution path for downloading outside the Mac App Store. Wording varies with Xcode version. Use your team's Developer ID Application signing certificate and submit for notarization.
3. After notarization succeeds, export the notarized .app. Test it on a Mac using normal Gatekeeper settings.
4. Run `bash package-mac.sh "/path/to/PinecrestGolf.app" "/path/to/PinecrestGolf-Mac.zip"`. The script requires a valid signature and notarization ticket before packaging.
5. Upload the resulting ZIP to your download host. Players unzip it, drag the app into Applications, and open Pinecrest Golf. No public binary has been built or hosted yet.

For Mac App Store distribution, use App Store Connect instead of Developer ID, and finish the account deletion, privacy and review requirements above.

Apple distribution references:
https://developer.apple.com/developer-id/
https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution


## Revision 4 checks and phone layout

The live game now uses a compact phone HUD. Map and extra details are optional, and shot controls disappear during ball flight. Desktop keeps the existing layout. The native app loads these changes from the same site.

This revision includes all Mac app icon sizes, removes legacy missing Game folder references, removes the iPhone-only arm64 requirement from shared metadata, and scopes hardened runtime to the Mac SDK. Mac Catalyst uses the iOS supported platform configuration with SUPPORTS_MACCATALYST enabled. No iOS/macOS SDK is available in the preparation environment, so these checks do not replace compiling in Xcode.

Open this revised project in a new folder. Select your team, then My Mac (Mac Catalyst). If compilation fails, copy the first red error from Xcode's Issue Navigator (Command-5), including the file and line. Do not send passwords or signing keys.


## Revision 5: UIKit import on Mac

GolfView.swift now selects AppKit and NSViewRepresentable when compiling a native macOS target. iPhone, iPad and Mac Catalyst continue using UIKit and UIViewControllerRepresentable. The supplied project still uses Mac Catalyst. The source also supports a separate native macOS SwiftUI target when added to one. For a separate native Mac target, enable App Sandbox > Outgoing Connections (Client) and use GolfView() in its WindowGroup. Neither platform has been compiled in this Linux environment.


## Archive fix

Version 5 sets LSApplicationCategoryType to public.app-category.games, required by Mac App Store archive validation. The Mac Catalyst bundle ID is no longer automatically prefixed with maccatalyst. Confirm the Mac destination's bundle ID in Xcode and use the matching App Store Connect record. This is source code and has not been compiled or signed in this environment.
