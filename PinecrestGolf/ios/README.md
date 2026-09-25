# Pinecrest Golf, app revision 6

The default app now bundles the current eight courses and game engine. A SwiftUI clubhouse provides native course selection, equipment upgrades with numeric comparisons, personal statistics and settings. The WebKit renderer loads app resources using the private pinecrest scheme. The offline game makes no network requests.

## Open and test

1. Pull the latest repository and open ios/PinecrestGolf.xcodeproj. Use the existing project, not a new wrapper project.
2. Select your signing team. Keep the bundle identifier matching your App Store Connect record.
3. Choose an iPhone simulator or connected iPhone and Run. For Mac use My Mac (Mac Catalyst).
4. The native clubhouse opens first. Start a round or practice. Play in airplane mode, including a cold launch while offline.
5. Finish holes and verify token rewards, equipment purchases and statistics. Quit between shots and verify Resume restores the ball position and strokes. During a shot, recovery uses the last saved position. Practice does not change records.
6. Pair a supported extended game controller through device settings. Left stick or D pad aims, A holds power then strikes, shoulders change clubs, X toggles slope dots, Y changes camera, Menu opens the clubhouse.
7. Check impact and hole completion haptics on a physical supported iPhone. Haptics do not run on Mac or simulator hardware.
8. Open Settings > Online career to use an existing email account. This uses the original website and requires internet. Existing cookies are preserved. Device careers and online careers are separate; there is no transfer or synchronization between them.

Build number is 6. Increase it if App Store Connect already contains that build number. Swift and Apple SDKs are not available in the preparation environment. The project has not been compiled, signed or tested on Apple hardware here. JavaScript checks and local save tests do not replace these steps.

## Saves and updates

The offline career is stored atomically as career.json in the app's Application Support/PinecrestGolf directory. Previous schema versions are migrated on read. Unreadable saves are preserved and reported, not silently replaced. Removing the app can remove its data. Device backup settings control backup behavior.

Run `node ios/sync-game.mjs` from the repository root after changing web gameplay. Commit the generated Game directory. Those assets ship with the binary; changing the website alone does not update installed offline apps. Online career continues to load the current website.

Run `node tests/native-career.mjs` and `node tests/native-bridge.mjs` for the offline save and integration checks. Native menus, controllers, haptics, custom scheme loading, accessibility and phone layout require Xcode/device verification.

## App Review

After all device checks pass, archive a new iOS build and distribute through App Store Connect. Repeat for Mac Catalyst if submitting a Mac build. Use actual screenshots from the new native app. Read AppStore/Revision6ReviewNotes.txt, verify the steps on the submitted build, and use those notes to explain the revision. No App Store acceptance is guaranteed. Recheck privacy disclosures for optional online accounts and locally stored device careers.

The existing package-mac.sh remains available for packaging a signed, notarized Mac application for direct distribution. No signed app or archive is produced in this environment.
